import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import type { Construct } from "constructs";

export interface SiteCertificateStackProps extends cdk.StackProps {
  domainName: string;
  hostedZoneId: string;
  hostedZoneName: string;
}

/** ACM certificate in us-east-1 for CloudFront. */
export class SiteCertificateStack extends cdk.Stack {
  readonly certificate: acm.Certificate;

  constructor(scope: Construct, id: string, props: SiteCertificateStackProps) {
    super(scope, id, props);

    const zone = route53.HostedZone.fromHostedZoneAttributes(this, "Zone", {
      hostedZoneId: props.hostedZoneId,
      zoneName: props.hostedZoneName,
    });

    this.certificate = new acm.Certificate(this, "SiteCertificate", {
      domainName: props.domainName,
      validation: acm.CertificateValidation.fromDns(zone),
    });

    new cdk.CfnOutput(this, "CertificateArn", {
      value: this.certificate.certificateArn,
    });
  }
}
