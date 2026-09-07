# System Canvas infrastructure (AWS CDK)

Deploys the Vite SPA to **https://system-canvas.vazue.com** using:

- Private S3 bucket (versioned, Block Public Access, SSE-S3)
- CloudFront with Origin Access Control, `PriceClass_200`, SPA error routing
- ACM certificate in `us-east-1`
- Route 53 alias records for `system-canvas.vazue.com`
- GitHub Actions OIDC deploy role (trust pinned to `manyiu/system-canvas@main`)

## Prerequisites

- AWS CLI credentials with admin rights for **one-time bootstrap**
- Node.js `>=24.20.0`, pnpm `>=12.2.1`
- Existing Route 53 public hosted zone for `vazue.com` in the **same** AWS account
- GitHub repository `manyiu/system-canvas` (public)

## Bootstrap order (operator, once)

### 1. Bootstrap CDK in both regions

```bash
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export HOSTED_ZONE_ID=$(aws route53 list-hosted-zones-by-name \
  --dns-name vazue.com. \
  --query "HostedZones[0].Id" --output text | sed 's|/hostedzone/||')

npx cdk bootstrap "aws://${AWS_ACCOUNT_ID}/ap-southeast-1"
npx cdk bootstrap "aws://${AWS_ACCOUNT_ID}/us-east-1"
```

Run these from `infra/` (or use `pnpm --filter @system-canvas/infra exec cdk ...`).

### 2. Deploy the OIDC stack first

This account already has a GitHub OIDC provider (`token.actions.githubusercontent.com`).
The stack **reuses** that provider and only creates the deploy role.

```bash
cd infra
npx cdk deploy SystemCanvasGithubOidc \
  -c account="$AWS_ACCOUNT_ID" \
  -c hostedZoneId="$HOSTED_ZONE_ID" \
  -c siteRegion=ap-southeast-1
```

Note the **DeployRoleArn** output.

### 3. Deploy certificate + site stacks

```bash
npx cdk deploy SystemCanvasCertificate SystemCanvasSite \
  -c account="$AWS_ACCOUNT_ID" \
  -c hostedZoneId="$HOSTED_ZONE_ID" \
  --require-approval never
```

Note **BucketName** and **DistributionId** outputs.

### 4. Configure GitHub repository variables

In the GitHub repo → Settings → Secrets and variables → Actions → **Variables**:

| Variable | Value |
| --- | --- |
| `AWS_ACCOUNT_ID` | Your AWS account ID |
| `AWS_ROLE_ARN` | `DeployRoleArn` from OIDC stack |
| `HOSTED_ZONE_ID` | Route 53 zone ID for `vazue.com` |
| `SITE_BUCKET_NAME` | `system-canvas-site-<account>` (or stack output) |
| `CLOUDFRONT_DISTRIBUTION_ID` | Distribution ID from site stack |
| `AWS_REGION` | `ap-southeast-1` (optional; defaulted in workflow) |

Create a GitHub Environment named **`production`** (used by `deploy.yml`). Restrict it to the `main` branch.

### 5. Sync content (or push to main)

After stacks exist, either push to `main` (Actions deploy) or sync once locally:

```bash
pnpm build
aws s3 sync packages/app/dist "s3://system-canvas-site-${AWS_ACCOUNT_ID}" --delete
aws cloudfront create-invalidation --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" --paths "/*"
```

## Ongoing deploys

Trunk-based: merge to `main` → `deploy.yml` assumes the OIDC role → `cdk deploy` → S3 sync → CloudFront invalidation.

Feature branches never receive AWS credentials.

## Verify cutover

```bash
dig +short system-canvas.vazue.com
curl -I https://system-canvas.vazue.com
```

Expect CloudFront/`vazue.com` DNS and HTTP 200 with security headers (HSTS, CSP).

## Rollback

1. Preferred: `git revert` the bad commit(s) on `main` and let CI/CD redeploy.
2. Manual: re-run the **Deploy** workflow on a known-good SHA (`workflow_dispatch` after checkout of that commit, or revert).
3. Secondary: restore prior object versions from the versioned S3 bucket, then invalidate CloudFront.

## Synth locally (no deploy)

```bash
cd infra
CDK_DEFAULT_ACCOUNT=123456789012 HOSTED_ZONE_ID=ZXXXXXXXXXXXXX npx cdk synth
```

Do **not** put real account IDs in the public README; keep them in GitHub variables / local env only.
