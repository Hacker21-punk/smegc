import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { STSClient, AssumeRoleCommand } from "https://esm.sh/@aws-sdk/client-sts@3.525.0";
import { EC2Client, DescribeSecurityGroupsCommand } from "https://esm.sh/@aws-sdk/client-ec2@3.525.0";
import { IAMClient, ListUsersCommand, ListAccessKeysCommand, GetLoginProfileCommand, ListMFADevicesCommand, ListAttachedUserPoliciesCommand, ListUserPoliciesCommand, GetAccessKeyLastUsedCommand } from "https://esm.sh/@aws-sdk/client-iam@3.525.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScanRequest {
  aws_account_id: string;
  scan_job_id: string;
  services: string[];
}

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
}

// Assume the customer's IAM role
async function assumeCustomerRole(roleArn: string, externalId: string) {
  const stsClient = new STSClient({ region: "us-east-1" });
  
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
  const regions = ["us-east-1", "us-west-2", "eu-west-1", "ap-south-1"]; // Scan major regions
  
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
        // Check inbound rules for dangerous patterns
        for (const rule of sg.IpPermissions || []) {
          const hasOpenIPv4 = rule.IpRanges?.some(r => r.CidrIp === "0.0.0.0/0");
          const hasOpenIPv6 = rule.Ipv6Ranges?.some(r => r.CidrIpv6 === "::/0");
          
          if (hasOpenIPv4 || hasOpenIPv6) {
            const port = rule.FromPort === rule.ToPort ? `${rule.FromPort}` : `${rule.FromPort}-${rule.ToPort}`;
            const protocol = rule.IpProtocol === "-1" ? "all traffic" : rule.IpProtocol;
            
            // Critical: SSH/RDP open to internet
            if (rule.FromPort === 22 || (rule.FromPort && rule.FromPort <= 22 && rule.ToPort && rule.ToPort >= 22)) {
              findings.push({
                aws_account_id: awsAccountId,
                scan_job_id: scanJobId,
                service: "security_groups",
                severity: "critical",
                title: `SSH (port 22) open to the internet`,
                description: `Security group "${sg.GroupName}" (${sg.GroupId}) in ${region} allows SSH access from anywhere (0.0.0.0/0). This exposes your servers to brute-force attacks and should be restricted immediately.`,
                resource_id: sg.GroupId!,
                resource_type: "Security Group",
                remediation_steps: [
                  "Go to EC2 Console → Security Groups → Select this security group",
                  "Edit inbound rules → Remove the 0.0.0.0/0 SSH rule",
                  "Add a rule allowing SSH only from your trusted IP (e.g., your office IP)",
                  "Consider using AWS Systems Manager Session Manager instead of SSH",
                ],
                cloudformation_template: generateSGRemediationTemplate(sg.GroupId!, 22, region),
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
                description: `Security group "${sg.GroupName}" (${sg.GroupId}) in ${region} allows RDP access from anywhere. Windows servers are at high risk of ransomware attacks.`,
                resource_id: sg.GroupId!,
                resource_type: "Security Group",
                remediation_steps: [
                  "Immediately restrict RDP access to known IP addresses",
                  "Enable Network Level Authentication (NLA) on Windows servers",
                  "Consider using AWS Systems Manager Fleet Manager for remote access",
                  "Implement a VPN or bastion host for remote administration",
                ],
                cloudformation_template: generateSGRemediationTemplate(sg.GroupId!, 3389, region),
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
                  description: `Security group "${sg.GroupName}" (${sg.GroupId}) in ${region} allows ${dbNames[dbPort]} database access from anywhere. Databases should never be directly accessible from the internet.`,
                  resource_id: sg.GroupId!,
                  resource_type: "Security Group",
                  remediation_steps: [
                    "Remove public access to database ports immediately",
                    "Allow access only from application security groups",
                    "Use VPC endpoints or AWS PrivateLink for service connectivity",
                    "Enable encryption in transit (SSL/TLS) for database connections",
                  ],
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
                description: `Security group "${sg.GroupName}" (${sg.GroupId}) in ${region} allows ALL inbound traffic from 0.0.0.0/0. This is extremely dangerous and defeats the purpose of having a security group.`,
                resource_id: sg.GroupId!,
                resource_type: "Security Group",
                remediation_steps: [
                  "Review all services running on associated instances",
                  "Create specific rules for only the required ports",
                  "Remove the 0.0.0.0/0 all-traffic rule",
                  "Follow the principle of least privilege",
                ],
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
            description: `The default security group in VPC ${sg.VpcId} (${region}) has been modified with custom rules. AWS best practice is to keep default security groups empty.`,
            resource_id: sg.GroupId!,
            resource_type: "Security Group",
            remediation_steps: [
              "Create dedicated security groups for your workloads",
              "Migrate resources to use the new security groups",
              "Remove all custom rules from the default security group",
              "Keep the default security group as a catch-all with no rules",
            ],
          });
        }
      }
    } catch (err) {
      console.log(`Failed to scan security groups in ${region}:`, err);
      // Continue with other regions
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
  const accountName = accountAlias || customerAccountId;
  
  try {
    const iamClient = new IAMClient({
      region: "us-east-1",
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      },
    });
    
    // List all IAM users
    const listUsersCommand = new ListUsersCommand({});
    const usersResponse = await iamClient.send(listUsersCommand);
    
    for (const user of usersResponse.Users || []) {
      const userName = user.UserName!;
      const userArn = user.Arn!;
      
      // Check for console access without MFA
      try {
        await iamClient.send(new GetLoginProfileCommand({ UserName: userName }));
        // User has console access, check for MFA
        const mfaResponse = await iamClient.send(new ListMFADevicesCommand({ UserName: userName }));
        
        if (!mfaResponse.MFADevices || mfaResponse.MFADevices.length === 0) {
          findings.push({
            aws_account_id: awsAccountId,
            scan_job_id: scanJobId,
            service: "iam",
            severity: "high",
            title: `IAM user "${userName}" has console access without MFA`,
            description: `User ${userName} can log into the AWS Console but has no MFA device configured. If their password is compromised, attackers will have full access to their permissions.`,
            resource_id: userArn,
            resource_type: "IAM User",
            remediation_steps: [
              `Go to IAM Console → Users → ${userName} → Security credentials`,
              "Click 'Assign MFA device'",
              "Choose 'Virtual MFA device' (recommended: Google Authenticator, Authy)",
              "Scan the QR code and enter two consecutive codes to confirm",
              "Consider enforcing MFA via IAM policy for all console users",
            ],
          });
        }
      } catch {
        // No console access - that's fine
      }
      
      // Check attached managed policies for overly permissive access
      const attachedPoliciesResponse = await iamClient.send(new ListAttachedUserPoliciesCommand({ UserName: userName }));
      
      for (const policy of attachedPoliciesResponse.AttachedPolicies || []) {
        const dangerousPolicies = [
          "AdministratorAccess",
          "PowerUserAccess",
          "IAMFullAccess",
        ];
        
        if (dangerousPolicies.includes(policy.PolicyName!)) {
          findings.push({
            aws_account_id: awsAccountId,
            scan_job_id: scanJobId,
            service: "iam",
            severity: policy.PolicyName === "AdministratorAccess" ? "critical" : "high",
            title: `User "${userName}" has ${policy.PolicyName} attached`,
            description: `IAM user ${userName} has the ${policy.PolicyName} managed policy attached. This grants excessive permissions and violates the principle of least privilege.`,
            resource_id: userArn,
            resource_type: "IAM User",
            remediation_steps: [
              "Audit what this user actually needs access to",
              "Create a custom policy with only required permissions",
              `Detach ${policy.PolicyName} from the user`,
              "Attach the new custom policy instead",
              "Use IAM Access Analyzer to identify unused permissions",
            ],
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
          description: `IAM user ${userName} has ${inlinePoliciesResponse.PolicyNames.length} inline policy(ies) attached. Inline policies are harder to manage, audit, and reuse compared to managed policies.`,
          resource_id: userArn,
          resource_type: "IAM User",
          remediation_steps: [
            "Review the inline policies attached to this user",
            "Create equivalent customer-managed policies",
            "Attach the managed policies to the user",
            "Delete the inline policies",
            "Use AWS Organizations SCPs for organization-wide guardrails",
          ],
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
            description: `Access key ${accessKey.AccessKeyId} was created ${keyAge} days ago. AWS recommends rotating access keys every 90 days to limit the blast radius of compromised credentials.`,
            resource_id: userArn,
            resource_type: "IAM Access Key",
            remediation_steps: [
              "Create a new access key for this user",
              "Update all applications using the old key",
              "Test that everything works with the new key",
              "Deactivate the old access key",
              "After confirming no issues, delete the old key",
              "Consider using IAM Roles instead of long-term access keys",
            ],
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
                description: `Access key ${accessKey.AccessKeyId} has not been used for ${daysSinceUsed} days. Unused credentials pose a security risk and may indicate a key that was leaked or is no longer needed.`,
                resource_id: userArn,
                resource_type: "IAM Access Key",
                remediation_steps: [
                  "Verify if this access key is still required",
                  "Contact the key owner to confirm usage",
                  "If not needed, deactivate the key immediately",
                  "After 30 days of deactivation with no issues, delete the key",
                  "Consider implementing automated key rotation",
                ],
              });
            }
          } else if (!lastUsedResponse.AccessKeyLastUsed?.LastUsedDate && keyAge > 30) {
            // Key was never used
            findings.push({
              aws_account_id: awsAccountId,
              scan_job_id: scanJobId,
              service: "iam",
              severity: "medium",
              title: `Access key for "${userName}" was never used`,
              description: `Access key ${accessKey.AccessKeyId} was created ${keyAge} days ago but has never been used. This could indicate a forgotten key that poses a security risk.`,
              resource_id: userArn,
              resource_type: "IAM Access Key",
              remediation_steps: [
                "Investigate why this key was created",
                "If it was created for testing, delete it",
                "If still needed, use it or delete it",
                "Consider creating keys only when immediately needed",
              ],
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
            description: `IAM user ${userName} has ${activeKeys.length} active access keys. While sometimes needed for key rotation, having multiple active keys increases the attack surface.`,
            resource_id: userArn,
            resource_type: "IAM User",
            remediation_steps: [
              "Review which applications use each access key",
              "Consolidate to a single access key where possible",
              "Deactivate and delete unused keys",
              "Implement proper key rotation procedures",
            ],
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

// Calculate risk score based on findings
function calculateRiskScore(findings: Finding[]): number {
  let score = 0;
  
  for (const finding of findings) {
    switch (finding.severity) {
      case "critical":
        score += 25;
        break;
      case "high":
        score += 15;
        break;
      case "medium":
        score += 8;
        break;
      case "low":
        score += 3;
        break;
      case "info":
        score += 1;
        break;
    }
  }

  // Cap at 100
  return Math.min(100, score);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { aws_account_id, scan_job_id, services }: ScanRequest = await req.json();

    console.log(`Starting scan for account ${aws_account_id}, job ${scan_job_id}, services: ${services.join(', ')}`);

    // Get the AWS account details
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

    // Update scan job to running
    await supabaseClient
      .from('scan_jobs')
      .update({ 
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .eq('id', scan_job_id);

    // Assume the customer's IAM role
    console.log(`Assuming role ${account.role_arn} with external ID ${account.external_id}`);
    const credentials = await assumeCustomerRole(account.role_arn, account.external_id);
    console.log("Successfully assumed customer role");

    const allFindings: Finding[] = [];
    const scannedServices: string[] = [];

    // Scan Security Groups
    if (services.includes('security_groups')) {
      console.log('Scanning Security Groups...');
      try {
        const sgFindings = await scanSecurityGroups(credentials, aws_account_id, scan_job_id, account.account_id);
        allFindings.push(...sgFindings);
        scannedServices.push('security_groups');
        console.log(`Found ${sgFindings.length} Security Group findings`);
      } catch (err) {
        console.error("Security Groups scan failed:", err);
        // Continue with other services
      }
    }

    // Scan IAM
    if (services.includes('iam')) {
      console.log('Scanning IAM...');
      try {
        const iamFindings = await scanIAM(credentials, aws_account_id, scan_job_id, account.account_id, account.account_alias);
        allFindings.push(...iamFindings);
        scannedServices.push('iam');
        console.log(`Found ${iamFindings.length} IAM findings`);
      } catch (err) {
        console.error("IAM scan failed:", err);
        // Continue
      }
    }

    // Delete previous findings for this account (to avoid duplicates)
    await supabaseClient
      .from('security_findings')
      .delete()
      .eq('aws_account_id', aws_account_id)
      .eq('is_resolved', false);

    // Insert new findings
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
        })));

      if (insertError) {
        console.error('Error inserting findings:', insertError);
        throw insertError;
      }
    }

    // Calculate risk score
    const riskScore = calculateRiskScore(allFindings);

    // Update scan job with results
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

    // Update AWS account with latest scan info
    await supabaseClient
      .from('aws_accounts')
      .update({
        last_scan_at: new Date().toISOString(),
        risk_score: riskScore,
      })
      .eq('id', aws_account_id);

    // Record risk score history
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
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Scan error:', errorMessage);

    // Try to update scan job with error
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
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
