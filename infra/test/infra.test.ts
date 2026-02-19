import * as cdk from 'aws-cdk-lib/core';
import { Template } from 'aws-cdk-lib/assertions';
import { NetworkingStack } from '../lib/networking-stack';
import { DatabaseStack } from '../lib/database-stack';
import { ComputeStack } from '../lib/compute-stack';

describe('CDK Stacks', () => {
  const app = new cdk.App();

  const networking = new NetworkingStack(app, 'TestNetworking');
  const database = new DatabaseStack(app, 'TestDatabase', {
    vpc: networking.vpc,
    securityGroup: networking.rdsSecurityGroup,
  });
  const compute = new ComputeStack(app, 'TestCompute', {
    vpc: networking.vpc,
    albSecurityGroup: networking.albSecurityGroup,
    ecsSecurityGroup: networking.ecsSecurityGroup,
  });

  test('NetworkingStack creates a VPC', () => {
    const template = Template.fromStack(networking);
    template.resourceCountIs('AWS::EC2::VPC', 1);
  });

  test('NetworkingStack creates three security groups', () => {
    const template = Template.fromStack(networking);
    template.resourceCountIs('AWS::EC2::SecurityGroup', 3);
  });

  test('DatabaseStack creates two RDS instances', () => {
    const template = Template.fromStack(database);
    template.resourceCountIs('AWS::RDS::DBInstance', 2);
  });

  test('ComputeStack creates an ECS cluster', () => {
    const template = Template.fromStack(compute);
    template.hasResourceProperties('AWS::ECS::Cluster', {
      ClusterName: 'eternal-journal',
    });
  });

  test('ComputeStack creates an ALB', () => {
    const template = Template.fromStack(compute);
    template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);
  });

  test('ComputeStack creates two ECS services', () => {
    const template = Template.fromStack(compute);
    template.resourceCountIs('AWS::ECS::Service', 2);
  });

  test('ComputeStack creates listeners on ports 80 and 8080', () => {
    const template = Template.fromStack(compute);
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
      Port: 80,
    });
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
      Port: 8080,
    });
  });

  test('ComputeStack creates an ECR repository', () => {
    const template = Template.fromStack(compute);
    template.hasResourceProperties('AWS::ECR::Repository', {
      RepositoryName: 'eternal-journal-api',
    });
  });
});
