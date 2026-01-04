// Generate CloudFormation template for read-only IAM role
export function generateCloudFormationTemplate(externalId: string): string {
  const template = {
    AWSTemplateFormatVersion: "2010-09-09",
    Description: "SME Cloud Guard - Read-only IAM Role for AWS Security Monitoring",
    Parameters: {
      ExternalId: {
        Type: "String",
        Default: externalId,
        Description: "External ID for secure cross-account access (auto-generated)",
      },
    },
    Resources: {
      SMECloudGuardRole: {
        Type: "AWS::IAM::Role",
        Properties: {
          RoleName: "SMECloudGuardSecurityAuditRole",
          Description: "Read-only role for SME Cloud Guard security scanning",
          AssumeRolePolicyDocument: {
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Principal: {
                  AWS: "arn:aws:iam::123456789012:root", // Replace with SME Cloud Guard AWS account
                },
                Action: "sts:AssumeRole",
                Condition: {
                  StringEquals: {
                    "sts:ExternalId": { Ref: "ExternalId" },
                  },
                },
              },
            ],
          },
          ManagedPolicyArns: [
            "arn:aws:iam::aws:policy/SecurityAudit",
            "arn:aws:iam::aws:policy/job-function/ViewOnlyAccess",
          ],
          Policies: [
            {
              PolicyName: "SMECloudGuardAdditionalReadAccess",
              PolicyDocument: {
                Version: "2012-10-17",
                Statement: [
                  {
                    Sid: "CostExplorerReadOnly",
                    Effect: "Allow",
                    Action: [
                      "ce:GetCostAndUsage",
                      "ce:GetCostForecast",
                      "ce:GetAnomalies",
                      "ce:GetAnomalyMonitors",
                      "ce:GetAnomalySubscriptions",
                    ],
                    Resource: "*",
                  },
                  {
                    Sid: "BillingReadOnly",
                    Effect: "Allow",
                    Action: [
                      "aws-portal:ViewBilling",
                      "aws-portal:ViewUsage",
                    ],
                    Resource: "*",
                  },
                  {
                    Sid: "S3BucketPolicyRead",
                    Effect: "Allow",
                    Action: [
                      "s3:GetBucketPolicy",
                      "s3:GetBucketPolicyStatus",
                      "s3:GetBucketPublicAccessBlock",
                      "s3:GetAccountPublicAccessBlock",
                      "s3:GetBucketAcl",
                      "s3:GetBucketEncryption",
                      "s3:GetBucketVersioning",
                      "s3:GetBucketLogging",
                    ],
                    Resource: "*",
                  },
                  {
                    Sid: "IAMAccessAnalyzer",
                    Effect: "Allow",
                    Action: [
                      "access-analyzer:ListAnalyzers",
                      "access-analyzer:ListFindings",
                      "access-analyzer:GetFinding",
                    ],
                    Resource: "*",
                  },
                ],
              },
            },
          ],
          Tags: [
            {
              Key: "Purpose",
              Value: "SME Cloud Guard Security Monitoring",
            },
            {
              Key: "ManagedBy",
              Value: "SME Cloud Guard",
            },
          ],
        },
      },
    },
    Outputs: {
      RoleArn: {
        Description: "ARN of the SME Cloud Guard IAM Role",
        Value: { "Fn::GetAtt": ["SMECloudGuardRole", "Arn"] },
        Export: {
          Name: "SMECloudGuardRoleArn",
        },
      },
      ExternalId: {
        Description: "External ID for the role (keep this secure)",
        Value: { Ref: "ExternalId" },
      },
    },
  };

  return JSON.stringify(template, null, 2);
}

// Generate YAML version for those who prefer it
export function generateCloudFormationYAML(externalId: string): string {
  return `AWSTemplateFormatVersion: '2010-09-09'
Description: SME Cloud Guard - Read-only IAM Role for AWS Security Monitoring

Parameters:
  ExternalId:
    Type: String
    Default: '${externalId}'
    Description: External ID for secure cross-account access (auto-generated)

Resources:
  SMECloudGuardRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: SMECloudGuardSecurityAuditRole
      Description: Read-only role for SME Cloud Guard security scanning
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              AWS: arn:aws:iam::123456789012:root  # SME Cloud Guard AWS Account
            Action: sts:AssumeRole
            Condition:
              StringEquals:
                sts:ExternalId: !Ref ExternalId
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/SecurityAudit
        - arn:aws:iam::aws:policy/job-function/ViewOnlyAccess
      Policies:
        - PolicyName: SMECloudGuardAdditionalReadAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Sid: CostExplorerReadOnly
                Effect: Allow
                Action:
                  - ce:GetCostAndUsage
                  - ce:GetCostForecast
                  - ce:GetAnomalies
                  - ce:GetAnomalyMonitors
                  - ce:GetAnomalySubscriptions
                Resource: '*'
              - Sid: BillingReadOnly
                Effect: Allow
                Action:
                  - aws-portal:ViewBilling
                  - aws-portal:ViewUsage
                Resource: '*'
              - Sid: S3BucketPolicyRead
                Effect: Allow
                Action:
                  - s3:GetBucketPolicy
                  - s3:GetBucketPolicyStatus
                  - s3:GetBucketPublicAccessBlock
                  - s3:GetAccountPublicAccessBlock
                  - s3:GetBucketAcl
                  - s3:GetBucketEncryption
                  - s3:GetBucketVersioning
                  - s3:GetBucketLogging
                Resource: '*'
              - Sid: IAMAccessAnalyzer
                Effect: Allow
                Action:
                  - access-analyzer:ListAnalyzers
                  - access-analyzer:ListFindings
                  - access-analyzer:GetFinding
                Resource: '*'
      Tags:
        - Key: Purpose
          Value: SME Cloud Guard Security Monitoring
        - Key: ManagedBy
          Value: SME Cloud Guard

Outputs:
  RoleArn:
    Description: ARN of the SME Cloud Guard IAM Role
    Value: !GetAtt SMECloudGuardRole.Arn
    Export:
      Name: SMECloudGuardRoleArn
  ExternalId:
    Description: External ID for the role (keep this secure)
    Value: !Ref ExternalId
`;
}
