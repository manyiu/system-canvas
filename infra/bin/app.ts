#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { GithubOidcStack } from "../lib/github-oidc-stack";
import { SiteCertificateStack } from "../lib/site-certificate-stack";
import { SystemCanvasSiteStack } from "../lib/system-canvas-site-stack";

const app = new cdk.App();

const account =
  process.env.CDK_DEFAULT_ACCOUNT ??
  (app.node.tryGetContext("account") as string | undefined) ??
  process.env.AWS_ACCOUNT_ID;
const hostedZoneId =
  (app.node.tryGetContext("hostedZoneId") as string | undefined) ??
  process.env.HOSTED_ZONE_ID ??
  undefined;
const domainName =
  (app.node.tryGetContext("domainName") as string | undefined) ?? "system-canvas.vazue.com";
const hostedZoneName =
  (app.node.tryGetContext("hostedZoneName") as string | undefined) ?? "vazue.com";
const githubOrg = (app.node.tryGetContext("githubOrg") as string | undefined) ?? "manyiu";
const githubRepo = (app.node.tryGetContext("githubRepo") as string | undefined) ?? "system-canvas";
const githubBranch = (app.node.tryGetContext("githubBranch") as string | undefined) ?? "main";
const githubOwnerId = (app.node.tryGetContext("githubOwnerId") as string | undefined) ?? "11912398";
const githubRepoId = (app.node.tryGetContext("githubRepoId") as string | undefined) ?? "1359331343";

const siteRegion = (app.node.tryGetContext("siteRegion") as string | undefined) ?? "ap-southeast-1";

if (!account) {
  throw new Error(
    "Set CDK_DEFAULT_ACCOUNT / AWS_ACCOUNT_ID or pass -c account=... before synthesizing.",
  );
}

if (!hostedZoneId) {
  throw new Error(
    "Set HOSTED_ZONE_ID or pass -c hostedZoneId=Z... (hermetic CI; do not rely on Route53 lookup).",
  );
}

const envSite = { account, region: siteRegion };
const envUsEast1 = { account, region: "us-east-1" };
const siteBucketName = `system-canvas-site-${account}`;

new GithubOidcStack(app, "SystemCanvasGithubOidc", {
  env: envSite,
  description: "GitHub OIDC provider and deploy role for System Canvas",
  githubOrg,
  githubRepo,
  githubBranch,
  githubOwnerId,
  githubRepoId,
  siteBucketName,
});

const certificateStack = new SiteCertificateStack(app, "SystemCanvasCertificate", {
  env: envUsEast1,
  crossRegionReferences: true,
  description: "ACM certificate for system-canvas.vazue.com (us-east-1)",
  domainName,
  hostedZoneId,
  hostedZoneName,
});

new SystemCanvasSiteStack(app, "SystemCanvasSite", {
  env: envSite,
  crossRegionReferences: true,
  description: "System Canvas S3 + CloudFront + Route53",
  domainName,
  hostedZoneId,
  hostedZoneName,
  siteBucketName,
  certificate: certificateStack.certificate,
});

app.synth();
