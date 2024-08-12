#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { MountpointS3SftpStack } from "../lib/mountpoint-s3-sftp-stack";

const app = new cdk.App();
new MountpointS3SftpStack(app, "MountpointS3SftpStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
