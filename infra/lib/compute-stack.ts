import * as cdk from 'aws-cdk-lib/core';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

interface ComputeStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  albSecurityGroup: ec2.SecurityGroup;
  ecsSecurityGroup: ec2.SecurityGroup;
}

interface ApiEnvironment {
  env: string;
  listenerPort: number;
  desiredCount: number;
  cpu: number;
  memoryMiB: number;
  imageTag: string;
  minCapacity?: number;
  maxCapacity?: number;
  targetCpuPercent?: number;
}

export class ComputeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);

    const repository = new ecr.Repository(this, 'ApiRepository', {
      repositoryName: 'eternal-journal-api',
      lifecycleRules: [{ maxImageCount: 20, description: 'Keep last 20 images' }],
    });

    const cluster = new ecs.Cluster(this, 'EcsCluster', {
      vpc: props.vpc,
      clusterName: 'eternal-journal',
    });

    const alb = new elbv2.ApplicationLoadBalancer(this, 'Alb', {
      vpc: props.vpc,
      internetFacing: true,
      securityGroup: props.albSecurityGroup,
    });

    const environments: ApiEnvironment[] = [
      {
        env: 'prod',
        listenerPort: 80,
        desiredCount: 2,
        cpu: 512,
        memoryMiB: 1024,
        imageTag: 'latest',
        minCapacity: 2,
        maxCapacity: 4,
        targetCpuPercent: 60,
      },
      {
        env: 'stg',
        listenerPort: 8080,
        desiredCount: 1,
        cpu: 512,
        memoryMiB: 1024,
        imageTag: 'stg',
        minCapacity: 1,
        maxCapacity: 3,
        targetCpuPercent: 60,
      },
    ];

    for (const envConfig of environments) {
      this.createApiService(cluster, alb, repository, props.ecsSecurityGroup, envConfig);
    }

    new cdk.CfnOutput(this, 'AlbDns', { value: alb.loadBalancerDnsName });
    new cdk.CfnOutput(this, 'EcrUri', { value: repository.repositoryUri });
  }

  private createApiService(
    cluster: ecs.Cluster,
    alb: elbv2.ApplicationLoadBalancer,
    repository: ecr.Repository,
    securityGroup: ec2.SecurityGroup,
    config: ApiEnvironment,
  ) {
    const suffix = config.env;

    const taskDef = new ecs.FargateTaskDefinition(this, `ApiTaskDef-${suffix}`, {
      family: `eternal-journal-api-${suffix}`,
      cpu: config.cpu,
      memoryLimitMiB: config.memoryMiB,
    });

    const logGroup = new logs.LogGroup(this, `ApiLogs-${suffix}`, {
      logGroupName: `/ecs/eternal-journal-api-${suffix}`,
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    taskDef.addContainer('api', {
      image: ecs.ContainerImage.fromEcrRepository(repository, config.imageTag),
      logging: ecs.LogDrivers.awsLogs({ logGroup, streamPrefix: 'api' }),
      portMappings: [{ containerPort: 3001 }],
      environment: {
        NODE_ENV: config.env === 'prod' ? 'production' : 'staging',
        PORT: '3001',
      },
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost:3001/health || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
      },
    });

    const service = new ecs.FargateService(this, `ApiService-${suffix}`, {
      cluster,
      taskDefinition: taskDef,
      desiredCount: config.desiredCount,
      assignPublicIp: true,
      securityGroups: [securityGroup],
      serviceName: `api-service${suffix === 'prod' ? '' : `-${suffix}`}`,
    });

    if (config.minCapacity && config.maxCapacity) {
      const scaling = service.autoScaleTaskCount({
        minCapacity: config.minCapacity,
        maxCapacity: config.maxCapacity,
      });

      scaling.scaleOnCpuUtilization(`CpuScaling-${suffix}`, {
        targetUtilizationPercent: config.targetCpuPercent ?? 70,
        scaleInCooldown: cdk.Duration.seconds(60),
        scaleOutCooldown: cdk.Duration.seconds(60),
      });
    }

    const targetGroup = new elbv2.ApplicationTargetGroup(this, `ApiTg-${suffix}`, {
      vpc: cluster.vpc,
      port: 3001,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [service],
      healthCheck: {
        path: '/health',
        interval: cdk.Duration.seconds(30),
        healthyThresholdCount: 2,
      },
      targetGroupName: `ej-api-${suffix}`,
    });

    alb.addListener(`Listener-${suffix}`, {
      port: config.listenerPort,
      defaultTargetGroups: [targetGroup],
    });
  }
}
