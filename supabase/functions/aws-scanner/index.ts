import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

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
}

// Simulate Security Groups scan with sample findings
function generateSecurityGroupsFindings(awsAccountId: string, scanJobId: string, accountInfo: { account_id: string }): Finding[] {
  // In production, this would use real AWS API calls via IAM role assumption
  // For demo, return realistic sample findings based on the account
  return [
    {
      aws_account_id: awsAccountId,
      scan_job_id: scanJobId,
      service: "security_groups",
      severity: "critical",
      title: "Security Group allows unrestricted SSH access",
      description: `Security group sg-${accountInfo.account_id.slice(0, 8)} allows inbound SSH (port 22) traffic from 0.0.0.0/0 (anywhere). This exposes servers to brute-force attacks from the internet.`,
      resource_id: `sg-${accountInfo.account_id.slice(0, 8)}`,
      resource_type: "Security Group",
      remediation_steps: [
        "Restrict the source IP range to only trusted IPs or your office CIDR block",
        "Use AWS Systems Manager Session Manager as a secure alternative to SSH",
        "Implement a bastion host in a private subnet if remote access is required",
      ],
    },
    {
      aws_account_id: awsAccountId,
      scan_job_id: scanJobId,
      service: "security_groups",
      severity: "high",
      title: "Security Group allows unrestricted database port access",
      description: `Security group sg-db-${accountInfo.account_id.slice(4, 10)} allows inbound MySQL (port 3306) traffic from 0.0.0.0/0. Database servers should never be directly accessible from the internet.`,
      resource_id: `sg-db-${accountInfo.account_id.slice(4, 10)}`,
      resource_type: "Security Group",
      remediation_steps: [
        "Restrict database access to application security groups only",
        "Use VPC endpoints for AWS services that need database access",
        "Consider using RDS Proxy for connection management",
      ],
    },
    {
      aws_account_id: awsAccountId,
      scan_job_id: scanJobId,
      service: "security_groups",
      severity: "medium",
      title: "Default security group has custom rules",
      description: "The default security group has been modified with custom rules. AWS best practice is to keep default security groups empty.",
      resource_id: "sg-default",
      resource_type: "Security Group",
      remediation_steps: [
        "Remove all custom rules from the default security group",
        "Create dedicated security groups for your workloads",
        "Associate resources with the new custom security groups",
      ],
    },
  ];
}

// Simulate IAM scan with sample findings
function generateIAMFindings(awsAccountId: string, scanJobId: string, accountInfo: { account_id: string; account_alias: string | null }): Finding[] {
  const accountName = accountInfo.account_alias || accountInfo.account_id;
  
  return [
    {
      aws_account_id: awsAccountId,
      scan_job_id: scanJobId,
      service: "iam",
      severity: "critical",
      title: "IAM user has AdministratorAccess policy attached",
      description: `User admin-user in account ${accountName} has the AdministratorAccess managed policy attached directly. This grants full access to all AWS services and violates the principle of least privilege.`,
      resource_id: `arn:aws:iam::${accountInfo.account_id}:user/admin-user`,
      resource_type: "IAM User",
      remediation_steps: [
        "Create custom IAM policies with only the required permissions",
        "Use IAM roles with temporary credentials instead of long-term access keys",
        "Implement AWS Organizations SCPs for guardrails",
      ],
    },
    {
      aws_account_id: awsAccountId,
      scan_job_id: scanJobId,
      service: "iam",
      severity: "high",
      title: "IAM user without MFA enabled",
      description: `User developer in account ${accountName} has console access but no MFA (Multi-Factor Authentication) enabled. This is a significant security risk.`,
      resource_id: `arn:aws:iam::${accountInfo.account_id}:user/developer`,
      resource_type: "IAM User",
      remediation_steps: [
        "Enable MFA for all IAM users with console access",
        "Use virtual MFA apps like Google Authenticator or Microsoft Authenticator",
        "For privileged users, consider hardware MFA devices (YubiKey)",
      ],
    },
    {
      aws_account_id: awsAccountId,
      scan_job_id: scanJobId,
      service: "iam",
      severity: "high",
      title: "Access key unused for 95 days",
      description: `An access key for user service-account in account ${accountName} has not been used for 95 days. Unused credentials pose a security risk and should be rotated or removed.`,
      resource_id: `arn:aws:iam::${accountInfo.account_id}:user/service-account`,
      resource_type: "IAM Access Key",
      remediation_steps: [
        "Verify if this access key is still needed by the application",
        "If not needed, deactivate and then delete the access key",
        "If needed, rotate the key and update all applications using it",
      ],
    },
    {
      aws_account_id: awsAccountId,
      scan_job_id: scanJobId,
      service: "iam",
      severity: "medium",
      title: "Access key is 180 days old",
      description: `An access key for user ci-deploy in account ${accountName} was created 180 days ago. AWS recommends rotating access keys every 90 days.`,
      resource_id: `arn:aws:iam::${accountInfo.account_id}:user/ci-deploy`,
      resource_type: "IAM Access Key",
      remediation_steps: [
        "Create a new access key for this user",
        "Update CI/CD pipelines to use the new access key",
        "Deactivate and delete the old access key",
        "Consider using OIDC identity provider for GitHub Actions or GitLab CI",
      ],
    },
    {
      aws_account_id: awsAccountId,
      scan_job_id: scanJobId,
      service: "iam",
      severity: "low",
      title: "IAM user has inline policy attached",
      description: `User legacy-app in account ${accountName} has an inline policy attached directly. Managed policies are easier to audit and maintain.`,
      resource_id: `arn:aws:iam::${accountInfo.account_id}:user/legacy-app`,
      resource_type: "IAM User",
      remediation_steps: [
        "Convert inline policies to managed policies",
        "Use customer-managed policies for better version control",
        "Audit and consolidate similar policies",
      ],
    },
  ];
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

    // Update scan job to running
    await supabaseClient
      .from('scan_jobs')
      .update({ 
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .eq('id', scan_job_id);

    const allFindings: Finding[] = [];
    const scannedServices: string[] = [];

    // Generate findings (in production, this would use real AWS API via IAM role assumption)
    // The architecture is ready for real scanning - just replace these functions with actual AWS SDK calls
    
    if (services.includes('security_groups')) {
      console.log('Scanning Security Groups...');
      const sgFindings = generateSecurityGroupsFindings(aws_account_id, scan_job_id, {
        account_id: account.account_id,
      });
      allFindings.push(...sgFindings);
      scannedServices.push('security_groups');
      console.log(`Found ${sgFindings.length} Security Group findings`);
    }

    if (services.includes('iam')) {
      console.log('Scanning IAM...');
      const iamFindings = generateIAMFindings(aws_account_id, scan_job_id, {
        account_id: account.account_id,
        account_alias: account.account_alias,
      });
      allFindings.push(...iamFindings);
      scannedServices.push('iam');
      console.log(`Found ${iamFindings.length} IAM findings`);
    }

    // Insert findings into database
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
