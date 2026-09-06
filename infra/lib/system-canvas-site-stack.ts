import * as cdk from "aws-cdk-lib";
import type * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";

export interface SystemCanvasSiteStackProps extends cdk.StackProps {
  domainName: string;
  hostedZoneId: string;
  hostedZoneName: string;
  siteBucketName: string;
  certificate: acm.ICertificate;
}

/**
 * Private S3 origin + CloudFront (OAC) + Route53 alias.
 * Certificate must be issued in us-east-1 and passed in.
 */
export class SystemCanvasSiteStack extends cdk.Stack {
  readonly bucket: s3.Bucket;
  readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: SystemCanvasSiteStackProps) {
    super(scope, id, props);

    const zone = route53.HostedZone.fromHostedZoneAttributes(this, "Zone", {
      hostedZoneId: props.hostedZoneId,
      zoneName: props.hostedZoneName,
    });

    this.bucket = new s3.Bucket(this, "SiteBucket", {
      bucketName: props.siteBucketName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      publicReadAccess: false,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
    });

    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, "SecurityHeaders", {
      responseHeadersPolicyName: `system-canvas-security-${this.account}`,
      securityHeadersBehavior: {
        strictTransportSecurity: {
          accessControlMaxAge: cdk.Duration.days(365),
          includeSubdomains: true,
          preload: true,
          override: true,
        },
        contentTypeOptions: { override: true },
        frameOptions: {
          frameOption: cloudfront.HeadersFrameOption.DENY,
          override: true,
        },
        referrerPolicy: {
          referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
          override: true,
        },
        xssProtection: { protection: true, modeBlock: true, override: true },
        contentSecurityPolicy: {
          contentSecurityPolicy: [
            "default-src 'self'",
            "base-uri 'self'",
            "object-src 'none'",
            "frame-ancestors 'none'",
            // Monaco (@monaco-editor/react) loads workers/scripts from jsDelivr by default.
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net blob:",
            "worker-src 'self' blob: https://cdn.jsdelivr.net",
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
            "font-src 'self' data: https://cdn.jsdelivr.net",
            "img-src 'self' data: blob:",
            "connect-src 'self'",
          ].join("; "),
          override: true,
        },
      },
    });

    const staticCachePolicy = new cloudfront.CachePolicy(this, "StaticAssetsCache", {
      cachePolicyName: `system-canvas-static-${this.account}`,
      defaultTtl: cdk.Duration.days(30),
      maxTtl: cdk.Duration.days(365),
      minTtl: cdk.Duration.days(1),
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
      headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
    });

    const htmlCachePolicy = new cloudfront.CachePolicy(this, "HtmlCache", {
      cachePolicyName: `system-canvas-html-${this.account}`,
      defaultTtl: cdk.Duration.seconds(0),
      maxTtl: cdk.Duration.seconds(60),
      minTtl: cdk.Duration.seconds(0),
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
      headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
    });

    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(this.bucket);

    this.distribution = new cloudfront.Distribution(this, "Distribution", {
      comment: "System Canvas static site",
      domainNames: [props.domainName],
      certificate: props.certificate,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_200,
      defaultRootObject: "index.html",
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      defaultBehavior: {
        origin: s3Origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
        cachePolicy: htmlCachePolicy,
        responseHeadersPolicy,
      },
      additionalBehaviors: {
        "/assets/*": {
          origin: s3Origin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
          compress: true,
          cachePolicy: staticCachePolicy,
          responseHeadersPolicy,
        },
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: cdk.Duration.seconds(0),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: cdk.Duration.seconds(0),
        },
      ],
    });

    new route53.ARecord(this, "AliasA", {
      zone,
      recordName: props.domainName,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.distribution)),
    });

    new route53.AaaaRecord(this, "AliasAAAA", {
      zone,
      recordName: props.domainName,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.distribution)),
    });

    new cdk.CfnOutput(this, "BucketName", {
      value: this.bucket.bucketName,
      exportName: "SystemCanvasSiteBucketName",
    });

    new cdk.CfnOutput(this, "DistributionId", {
      value: this.distribution.distributionId,
      exportName: "SystemCanvasDistributionId",
    });

    new cdk.CfnOutput(this, "DistributionDomainName", {
      value: this.distribution.distributionDomainName,
      exportName: "SystemCanvasDistributionDomain",
    });

    new cdk.CfnOutput(this, "SiteUrl", {
      value: `https://${props.domainName}`,
    });
  }
}
