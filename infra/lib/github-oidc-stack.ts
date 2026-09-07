import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import type { Construct } from "constructs";

export interface GithubOidcStackProps extends cdk.StackProps {
  githubOrg: string;
  githubRepo: string;
  githubBranch: string;
  /** GitHub numeric owner id (for ID-qualified OIDC subject claims). */
  githubOwnerId: string;
  /** GitHub numeric repository id (for ID-qualified OIDC subject claims). */
  githubRepoId: string;
  /** Deterministic site bucket name used by the site stack and S3 sync. */
  siteBucketName: string;
  /**
   * Existing IAM OIDC provider ARN for GitHub Actions.
   * Defaults to the account-level token.actions.githubusercontent.com provider.
   */
  githubOidcProviderArn?: string;
}

/**
 * GitHub Actions OIDC deploy role.
 * Reuses the account's existing GitHub OIDC provider (IAM allows only one per URL).
 * Trust is pinned to a single repository branch (trunk-based main).
 */
export class GithubOidcStack extends cdk.Stack {
  readonly deployRole: iam.Role;

  constructor(scope: Construct, id: string, props: GithubOidcStackProps) {
    super(scope, id, props);

    const providerArn =
      props.githubOidcProviderArn ??
      `arn:aws:iam::${this.account}:oidc-provider/token.actions.githubusercontent.com`;

    // GitHub may emit either classic `repo:org/name:…` or ID-qualified
    // `repo:org@id/name@id:…` subject claims (see existing PlaylangWebDeploy trust).
    const subPatterns = [
      `repo:${props.githubOrg}/${props.githubRepo}:*`,
      `repo:${props.githubOrg}@${props.githubOwnerId}/${props.githubRepo}@${props.githubRepoId}:*`,
    ];

    this.deployRole = new iam.Role(this, "GithubActionsDeployRole", {
      roleName: "system-canvas-github-deploy",
      description: "Deploy System Canvas from GitHub Actions (OIDC, manyiu/system-canvas)",
      assumedBy: new iam.FederatedPrincipal(
        providerArn,
        {
          StringEquals: {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          },
          StringLike: {
            "token.actions.githubusercontent.com:sub": subPatterns,
          },
        },
        "sts:AssumeRoleWithWebIdentity",
      ),
      maxSessionDuration: cdk.Duration.hours(1),
    });

    // Assume CDK bootstrap roles in this account (all regions used by the app).
    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "AssumeCdkBootstrapRoles",
        actions: ["sts:AssumeRole"],
        resources: [`arn:aws:iam::${this.account}:role/cdk-*`],
      }),
    );

    // CloudFormation visibility for deploy tooling.
    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "CloudFormationRead",
        actions: [
          "cloudformation:DescribeStacks",
          "cloudformation:DescribeStackEvents",
          "cloudformation:DescribeStackResources",
          "cloudformation:GetTemplate",
          "cloudformation:ListStacks",
        ],
        resources: ["*"],
      }),
    );

    const bucketArn = `arn:aws:s3:::${props.siteBucketName}`;
    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "SiteBucketSync",
        actions: [
          "s3:ListBucket",
          "s3:GetBucketLocation",
          "s3:GetBucketVersioning",
          "s3:ListBucketVersions",
        ],
        resources: [bucketArn],
      }),
    );
    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "SiteObjectWrite",
        actions: [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:GetObjectVersion",
          "s3:DeleteObjectVersion",
        ],
        resources: [`${bucketArn}/*`],
      }),
    );

    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "CloudFrontInvalidate",
        actions: [
          "cloudfront:CreateInvalidation",
          "cloudfront:GetInvalidation",
          "cloudfront:ListDistributions",
          "cloudfront:GetDistribution",
          "cloudfront:GetDistributionConfig",
        ],
        resources: ["*"],
      }),
    );

    new cdk.CfnOutput(this, "DeployRoleArn", {
      value: this.deployRole.roleArn,
      description: "Set as GitHub Actions variable AWS_ROLE_ARN",
      exportName: "SystemCanvasDeployRoleArn",
    });
  }
}
