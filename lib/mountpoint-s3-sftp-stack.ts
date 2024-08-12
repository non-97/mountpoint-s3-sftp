import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { Vpc } from "./construct/vpc";
import { Ec2Instance } from "./construct/ec2-instance";

export class MountpointS3SftpStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new cdk.aws_s3.Bucket(this, "Bucket");
    const vpc = new Vpc(this, "Vpc");
    new Ec2Instance(this, "Ec2Instance", {
      vpc: vpc.vpc,
      bucket,
    });
  }
}
