import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { STSClient, AssumeRoleCommand } from "https://esm.sh/@aws-sdk/client-sts@3.525.0";
import { EC2Client, DescribeSecurityGroupsCommand, DescribeInstancesCommand } from "https://esm.sh/@aws-sdk/client-ec2@3.525.0";
import { RDSClient, DescribeDBInstancesCommand } from "https://esm.sh/@aws-sdk/client-rds@3.525.0";
import { CloudTrailClient, DescribeTrailsCommand, GetTrailStatusCommand } from "https://esm.sh/@aws-sdk/client-cloudtrail@3.525.0";
import { IAMClient, ListUsersCommand, ListAccessKeysCommand, GetLoginProfileCommand, ListMFADevicesCommand, ListAttachedUserPoliciesCommand, ListUserPoliciesCommand, GetAccessKeyLastUsedCommand } from "https://esm.sh/@aws-sdk/client-iam@3.525.0";
import { z } from "https://esm.sh/zod@3.22.4";
import { assertAwsAccountAccess } from "../_shared/org-guard.ts";
import { getCorsHeaders } from "../_shared/cors.ts";



// Authentication helper - validates service role key or JWT for authorization
// verify_jwt = false in config, so we validate JWTs in code using getClaims()
async function validateAuth(req: Request): Promise<{ isServiceRole: boolean; userId?: string }> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing authorization header');
  }

  const token = authHeader.replace('Bearer ', '');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  // Check if this is an internal service-to-service call
  if (token === serviceRoleKey) {
    return { isServiceRole: true };
  }

  // Validate JWT using getClaims for user requests
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    throw new Error('Invalid JWT');
  }

  return { isServiceRole: false, userId: claimsData.claims.sub as string };
}

// Zod schema for request validation
const ScanRequestSchema = z.object({
  aws_account_id: z.string().uuid('Invalid AWS account ID format'),
  scan_job_id: z.string().uuid('Invalid scan job ID format'),
  services: z.array(z.enum(['security_groups', 'iam', 's3', 'ec2', 'rds', 'vpc', 'cloudtrail', 'cost']))
});

type ScanRequest = z.infer<typeof ScanRequestSchema>;

type ExecutionTag = 'SAFE_AUTOMATABLE' | 'REQUIRES_REVIEW' | 'MANUAL_ONLY';

interface Finding {
  aws_account_id: string;
  scan_job_id: string;
  service: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  resource_id: string;
  resource_type: string;
  remediation_steps: string[];
  cloudformation_template?: string;
  // Enhanced analysis fields
  risk_score_contribution: number;
  impact_assessment: string;
  execution_tag: ExecutionTag;
  rollback_guidance: string;
  compliance_tags: string[];
}

// Assume the customer's IAM role
async function assumeCustomerRole(roleArn: string, externalId: string) {
  const awsAccessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID");
  const awsSecretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");

  if (!awsAccessKeyId || !awsSecretAccessKey) {
    throw new Error("AWS credentials not configured. Please add AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY secrets.");
  }

  const stsClient = new STSClient({
    region: "us-east-1",
    credentials: {
      accessKeyId: awsAccessKeyId,
      secretAccessKey: awsSecretAccessKey,
    },
  });
  
  const command = new AssumeRoleCommand({
    RoleArn: roleArn,
    RoleSessionName: "SMECloudGuardScanner",
    ExternalId: externalId,
    DurationSeconds: 3600,
  });
  
  const response = await stsClient.send(command);
  
  if (!response.Credentials) {
    throw new Error("Failed to assume role - no credentials returned");
  }
  
  return {
    accessKeyId: response.Credentials.AccessKeyId!,
    secretAccessKey: response.Credentials.SecretAccessKey!,
    sessionToken: response.Credentials.SessionToken!,
  };
}

// Scan Security Groups for misconfigurations
async function scanSecurityGroups(
  credentials: { accessKeyId: string; secretAccessKey: string; sessionToken: string },
  awsAccountId: string,
  scanJobId: string,
  customerAccountId: string
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const regions = ["us-east-1", "us-west-2", "eu-west-1", "ap-south-1"];
  
  for (const region of regions) {
    try {
      const ec2Client = new EC2Client({
        region,
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken,
        },
      });
      
      const command = new DescribeSecurityGroupsCommand({});
      const response = await ec2Client.send(command);
      
      for (const sg of response.SecurityGroups || []) {
        for (const rule of sg.IpPermissions || []) {
          const hasOpenIPv4 = rule.IpRanges?.some(r => r.CidrIp === "0.0.0.0/0");
          const hasOpenIPv6 = rule.Ipv6Ranges?.some(r => r.CidrIpv6 === "::/0");
          
          if (hasOpenIPv4 || hasOpenIPv6) {
            // Critical: SSH open to internet
            if (rule.FromPort === 22 || (rule.FromPort && rule.FromPort <= 22 && rule.ToPort && rule.ToPort >= 22)) {
              findings.push({
                aws_account_id: awsAccountId,
                scan_job_id: scanJobId,
                service: "security_groups",
                severity: "critical",
                title: `SSH (port 22) open to the internet`,
                description: `Security group "${sg.GroupName}" (${sg.GroupId}) in ${region} allows SSH access from anywhere (0.0.0.0/0). This exposes your servers to brute-force attacks, credential stuffing, and exploitation of SSH vulnerabilities. Attackers routinely scan the internet for open SSH ports and can compromise servers within minutes of exposure.`,
                resource_id: sg.GroupId!,
                resource_type: "Security Group",
                remediation_steps: [
                  "Go to EC2 Console → Security Groups → Select this security group",
                  "Click 'Edit inbound rules' and locate the SSH (port 22) rule with source 0.0.0.0/0",
                  "Change the source to your specific IP address or CIDR range (e.g., your office IP)",
                  "If remote access is needed from multiple locations, consider using AWS Systems Manager Session Manager instead",
                  "Save the changes and verify SSH access still works from your trusted locations",
                ],
                cloudformation_template: generateSGRemediationTemplate(sg.GroupId!, 22, region),
                risk_score_contribution: 10,
                impact_assessment: "Restricting SSH access may temporarily block legitimate administrators. Ensure you have your current IP address added before removing 0.0.0.0/0. If using dynamic IPs, consider a VPN or bastion host solution.",
                execution_tag: "REQUIRES_REVIEW",
                rollback_guidance: "To revert, add a new inbound rule for SSH (port 22) with source 0.0.0.0/0. This is NOT recommended - instead, add specific IP ranges that need access.",
                compliance_tags: ["ISO27001-A.13.1.1", "SOC2-CC6.1", "DPDP-S8", "GDPR-Art32"],
              });
            }
            
            // Critical: RDP open to internet
            if (rule.FromPort === 3389 || (rule.FromPort && rule.FromPort <= 3389 && rule.ToPort && rule.ToPort >= 3389)) {
              findings.push({
                aws_account_id: awsAccountId,
                scan_job_id: scanJobId,
                service: "security_groups",
                severity: "critical",
                title: `RDP (port 3389) open to the internet`,
                description: `Security group "${sg.GroupName}" (${sg.GroupId}) in ${region} allows RDP access from anywhere. Windows servers exposed to the internet are prime targets for ransomware attacks, brute-force password guessing, and exploitation of RDP vulnerabilities (like BlueKeep). This is one of the most common attack vectors for SME compromises.`,
                resource_id: sg.GroupId!,
                resource_type: "Security Group",
                remediation_steps: [
                  "Immediately restrict RDP access to known IP addresses only",
                  "Edit the inbound rule to replace 0.0.0.0/0 with your office/VPN IP range",
                  "Enable Network Level Authentication (NLA) on all Windows servers",
                  "Consider using AWS Systems Manager Fleet Manager for browser-based Windows access",
                  "Implement a VPN or AWS Client VPN for remote administration",
                ],
                cloudformation_template: generateSGRemediationTemplate(sg.GroupId!, 3389, region),
                risk_score_contribution: 10,
                impact_assessment: "Restricting RDP will block all external Windows remote access until trusted IPs are configured. Critical if admins rely on direct RDP - ensure alternative access is set up first.",
                execution_tag: "REQUIRES_REVIEW",
                rollback_guidance: "Add an inbound rule for RDP (port 3389) with source 0.0.0.0/0. Strongly discouraged - consider VPN access instead.",
                compliance_tags: ["ISO27001-A.13.1.1", "SOC2-CC6.1", "DPDP-S8", "GDPR-Art32"],
              });
            }
            
            // High: Database ports open to internet
            const dbPorts = [3306, 5432, 1433, 27017, 6379, 5439];
            for (const dbPort of dbPorts) {
              if (rule.FromPort && rule.ToPort && rule.FromPort <= dbPort && rule.ToPort >= dbPort) {
                const dbNames: Record<number, string> = {
                  3306: "MySQL",
                  5432: "PostgreSQL",
                  1433: "SQL Server",
                  27017: "MongoDB",
                  6379: "Redis",
                  5439: "Redshift",
                };
                findings.push({
                  aws_account_id: awsAccountId,
                  scan_job_id: scanJobId,
                  service: "security_groups",
                  severity: "high",
                  title: `${dbNames[dbPort]} (port ${dbPort}) open to the internet`,
                  description: `Security group "${sg.GroupName}" (${sg.GroupId}) in ${region} allows ${dbNames[dbPort]} database access from anywhere. Databases should never be directly accessible from the internet. Exposed databases are actively scanned by attackers and can lead to complete data theft, ransomware, or data destruction within hours of exposure.`,
                  resource_id: sg.GroupId!,
                  resource_type: "Security Group",
                  remediation_steps: [
                    "Remove public access to database ports immediately",
                    "Allow access only from your application security groups",
                    "Ensure your application servers are in the same VPC or use VPC peering",
                    "Use VPC endpoints or AWS PrivateLink for cross-VPC connectivity",
                    "Enable encryption in transit (SSL/TLS) for all database connections",
                    "Review database users and remove any accounts with weak passwords",
                  ],
                  risk_score_contribution: 8,
                  impact_assessment: "Restricting database access should not affect applications if they connect from within the VPC. External tools (like database admin GUIs) will need to connect via bastion host or VPN.",
                  execution_tag: "REQUIRES_REVIEW",
                  rollback_guidance: `Add an inbound rule for port ${dbPort} with source 0.0.0.0/0. Never do this in production - use a bastion host for emergency access.`,
                  compliance_tags: ["ISO27001-A.13.1.3", "SOC2-CC6.6", "DPDP-S8", "GDPR-Art32"],
                });
              }
            }
            
            // High: All traffic allowed
            if (rule.IpProtocol === "-1") {
              findings.push({
                aws_account_id: awsAccountId,
                scan_job_id: scanJobId,
                service: "security_groups",
                severity: "high",
                title: `All traffic allowed from the internet`,
                description: `Security group "${sg.GroupName}" (${sg.GroupId}) in ${region} allows ALL inbound traffic from 0.0.0.0/0. This completely defeats the purpose of having a security group and exposes every service on associated instances to the internet. This is equivalent to having no firewall at all.`,
                resource_id: sg.GroupId!,
                resource_type: "Security Group",
                remediation_steps: [
                  "Audit all services running on instances using this security group",
                  "Document which ports are actually needed (e.g., 80, 443 for web servers)",
                  "Create specific inbound rules for only the required ports",
                  "Remove the 0.0.0.0/0 all-traffic rule",
                  "Test that applications still work with the restricted rules",
                ],
                risk_score_contribution: 9,
                impact_assessment: "Removing this rule may break applications if you haven't added specific rules first. Audit what's running before removing. Consider adding specific rules for known ports before deleting the all-traffic rule.",
                execution_tag: "MANUAL_ONLY",
                rollback_guidance: "Add an inbound rule with 'All traffic' protocol and source 0.0.0.0/0. This is a temporary emergency measure only.",
                compliance_tags: ["ISO27001-A.13.1.1", "SOC2-CC6.1", "DPDP-S8"],
              });
            }
          }
        }
        
        // Check if default security group has rules
        if (sg.GroupName === "default" && (sg.IpPermissions?.length || 0) > 0) {
          findings.push({
            aws_account_id: awsAccountId,
            scan_job_id: scanJobId,
            service: "security_groups",
            severity: "medium",
            title: `Default security group has custom rules`,
            description: `The default security group in VPC ${sg.VpcId} (${region}) has been modified with custom rules. AWS best practice is to keep default security groups empty. Resources accidentally placed in the default group could have unintended network access.`,
            resource_id: sg.GroupId!,
            resource_type: "Security Group",
            remediation_steps: [
              "Create dedicated security groups for each workload type",
              "Migrate all resources to use the appropriate dedicated security groups",
              "Remove all custom inbound and outbound rules from the default security group",
              "Keep the default security group with no rules as a catch-all fallback",
            ],
            risk_score_contribution: 4,
            impact_assessment: "Low immediate impact. This is a best practice recommendation. No service disruption if done correctly with dedicated security groups created first.",
            execution_tag: "SAFE_AUTOMATABLE",
            rollback_guidance: "Re-add the removed rules to the default security group. Document what rules existed before cleanup.",
            compliance_tags: ["ISO27001-A.13.1.1", "SOC2-CC6.1"],
          });
        }
      }
    } catch (err) {
      console.log(`Failed to scan security groups in ${region}:`, err);
    }
  }
  
  return findings;
}

// Generate CloudFormation template to remediate security group issue
function generateSGRemediationTemplate(sgId: string, port: number, region: string): string {
  return JSON.stringify({
    AWSTemplateFormatVersion: "2010-09-09",
    Description: `Remove public access to port ${port} from security group ${sgId}`,
    Parameters: {
      TrustedCIDR: {
        Type: "String",
        Description: "Your trusted IP range (e.g., 203.0.113.0/24)",
        Default: "10.0.0.0/8",
      },
    },
    Resources: {
      RemediationNote: {
        Type: "AWS::CloudFormation::WaitConditionHandle",
        Metadata: {
          Instructions: [
            `1. Go to EC2 Console in ${region}`,
            `2. Find security group ${sgId}`,
            `3. Edit inbound rules`,
            `4. Remove the 0.0.0.0/0 rule for port ${port}`,
            `5. Add a new rule allowing port ${port} from your trusted CIDR`,
          ],
        },
      },
    },
  }, null, 2);
}

// Scan IAM for security issues
async function scanIAM(
  credentials: { accessKeyId: string; secretAccessKey: string; sessionToken: string },
  awsAccountId: string,
  scanJobId: string,
  customerAccountId: string,
  accountAlias: string | null
): Promise<Finding[]> {
  const findings: Finding[] = [];
  
  try {
    const iamClient = new IAMClient({
      region: "us-east-1",
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      },
    });
    
    const listUsersCommand = new ListUsersCommand({});
    const usersResponse = await iamClient.send(listUsersCommand);
    
    for (const user of usersResponse.Users || []) {
      const userName = user.UserName!;
      const userArn = user.Arn!;
      
      // Check for console access without MFA
      try {
        await iamClient.send(new GetLoginProfileCommand({ UserName: userName }));
        const mfaResponse = await iamClient.send(new ListMFADevicesCommand({ UserName: userName }));
        
        if (!mfaResponse.MFADevices || mfaResponse.MFADevices.length === 0) {
          findings.push({
            aws_account_id: awsAccountId,
            scan_job_id: scanJobId,
            service: "iam",
            severity: "high",
            title: `IAM user "${userName}" has console access without MFA`,
            description: `User ${userName} can log into the AWS Console but has no MFA device configured. If their password is compromised through phishing, password reuse, or brute force, attackers will have full access to their AWS permissions. MFA blocks 99.9% of account compromise attempts.`,
            resource_id: userArn,
            resource_type: "IAM User",
            remediation_steps: [
              `Go to IAM Console → Users → ${userName} → Security credentials tab`,
              "In the 'Multi-factor authentication (MFA)' section, click 'Assign MFA device'",
              "Choose 'Authenticator app' (recommended: Google Authenticator, Authy, or Microsoft Authenticator)",
              "Scan the QR code with your authenticator app",
              "Enter two consecutive MFA codes to complete setup",
              "Consider enforcing MFA via IAM policy for all console users",
            ],
            risk_score_contribution: 7,
            impact_assessment: "Enabling MFA adds a few seconds to each login. No service disruption. Users will need their phone or hardware token when logging in.",
            execution_tag: "SAFE_AUTOMATABLE",
            rollback_guidance: `Go to IAM → Users → ${userName} → Security credentials → MFA → Delete. Not recommended as it weakens security.`,
            compliance_tags: ["ISO27001-A.9.4.2", "SOC2-CC6.1", "DPDP-S8", "GDPR-Art32"],
          });
        }
      } catch {
        // No console access - that's fine
      }
      
      // Check attached managed policies for overly permissive access
      const attachedPoliciesResponse = await iamClient.send(new ListAttachedUserPoliciesCommand({ UserName: userName }));
      
      for (const policy of attachedPoliciesResponse.AttachedPolicies || []) {
        const dangerousPolicies = ["AdministratorAccess", "PowerUserAccess", "IAMFullAccess"];
        
        if (dangerousPolicies.includes(policy.PolicyName!)) {
          const isCritical = policy.PolicyName === "AdministratorAccess";
          findings.push({
            aws_account_id: awsAccountId,
            scan_job_id: scanJobId,
            service: "iam",
            severity: isCritical ? "critical" : "high",
            title: `User "${userName}" has ${policy.PolicyName} attached`,
            description: `IAM user ${userName} has the ${policy.PolicyName} managed policy attached. This grants ${isCritical ? 'complete control over all AWS resources' : 'excessive permissions'} and violates the principle of least privilege. If this account is compromised, attackers could delete all data, spin up cryptocurrency miners, or exfiltrate sensitive information.`,
            resource_id: userArn,
            resource_type: "IAM User",
            remediation_steps: [
              "Audit what this user actually needs access to for their daily work",
              "Use AWS IAM Access Analyzer to identify unused permissions",
              "Create a custom policy with only the required permissions",
              `Go to IAM → Users → ${userName} → Permissions → Detach ${policy.PolicyName}`,
              "Attach the new least-privilege policy instead",
              "Consider using IAM Identity Center (SSO) for human users",
            ],
            risk_score_contribution: isCritical ? 10 : 7,
            impact_assessment: `User may lose access to some AWS services they were using. Work with the user to identify required permissions before detaching. Have a rollback plan ready.`,
            execution_tag: "MANUAL_ONLY",
            rollback_guidance: `Go to IAM → Users → ${userName} → Permissions → Attach policies → Search for ${policy.PolicyName} → Attach. Only do this temporarily for emergency access.`,
            compliance_tags: ["ISO27001-A.9.2.3", "SOC2-CC6.3", "DPDP-S8", "GDPR-Art32"],
          });
        }
      }
      
      // Check for inline policies
      const inlinePoliciesResponse = await iamClient.send(new ListUserPoliciesCommand({ UserName: userName }));
      
      if (inlinePoliciesResponse.PolicyNames && inlinePoliciesResponse.PolicyNames.length > 0) {
        findings.push({
          aws_account_id: awsAccountId,
          scan_job_id: scanJobId,
          service: "iam",
          severity: "low",
          title: `User "${userName}" has inline policies`,
          description: `IAM user ${userName} has ${inlinePoliciesResponse.PolicyNames.length} inline policy(ies) attached. Inline policies are harder to manage, audit, and reuse compared to managed policies. They also don't appear in policy simulators and can hide unexpected permissions.`,
          resource_id: userArn,
          resource_type: "IAM User",
          remediation_steps: [
            `Go to IAM → Users → ${userName} → Permissions → Inline policies`,
            "Review each inline policy and document what it allows",
            "Create equivalent customer-managed policies with the same permissions",
            "Attach the managed policies to the user or a group",
            "Delete the inline policies after confirming the managed policies work",
          ],
          risk_score_contribution: 2,
          impact_assessment: "No immediate impact if permissions are replicated correctly to managed policies. Low risk of service disruption.",
          execution_tag: "SAFE_AUTOMATABLE",
          rollback_guidance: "Re-create the inline policy with the original JSON. Keep a backup of inline policy documents before deletion.",
          compliance_tags: ["ISO27001-A.9.2.3", "SOC2-CC6.3"],
        });
      }
      
      // Check access keys
      const accessKeysResponse = await iamClient.send(new ListAccessKeysCommand({ UserName: userName }));
      
      for (const accessKey of accessKeysResponse.AccessKeyMetadata || []) {
        const keyAge = Math.floor((Date.now() - new Date(accessKey.CreateDate!).getTime()) / (1000 * 60 * 60 * 24));
        
        // Check key age (over 90 days is concerning)
        if (keyAge > 90) {
          findings.push({
            aws_account_id: awsAccountId,
            scan_job_id: scanJobId,
            service: "iam",
            severity: keyAge > 180 ? "high" : "medium",
            title: `Access key for "${userName}" is ${keyAge} days old`,
            description: `Access key ${accessKey.AccessKeyId} was created ${keyAge} days ago. AWS recommends rotating access keys every 90 days to limit exposure if keys are leaked. Old keys may have been shared in emails, code repositories, or scripts, increasing compromise risk over time.`,
            resource_id: userArn,
            resource_type: "IAM Access Key",
            remediation_steps: [
              `Go to IAM → Users → ${userName} → Security credentials`,
              "Click 'Create access key' to generate a new key pair",
              "Update all applications/scripts using the old key with the new credentials",
              "Test thoroughly to ensure everything works with the new key",
              "Deactivate (don't delete yet) the old access key",
              "After 1-2 weeks with no issues, delete the old key",
              "Consider using IAM Roles instead of long-term access keys where possible",
            ],
            risk_score_contribution: keyAge > 180 ? 6 : 4,
            impact_assessment: "Applications using this key will break when the key is deactivated. Plan the rotation carefully and test in non-production first.",
            execution_tag: "REQUIRES_REVIEW",
            rollback_guidance: `Go to IAM → Users → ${userName} → Security credentials → Access keys → Make inactive key active again. Keep the old key available until rotation is verified.`,
            compliance_tags: ["ISO27001-A.9.4.3", "SOC2-CC6.1", "DPDP-S8"],
          });
        }
        
        // Check last used
        try {
          const lastUsedResponse = await iamClient.send(new GetAccessKeyLastUsedCommand({ AccessKeyId: accessKey.AccessKeyId! }));
          
          if (lastUsedResponse.AccessKeyLastUsed?.LastUsedDate) {
            const daysSinceUsed = Math.floor((Date.now() - new Date(lastUsedResponse.AccessKeyLastUsed.LastUsedDate).getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysSinceUsed > 90) {
              findings.push({
                aws_account_id: awsAccountId,
                scan_job_id: scanJobId,
                service: "iam",
                severity: "high",
                title: `Access key for "${userName}" unused for ${daysSinceUsed} days`,
                description: `Access key ${accessKey.AccessKeyId} has not been used for ${daysSinceUsed} days. Unused credentials pose a security risk - they may have been forgotten, leaked, or created for a purpose that no longer exists. If compromised, no one would notice the misuse.`,
                resource_id: userArn,
                resource_type: "IAM Access Key",
                remediation_steps: [
                  "Verify if this access key is still required by any application or script",
                  "Contact the key owner or check recent activity logs",
                  "If not needed, deactivate the key immediately",
                  "Monitor for 30 days to ensure no legitimate usage",
                  "After confirmation, delete the key permanently",
                ],
                risk_score_contribution: 6,
                impact_assessment: "Low impact if the key is truly unused. Deactivating first (instead of deleting) allows quick recovery if something unexpected breaks.",
                execution_tag: "SAFE_AUTOMATABLE",
                rollback_guidance: `Go to IAM → Users → ${userName} → Security credentials → Access keys → Change status to 'Active'. Key must not be deleted for this to work.`,
                compliance_tags: ["ISO27001-A.9.4.3", "SOC2-CC6.1", "DPDP-S8"],
              });
            }
          } else if (!lastUsedResponse.AccessKeyLastUsed?.LastUsedDate && keyAge > 30) {
            findings.push({
              aws_account_id: awsAccountId,
              scan_job_id: scanJobId,
              service: "iam",
              severity: "medium",
              title: `Access key for "${userName}" was never used`,
              description: `Access key ${accessKey.AccessKeyId} was created ${keyAge} days ago but has never been used. This could indicate a forgotten key created for testing or development, or credentials that were leaked before being deployed. Unused keys should be removed.`,
              resource_id: userArn,
              resource_type: "IAM Access Key",
              remediation_steps: [
                "Investigate why this key was created (check with the user or team)",
                "If it was created for testing, delete it immediately",
                "If still needed for a future project, delete and recreate when actually needed",
                "Implement a policy to create keys only when immediately required",
              ],
              risk_score_contribution: 3,
              impact_assessment: "Very low impact since the key was never used. Safe to delete after brief investigation.",
              execution_tag: "SAFE_AUTOMATABLE",
              rollback_guidance: "Cannot restore deleted keys. Create a new access key if needed. This is why investigation before deletion is recommended.",
              compliance_tags: ["ISO27001-A.9.4.3", "SOC2-CC6.1"],
            });
          }
        } catch (err) {
          console.log(`Failed to get last used for key ${accessKey.AccessKeyId}:`, err);
        }
      }
      
      // Check for multiple access keys
      if (accessKeysResponse.AccessKeyMetadata && accessKeysResponse.AccessKeyMetadata.length > 1) {
        const activeKeys = accessKeysResponse.AccessKeyMetadata.filter(k => k.Status === "Active");
        if (activeKeys.length > 1) {
          findings.push({
            aws_account_id: awsAccountId,
            scan_job_id: scanJobId,
            service: "iam",
            severity: "low",
            title: `User "${userName}" has multiple active access keys`,
            description: `IAM user ${userName} has ${activeKeys.length} active access keys. While sometimes needed temporarily during key rotation, having multiple active keys long-term increases the attack surface and makes credential management more complex.`,
            resource_id: userArn,
            resource_type: "IAM User",
            remediation_steps: [
              "Review which applications use each access key",
              "Check the 'Last used' information for each key in IAM Console",
              "Consolidate to a single access key where possible",
              "Deactivate and delete the unused key",
              "Implement proper key rotation procedures for the future",
            ],
            risk_score_contribution: 2,
            impact_assessment: "Low immediate risk. Consolidating keys improves manageability. Ensure you know which key each application uses before deleting.",
            execution_tag: "REQUIRES_REVIEW",
            rollback_guidance: "Create a new access key to replace deleted ones. Applications will need to be updated with new credentials.",
            compliance_tags: ["ISO27001-A.9.4.3", "SOC2-CC6.1"],
          });
        }
      }
    }
  } catch (err) {
    console.error("Failed to scan IAM:", err);
    throw err;
  }
  
  return findings;
}

// Scan EC2 instances for standalone Public IP exposure
async function scanEC2PublicIPs(
  credentials: { accessKeyId: string; secretAccessKey: string; sessionToken: string },
  awsAccountId: string,
  scanJobId: string,
  sgFindings: Finding[] = []
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const regions = ["us-east-1", "us-west-2", "eu-west-1", "ap-south-1"];

  // Track instance IDs that already have open SG critical/high findings
  const openSgInstanceIds = new Set<string>();
  for (const sgf of sgFindings) {
    if (sgf.severity === 'critical' || sgf.severity === 'high') {
      if (sgf.resource_id) openSgInstanceIds.add(sgf.resource_id);
    }
  }

  for (const region of regions) {
    try {
      const ec2Client = new EC2Client({
        region,
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken,
        },
      });

      const command = new DescribeInstancesCommand({});
      const response = await ec2Client.send(command);

      for (const reservation of response.Reservations || []) {
        for (const instance of reservation.Instances || []) {
          if (instance.State?.Name === 'running' && instance.PublicIpAddress) {
            const instanceId = instance.InstanceId || 'unknown-instance';
            const instanceName = instance.Tags?.find(t => t.Key === 'Name')?.Value || instanceId;
            const hasOpenSg = openSgInstanceIds.has(instanceId);
            const severity = hasOpenSg ? 'high' : 'medium';

            findings.push({
              aws_account_id: awsAccountId,
              scan_job_id: scanJobId,
              service: "ec2",
              severity: severity,
              title: `EC2 instance "${instanceName}" has a public IP address assigned`,
              description: `EC2 instance "${instanceName}" (${instanceId}) in ${region} has public IP address ${instance.PublicIpAddress} assigned. Attaching a public IP address directly exposes the virtual machine to internet-wide automated scanning and potential ingress attack vectors, independent of current security group rule state.`,
              resource_id: instanceId,
              resource_type: "AWS::EC2::Instance",
              remediation_steps: [
                `Go to EC2 Console → Instances → Select "${instanceName}" (${instanceId})`,
                "Review if direct public access is strictly required for this workload",
                "Disassociate Elastic IP / auto-assigned public IP if not needed",
                "Place instance behind an Application Load Balancer or NAT Gateway for internet traffic",
                "Use AWS Systems Manager (SSM) Session Manager for administrative access instead of direct SSH/RDP",
              ],
              risk_score_contribution: hasOpenSg ? 8 : 5,
              impact_assessment: `Removing public IP will block direct inbound connections to ${instance.PublicIpAddress}. Ensure alternative access routes (SSM, VPN, or ALB) are configured.`,
              execution_tag: "REQUIRES_REVIEW",
              rollback_guidance: `Re-assign a public IP / Elastic IP to instance ${instanceId} network interface.`,
              compliance_tags: ["ISO27001-A.13.1.1", "SOC2-CC6.6", "CIS-AWS-5.2"],
            });
          }
        }
      }
    } catch (err) {
      console.log(`Failed to scan EC2 instances in ${region}:`, err);
    }
  }

  return findings;
}

// Scan RDS DB instances for public accessibility
async function scanRDSInstances(
  credentials: { accessKeyId: string; secretAccessKey: string; sessionToken: string },
  awsAccountId: string,
  scanJobId: string
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const regions = ["us-east-1", "us-west-2", "eu-west-1", "ap-south-1"];

  for (const region of regions) {
    try {
      const rdsClient = new RDSClient({
        region,
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken,
        },
      });

      const command = new DescribeDBInstancesCommand({});
      const response = await rdsClient.send(command);

      for (const dbInstance of response.DBInstances || []) {
        if (dbInstance.PubliclyAccessible === true) {
          const dbId = dbInstance.DBInstanceIdentifier || 'unknown-db';
          findings.push({
            aws_account_id: awsAccountId,
            scan_job_id: scanJobId,
            service: "rds",
            severity: "critical",
            title: `RDS database instance "${dbId}" is publicly accessible`,
            description: `RDS DB instance "${dbId}" in ${region} has PubliclyAccessible flag set to true. Publicly accessible databases allow direct DNS resolution and connection attempts from anywhere on the internet. Database instances should reside in private subnets and be accessible only via internal VPC endpoints, VPN, or application tier security groups.`,
            resource_id: dbId,
            resource_type: "AWS::RDS::DBInstance",
            remediation_steps: [
              `Go to RDS Console → Databases → Select "${dbId}"`,
              "Click 'Modify'",
              "Scroll to Connectivity section → Additional configuration",
              "Set 'Publicly accessible' to 'No'",
              "Choose 'Apply immediately' or schedule during next maintenance window",
              "Ensure application servers connect via private VPC subnet endpoints",
            ],
            risk_score_contribution: 20,
            impact_assessment: "Setting PubliclyAccessible to No prevents external IP addresses outside the VPC from establishing DB connections. Internal application servers inside the VPC will remain unaffected.",
            execution_tag: "SAFE_AUTOMATABLE",
            rollback_guidance: "Modify RDS instance and set PubliclyAccessible back to Yes if emergency external access is required.",
            compliance_tags: ["ISO27001-A.13.1.3", "SOC2-CC6.6", "PCI-DSS-1.3", "DPDP-S8", "GDPR-Art32"],
          });
        }
      }
    } catch (err) {
      console.log(`Failed to scan RDS instances in ${region}:`, err);
    }
  }

  return findings;
}

// Scan CloudTrail for logging enablement
async function scanCloudTrailLogging(
  credentials: { accessKeyId: string; secretAccessKey: string; sessionToken: string },
  awsAccountId: string,
  scanJobId: string,
  customerAccountId: string
): Promise<Finding[]> {
  const findings: Finding[] = [];
  let isLoggingActive = false;

  try {
    const cloudTrailClient = new CloudTrailClient({
      region: "us-east-1",
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      },
    });

    const trailsResponse = await cloudTrailClient.send(new DescribeTrailsCommand({ includeShadowTrails: false }));
    for (const trail of trailsResponse.trailList || []) {
      if (trail.IsMultiRegionTrail) {
        const statusResponse = await cloudTrailClient.send(new GetTrailStatusCommand({ Name: trail.TrailARN }));
        if (statusResponse.IsLogging) {
          isLoggingActive = true;
          break;
        }
      }
    }
  } catch (err) {
    console.log("Failed to describe CloudTrail status:", err);
  }

  if (!isLoggingActive) {
    findings.push({
      aws_account_id: awsAccountId,
      scan_job_id: scanJobId,
      service: "cloudtrail",
      severity: "high",
      title: "CloudTrail audit logging is disabled or missing multi-region trail",
      description: "No active multi-region AWS CloudTrail trail was found recording management events for this account. CloudTrail provides immutable audit logs of all AWS API activity. Without active audit logging, security incidents, unauthorized IAM calls, and data breaches cannot be investigated or alerted on.",
      resource_id: `arn:aws:cloudtrail:us-east-1:${customerAccountId}:trail/main-audit-trail`,
      resource_type: "AWS::CloudTrail::Trail",
      remediation_steps: [
        "Go to CloudTrail Console → Trails → Click 'Create trail'",
        "Name the trail (e.g., 'main-audit-trail')",
        "Enable 'Apply trail to all regions'",
        "Configure management events to log both Read and Write events",
        "Set up an S3 bucket with server-side encryption for log storage",
        "Enable CloudWatch Logs integration for real-time security alerting",
      ],
      risk_score_contribution: 15,
      impact_assessment: "Enabling CloudTrail incurs minor S3 storage costs but has zero operational impact on running services while providing vital audit records.",
      execution_tag: "SAFE_AUTOMATABLE",
      rollback_guidance: "Stop logging or delete the CloudTrail trail configuration.",
      compliance_tags: ["ISO27001-A.12.4.1", "SOC2-CC7.2", "CIS-AWS-3.1", "PCI-DSS-10.1"],
    });
  }

  return findings;
}

// Calculate risk score based on findings
function calculateRiskScore(findings: Finding[]): number {
  let score = 0;
  
  for (const finding of findings) {
    score += finding.risk_score_contribution;
  }

  // Cap at 100
  return Math.min(100, score);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    // Validate authentication using getClaims or service role key
    let authResult;
    try {
      authResult = await validateAuth(req);
    } catch (authError) {
      console.error('Authentication failed:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`Authenticated request - service role: ${authResult.isServiceRole}`);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate request body with zod schema
    let validatedBody: ScanRequest;
    try {
      const rawBody = await req.json();
      validatedBody = ScanRequestSchema.parse(rawBody);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return new Response(JSON.stringify({ 
          error: 'Invalid request', 
          details: validationError.errors.map(e => ({ path: e.path.join('.'), message: e.message }))
        }), {
          status: 400,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
        });
      }
      throw validationError;
    }
    
    const { aws_account_id, scan_job_id, services } = validatedBody;

    // Authorization: the account must belong to the caller's organization
    try {
      await assertAwsAccountAccess(supabaseClient, authResult, aws_account_id);
    } catch (authError) {
      console.error('Authorization failed:', authError);
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    console.log(`Starting scan for account ${aws_account_id}, job ${scan_job_id}, services: ${services.join(', ')}`);

    const { data: account, error: accountError } = await supabaseClient
      .from('aws_accounts')
      .select('*')
      .eq('id', aws_account_id)
      .single();

    if (accountError || !account) {
      throw new Error(`AWS account not found: ${accountError?.message}`);
    }

    if (!account.role_arn) {
      throw new Error("AWS account has no role ARN configured");
    }

    await supabaseClient
      .from('scan_jobs')
      .update({ 
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .eq('id', scan_job_id);

    console.log(`Assuming role ${account.role_arn} with external ID ${account.external_id}`);
    const credentials = await assumeCustomerRole(account.role_arn, account.external_id);
    console.log("Successfully assumed customer role");

    const allFindings: Finding[] = [];
    const scannedServices: string[] = [];

    if (services.includes('security_groups')) {
      console.log('Scanning Security Groups...');
      try {
        const sgFindings = await scanSecurityGroups(credentials, aws_account_id, scan_job_id, account.account_id);
        allFindings.push(...sgFindings);
        scannedServices.push('security_groups');
        console.log(`Found ${sgFindings.length} Security Group findings`);
      } catch (err) {
        console.error("Security Groups scan failed:", err);
      }
    }

    if (services.includes('iam')) {
      console.log('Scanning IAM...');
      try {
        const iamFindings = await scanIAM(credentials, aws_account_id, scan_job_id, account.account_id, account.account_alias);
        allFindings.push(...iamFindings);
        scannedServices.push('iam');
        console.log(`Found ${iamFindings.length} IAM findings`);
      } catch (err) {
        console.error("IAM scan failed:", err);
      }
    }

    if (services.includes('security_groups') || services.includes('ec2')) {
      console.log('Scanning EC2 Public IPs...');
      try {
        const ec2Findings = await scanEC2PublicIPs(credentials, aws_account_id, scan_job_id, allFindings);
        allFindings.push(...ec2Findings);
        if (!scannedServices.includes('ec2')) scannedServices.push('ec2');
        console.log(`Found ${ec2Findings.length} EC2 Public IP findings`);
      } catch (err) {
        console.error("EC2 Public IP scan failed:", err);
      }
    }

    if (services.includes('security_groups') || services.includes('rds')) {
      console.log('Scanning RDS instances...');
      try {
        const rdsFindings = await scanRDSInstances(credentials, aws_account_id, scan_job_id);
        allFindings.push(...rdsFindings);
        if (!scannedServices.includes('rds')) scannedServices.push('rds');
        console.log(`Found ${rdsFindings.length} RDS findings`);
      } catch (err) {
        console.error("RDS scan failed:", err);
      }
    }

    if (services.includes('security_groups') || services.includes('iam') || services.includes('cloudtrail') || services.includes('vpc')) {
      console.log('Scanning CloudTrail Logging...');
      try {
        const ctFindings = await scanCloudTrailLogging(credentials, aws_account_id, scan_job_id, account.account_id);
        allFindings.push(...ctFindings);
        if (!scannedServices.includes('cloudtrail')) scannedServices.push('cloudtrail');
        console.log(`Found ${ctFindings.length} CloudTrail findings`);
      } catch (err) {
        console.error("CloudTrail scan failed:", err);
      }
    }

    // Delete previous unresolved findings for this account
    await supabaseClient
      .from('security_findings')
      .delete()
      .eq('aws_account_id', aws_account_id)
      .eq('is_resolved', false);

    // Insert new findings with enhanced analysis
    if (allFindings.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('security_findings')
        .insert(allFindings.map(f => ({
          aws_account_id: f.aws_account_id,
          scan_job_id: f.scan_job_id,
          service: f.service,
          severity: f.severity,
          title: f.title,
          description: f.description,
          resource_id: f.resource_id,
          resource_type: f.resource_type,
          remediation_steps: f.remediation_steps,
          cloudformation_template: f.cloudformation_template,
          risk_score_contribution: f.risk_score_contribution,
          impact_assessment: f.impact_assessment,
          execution_tag: f.execution_tag,
          rollback_guidance: f.rollback_guidance,
          compliance_tags: f.compliance_tags,
        })));

      if (insertError) {
        console.error('Error inserting findings:', insertError);
        throw insertError;
      }
    }

    const riskScore = calculateRiskScore(allFindings);

    await supabaseClient
      .from('scan_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        findings_count: allFindings.length,
        risk_score: riskScore,
        services_scanned: scannedServices,
      })
      .eq('id', scan_job_id);

    await supabaseClient
      .from('aws_accounts')
      .update({
        last_scan_at: new Date().toISOString(),
        risk_score: riskScore,
      })
      .eq('id', aws_account_id);

    await supabaseClient
      .from('risk_score_history')
      .insert({
        aws_account_id,
        score: riskScore,
      });

    console.log(`Scan completed. Found ${allFindings.length} findings. Risk score: ${riskScore}`);

    return new Response(JSON.stringify({
      success: true,
      findings_count: allFindings.length,
      risk_score: riskScore,
      services_scanned: scannedServices,
    }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Scan error:', errorMessage);

    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const body = await req.clone().json().catch(() => ({}));
      if (body.scan_job_id) {
        await supabaseClient
          .from('scan_jobs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: errorMessage,
          })
          .eq('id', body.scan_job_id);
      }
    } catch (e) {
      console.error('Failed to update scan job with error:', e);
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
