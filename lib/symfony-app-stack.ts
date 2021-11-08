import { DnsValidatedCertificate } from "@aws-cdk/aws-certificatemanager";
import {
  BastionHostLinux,
  InstanceClass,
  InstanceSize,
  InstanceType,
  SecurityGroup,
  SubnetType,
  Vpc,
} from "@aws-cdk/aws-ec2";
import {
  AwsLogDriver,
  Cluster,
  ContainerDefinition,
  ContainerImage,
  FargateTaskDefinition,
  PropagatedTagSource,
  Secret,
} from "@aws-cdk/aws-ecs";
import { ApplicationLoadBalancedFargateService, ScheduledFargateTask } from "@aws-cdk/aws-ecs-patterns";
import { ManagedPolicy } from "@aws-cdk/aws-iam";
import { LogGroup, RetentionDays } from "@aws-cdk/aws-logs";
import {
  Credentials,
  DatabaseInstance,
  DatabaseInstanceEngine,
  DatabaseInstanceFromSnapshot,
  DatabaseInstanceProps,
  MariaDbEngineVersion,
  SnapshotCredentials,
  StorageType,
} from "@aws-cdk/aws-rds";
import { HostedZone } from "@aws-cdk/aws-route53";
import * as cdk from "@aws-cdk/core";
import { Duration, RemovalPolicy } from "@aws-cdk/core";

import path = require("path");
import { readFileSync } from "fs";
import { Schedule } from "@aws-cdk/aws-applicationautoscaling";

interface SymfonyAppProps extends cdk.StackProps {
  readonly dev: boolean;
}

export class SymfonyAppStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: SymfonyAppProps) {
    super(scope, id, props);

    // Default VPC
    const vpc = Vpc.fromLookup(this, "Vpc", {
      isDefault: true,
    });

    // Database
    const db = new DatabaseInstance(this, "Database", {
      removalPolicy: props.dev ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.SNAPSHOT,
      multiAz: false,
      engine: DatabaseInstanceEngine.mariaDb({
        version: MariaDbEngineVersion.VER_10_5,
      }),
      // optional, defaults to m5.large
      instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
      allocatedStorage: 5,
      storageType: StorageType.STANDARD,
      deleteAutomatedBackups: props.dev,
      vpc,

      publiclyAccessible: false,
      vpcSubnets: {
        subnetType: SubnetType.PUBLIC,
      },
      databaseName: "db",
      credentials: Credentials.fromGeneratedSecret("db_user"),
    });

    if (!db.secret) {
      throw new Error("No Secret on RDS database");
    }

    const cluster = new Cluster(this, "Cluster", { vpc });

    const taskDefinition = new FargateTaskDefinition(this, "TaskDefinition", {
      cpu: 512,
      memoryLimitMiB: 1024,
    });

    const logging = new AwsLogDriver({
      streamPrefix: "symfony-app",
      logGroup: new LogGroup(this, "LogGroup", {
        removalPolicy: RemovalPolicy.DESTROY,
        retention: RetentionDays.ONE_MONTH,
      }),
    });

    /**
     * This one serves on internet
     */
    const nginxContainer = new ContainerDefinition(this, "nginx", {
      image: ContainerImage.fromAsset(path.resolve(__dirname, "..", "app"), {
        file: "docker/nginx/Dockerfile",
      }),
      taskDefinition,
      logging,
      environment: {
        PHP_HOST: "localhost",
      },
    });

    nginxContainer.addPortMappings({
      containerPort: 80,
    });

    const image = ContainerImage.fromAsset(path.resolve(__dirname, "..", "app"), {
      file: "docker/php-fpm/Dockerfile",
    });

    const phpContainer = new ContainerDefinition(this, "php", {
      image,
      taskDefinition,
      logging,
      environment: {
        // set the correct Symfony env
        APP_ENV: "prod",
        // set the correct DB driver
        DB_DRIVER: "pdo_mysql",
      },
      secrets: {
        DB_USER: Secret.fromSecretsManager(db.secret, "username"),
        DB_PASS: Secret.fromSecretsManager(db.secret, "password"),
        DB_HOST: Secret.fromSecretsManager(db.secret, "host"),
        DB_NAME: Secret.fromSecretsManager(db.secret, "dbname"),
        DB_PORT: Secret.fromSecretsManager(db.secret, "port"),
      },
    });

    // get the hostedZone
    const hostedZone = HostedZone.fromLookup(this, "Zone", {
      domainName: "mydomain.com",
    });

    // full domain Name
    const domainName = "app.mydomain.com";

    // create the https certificate
    const certificate = new DnsValidatedCertificate(this, "SiteCertificate", {
      domainName,
      hostedZone,
      region: cdk.Aws.REGION,
    });

    // then create the ALB and Fargate Service HTTPS
    const application = new ApplicationLoadBalancedFargateService(this, "Service", {
      cluster,
      certificate,
      domainName,
      domainZone: hostedZone,
      taskDefinition,
      // how many task do you want to run ?
      desiredCount: 1,
      propagateTags: PropagatedTagSource.SERVICE,
      redirectHTTP: true,
      // following is needed as we are on a public subnet.
      // https://stackoverflow.com/questions/61265108/aws-ecs-fargate-resourceinitializationerror-unable-to-pull-secrets-or-registry
      assignPublicIp: true,
    });
  }
}
