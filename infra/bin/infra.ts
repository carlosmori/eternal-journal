#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { NetworkingStack } from '../lib/networking-stack';
import { DatabaseStack } from '../lib/database-stack';
import { ComputeStack } from '../lib/compute-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

const networking = new NetworkingStack(app, 'EternalJournal-Networking', { env });

const database = new DatabaseStack(app, 'EternalJournal-Database', {
  env,
  vpc: networking.vpc,
  securityGroup: networking.rdsSecurityGroup,
});

new ComputeStack(app, 'EternalJournal-Compute', {
  env,
  vpc: networking.vpc,
  albSecurityGroup: networking.albSecurityGroup,
  ecsSecurityGroup: networking.ecsSecurityGroup,
});

database.addDependency(networking);
