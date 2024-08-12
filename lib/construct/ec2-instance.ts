import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as fs from "fs";
import * as path from "path";

export interface Ec2InstanceProps {
  vpc: cdk.aws_ec2.IVpc;
  bucket: cdk.aws_s3.IBucket;
}

export class Ec2Instance extends Construct {
  readonly instance: cdk.aws_ec2.Instance;

  constructor(scope: Construct, id: string, props: Ec2InstanceProps) {
    super(scope, id);

    // User data
    const userData = cdk.aws_ec2.UserData.forLinux();
    userData.addCommands(
      fs
        .readFileSync(
          path.join(__dirname, "../ec2/user-data/install_mountpoint_s3.sh"),
          "utf8"
        )
        .replace(/_bucket_name_/g, props.bucket.bucketName)
    );

    // EC2 Instance
    this.instance = new cdk.aws_ec2.Instance(this, "Default", {
      machineImage: cdk.aws_ec2.MachineImage.latestAmazonLinux2023({
        cachedInContext: true,
        cpuType: cdk.aws_ec2.AmazonLinuxCpuType.ARM_64,
      }),
      instanceType: new cdk.aws_ec2.InstanceType("t4g.micro"),
      vpc: props.vpc,
      propagateTagsToVolumeOnCreation: true,
      ssmSessionPermissions: true,
      userData,
      resourceSignalTimeout: cdk.Duration.minutes(10),
    });

    this.instance.userData.addSignalOnExitCommand(this.instance);

    this.instance.role.addManagedPolicy(
      new cdk.aws_iam.ManagedPolicy(this, "S3Policy", {
        statements: [
          new cdk.aws_iam.PolicyStatement({
            effect: cdk.aws_iam.Effect.ALLOW,
            resources: [`${props.bucket.bucketArn}/*`],
            actions: [
              "s3:GetObject",
              "s3:PutObject",
              "s3:AbortMultipartUpload",
              "s3:DeleteObject",
            ],
          }),
          new cdk.aws_iam.PolicyStatement({
            effect: cdk.aws_iam.Effect.ALLOW,
            resources: [props.bucket.bucketArn],
            actions: ["s3:ListBucket"],
          }),
        ],
      })
    );
  }
}
