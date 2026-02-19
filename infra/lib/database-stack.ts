import * as cdk from 'aws-cdk-lib/core';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

interface DatabaseStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  securityGroup: ec2.SecurityGroup;
}

export class DatabaseStack extends cdk.Stack {
  public readonly stagingInstance: rds.DatabaseInstance;
  public readonly productionInstance: rds.DatabaseInstance;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const commonProps: Partial<rds.DatabaseInstanceProps> = {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroups: [props.securityGroup],
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      allocatedStorage: 20,
      maxAllocatedStorage: 50,
      backupRetention: cdk.Duration.days(7),
      deletionProtection: true,
      publiclyAccessible: false,
    };

    this.stagingInstance = new rds.DatabaseInstance(this, 'StagingDb', {
      ...commonProps,
      databaseName: 'eternal_journal_stg',
      credentials: rds.Credentials.fromGeneratedSecret('postgres', {
        secretName: 'eternal-journal/stg/db-credentials',
      }),
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
    } as rds.DatabaseInstanceProps);

    this.productionInstance = new rds.DatabaseInstance(this, 'ProductionDb', {
      ...commonProps,
      databaseName: 'eternal_journal',
      credentials: rds.Credentials.fromGeneratedSecret('postgres', {
        secretName: 'eternal-journal/prod/db-credentials',
      }),
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    } as rds.DatabaseInstanceProps);
  }
}
