/**
 * AWS Execution Plan Generator for SME Cloud Guard
 * 
 * Generates SAFE, REVERSIBLE execution plans for approved security recommendations.
 * This is a dry-run plan only - no actual execution occurs.
 */

export interface ExecutionStep {
  step_order: number;
  aws_api: string;
  parameters: Record<string, unknown>;
  description: string;
}

export interface ExecutionPlan {
  service: string;
  resource_id: string;
  finding_title: string;
  pre_checks: string[];
  execution_steps: ExecutionStep[];
  rollback_steps: ExecutionStep[];
  post_checks: string[];
  estimated_risk: 'LOW' | 'MEDIUM';
  plan_generated_at: string;
  is_safe: boolean;
  denial_reason?: string;
}

interface FindingInput {
  title: string;
  service: string;
  resource_id: string;
  resource_type: string;
  severity: string;
  execution_tag?: string | null;
  remediation_steps?: string[] | null;
  rollback_guidance?: string | null;
}

/**
 * Generate a safe execution plan for a security finding
 * Returns null if a safe plan cannot be created
 */
export function generateExecutionPlan(finding: FindingInput): ExecutionPlan | null {
  // Only generate plans for SAFE_AUTOMATABLE findings
  if (finding.execution_tag !== 'SAFE_AUTOMATABLE') {
    return {
      service: finding.service,
      resource_id: finding.resource_id,
      finding_title: finding.title,
      pre_checks: [],
      execution_steps: [],
      rollback_steps: [],
      post_checks: [],
      estimated_risk: 'MEDIUM',
      plan_generated_at: new Date().toISOString(),
      is_safe: false,
      denial_reason: `Cannot generate execution plan: Finding is marked as ${finding.execution_tag || 'UNKNOWN'}. Only SAFE_AUTOMATABLE findings are eligible for automated execution plans.`,
    };
  }

  // Generate service-specific execution plans
  const plan = generateServicePlan(finding);
  
  if (!plan) {
    return {
      service: finding.service,
      resource_id: finding.resource_id,
      finding_title: finding.title,
      pre_checks: [],
      execution_steps: [],
      rollback_steps: [],
      post_checks: [],
      estimated_risk: 'MEDIUM',
      plan_generated_at: new Date().toISOString(),
      is_safe: false,
      denial_reason: 'Cannot generate a safe, reversible execution plan for this finding type.',
    };
  }

  return plan;
}

function generateServicePlan(finding: FindingInput): ExecutionPlan | null {
  const basePlan: Partial<ExecutionPlan> = {
    service: finding.service,
    resource_id: finding.resource_id,
    finding_title: finding.title,
    plan_generated_at: new Date().toISOString(),
    is_safe: true,
  };

  switch (finding.service) {
    case 'security_groups':
      return generateSecurityGroupPlan(finding, basePlan);
    case 'iam':
      return generateIAMPlan(finding, basePlan);
    case 's3':
      return generateS3Plan(finding, basePlan);
    case 'ec2':
      return generateEC2Plan(finding, basePlan);
    case 'rds':
      return generateRDSPlan(finding, basePlan);
    case 'vpc':
      return generateVPCPlan(finding, basePlan);
    default:
      return null;
  }
}

function generateSecurityGroupPlan(finding: FindingInput, base: Partial<ExecutionPlan>): ExecutionPlan {
  const title = finding.title.toLowerCase();
  
  // SSH open to world (port 22)
  if (title.includes('ssh') || title.includes('port 22')) {
    return {
      ...base,
      pre_checks: [
        'Verify security group exists and is accessible',
        'Identify current inbound rules for port 22',
        'Confirm no active SSH sessions will be disrupted',
        'Document current rule configuration for rollback',
      ],
      execution_steps: [
        {
          step_order: 1,
          aws_api: 'ec2:DescribeSecurityGroups',
          parameters: { GroupIds: [finding.resource_id] },
          description: 'Retrieve current security group configuration',
        },
        {
          step_order: 2,
          aws_api: 'ec2:RevokeSecurityGroupIngress',
          parameters: {
            GroupId: finding.resource_id,
            IpPermissions: [{
              IpProtocol: 'tcp',
              FromPort: 22,
              ToPort: 22,
              IpRanges: [{ CidrIp: '0.0.0.0/0' }],
            }],
          },
          description: 'Remove unrestricted SSH access (0.0.0.0/0)',
        },
        {
          step_order: 3,
          aws_api: 'ec2:AuthorizeSecurityGroupIngress',
          parameters: {
            GroupId: finding.resource_id,
            IpPermissions: [{
              IpProtocol: 'tcp',
              FromPort: 22,
              ToPort: 22,
              IpRanges: [{ CidrIp: '<YOUR_OFFICE_IP>/32', Description: 'Office IP only' }],
            }],
          },
          description: 'Add restricted SSH access from known IP range',
        },
      ],
      rollback_steps: [
        {
          step_order: 1,
          aws_api: 'ec2:RevokeSecurityGroupIngress',
          parameters: {
            GroupId: finding.resource_id,
            IpPermissions: [{
              IpProtocol: 'tcp',
              FromPort: 22,
              ToPort: 22,
              IpRanges: [{ CidrIp: '<YOUR_OFFICE_IP>/32' }],
            }],
          },
          description: 'Remove the restricted rule',
        },
        {
          step_order: 2,
          aws_api: 'ec2:AuthorizeSecurityGroupIngress',
          parameters: {
            GroupId: finding.resource_id,
            IpPermissions: [{
              IpProtocol: 'tcp',
              FromPort: 22,
              ToPort: 22,
              IpRanges: [{ CidrIp: '0.0.0.0/0' }],
            }],
          },
          description: 'Restore original unrestricted rule (if needed)',
        },
      ],
      post_checks: [
        'Verify SSH access works from authorized IPs',
        'Confirm 0.0.0.0/0 rule is removed',
        'Test that unauthorized IPs are blocked',
      ],
      estimated_risk: 'LOW',
    } as ExecutionPlan;
  }

  // RDP open to world (port 3389)
  if (title.includes('rdp') || title.includes('port 3389')) {
    return {
      ...base,
      pre_checks: [
        'Verify security group exists and is accessible',
        'Identify current inbound rules for port 3389',
        'Confirm no active RDP sessions will be disrupted',
        'Document current rule configuration for rollback',
      ],
      execution_steps: [
        {
          step_order: 1,
          aws_api: 'ec2:DescribeSecurityGroups',
          parameters: { GroupIds: [finding.resource_id] },
          description: 'Retrieve current security group configuration',
        },
        {
          step_order: 2,
          aws_api: 'ec2:RevokeSecurityGroupIngress',
          parameters: {
            GroupId: finding.resource_id,
            IpPermissions: [{
              IpProtocol: 'tcp',
              FromPort: 3389,
              ToPort: 3389,
              IpRanges: [{ CidrIp: '0.0.0.0/0' }],
            }],
          },
          description: 'Remove unrestricted RDP access (0.0.0.0/0)',
        },
      ],
      rollback_steps: [
        {
          step_order: 1,
          aws_api: 'ec2:AuthorizeSecurityGroupIngress',
          parameters: {
            GroupId: finding.resource_id,
            IpPermissions: [{
              IpProtocol: 'tcp',
              FromPort: 3389,
              ToPort: 3389,
              IpRanges: [{ CidrIp: '0.0.0.0/0' }],
            }],
          },
          description: 'Restore original unrestricted rule (if needed)',
        },
      ],
      post_checks: [
        'Confirm 0.0.0.0/0 rule is removed for port 3389',
        'Verify RDP access works from VPN or authorized networks',
      ],
      estimated_risk: 'LOW',
    } as ExecutionPlan;
  }

  // Generic overly permissive rule
  return {
    ...base,
    pre_checks: [
      'Verify security group exists',
      'Document all current inbound/outbound rules',
      'Identify resources using this security group',
    ],
    execution_steps: [
      {
        step_order: 1,
        aws_api: 'ec2:DescribeSecurityGroups',
        parameters: { GroupIds: [finding.resource_id] },
        description: 'Retrieve current security group configuration',
      },
    ],
    rollback_steps: [],
    post_checks: [
      'Review security group rules manually',
      'Apply changes through AWS Console with caution',
    ],
    estimated_risk: 'MEDIUM',
    is_safe: false,
    denial_reason: 'Generic security group finding requires manual review to determine safe remediation steps.',
  } as ExecutionPlan;
}

function generateIAMPlan(finding: FindingInput, base: Partial<ExecutionPlan>): ExecutionPlan {
  const title = finding.title.toLowerCase();

  // Unused access keys
  if (title.includes('unused') && title.includes('access key')) {
    return {
      ...base,
      pre_checks: [
        'Verify the access key exists and identify the user',
        'Confirm key has not been used recently (90+ days)',
        'Check if any applications depend on this key',
        'Document key metadata for rollback',
      ],
      execution_steps: [
        {
          step_order: 1,
          aws_api: 'iam:GetAccessKeyLastUsed',
          parameters: { AccessKeyId: finding.resource_id },
          description: 'Verify key usage status before deactivation',
        },
        {
          step_order: 2,
          aws_api: 'iam:UpdateAccessKey',
          parameters: {
            AccessKeyId: finding.resource_id,
            Status: 'Inactive',
          },
          description: 'Deactivate (not delete) the unused access key',
        },
      ],
      rollback_steps: [
        {
          step_order: 1,
          aws_api: 'iam:UpdateAccessKey',
          parameters: {
            AccessKeyId: finding.resource_id,
            Status: 'Active',
          },
          description: 'Reactivate the access key if needed',
        },
      ],
      post_checks: [
        'Verify key status is now Inactive',
        'Monitor for any application failures',
        'Schedule key deletion after 7-day observation period',
      ],
      estimated_risk: 'LOW',
    } as ExecutionPlan;
  }

  // MFA not enabled
  if (title.includes('mfa') && title.includes('not enabled')) {
    return {
      ...base,
      pre_checks: [
        'Verify user exists and is active',
        'Check if user has console access',
        'Prepare MFA device or virtual authenticator',
      ],
      execution_steps: [],
      rollback_steps: [],
      post_checks: [],
      estimated_risk: 'LOW',
      is_safe: false,
      denial_reason: 'MFA enrollment requires user interaction and cannot be automated. User must enable MFA through AWS Console or CLI.',
    } as ExecutionPlan;
  }

  // Overly permissive policies
  if (title.includes('admin') || title.includes('permissive') || title.includes('*:*')) {
    return {
      ...base,
      pre_checks: [
        'Identify all users/roles using this policy',
        'Document current policy permissions',
        'Assess impact of restricting permissions',
      ],
      execution_steps: [],
      rollback_steps: [],
      post_checks: [],
      estimated_risk: 'MEDIUM',
      is_safe: false,
      denial_reason: 'Policy modification requires careful analysis of permission dependencies. Manual review required to prevent access disruption.',
    } as ExecutionPlan;
  }

  return {
    ...base,
    pre_checks: ['Review IAM finding manually'],
    execution_steps: [],
    rollback_steps: [],
    post_checks: [],
    estimated_risk: 'MEDIUM',
    is_safe: false,
    denial_reason: 'IAM changes require manual review to prevent access disruption.',
  } as ExecutionPlan;
}

function generateS3Plan(finding: FindingInput, base: Partial<ExecutionPlan>): ExecutionPlan {
  const title = finding.title.toLowerCase();

  // Public bucket
  if (title.includes('public') || title.includes('public access')) {
    return {
      ...base,
      pre_checks: [
        'Verify bucket exists and is accessible',
        'Check if bucket hosts public content intentionally',
        'Document current bucket policy and ACLs',
        'Identify any public-facing applications using this bucket',
      ],
      execution_steps: [
        {
          step_order: 1,
          aws_api: 's3:GetBucketAcl',
          parameters: { Bucket: finding.resource_id },
          description: 'Retrieve current bucket ACL',
        },
        {
          step_order: 2,
          aws_api: 's3:PutPublicAccessBlock',
          parameters: {
            Bucket: finding.resource_id,
            PublicAccessBlockConfiguration: {
              BlockPublicAcls: true,
              IgnorePublicAcls: true,
              BlockPublicPolicy: true,
              RestrictPublicBuckets: true,
            },
          },
          description: 'Enable S3 Block Public Access settings',
        },
      ],
      rollback_steps: [
        {
          step_order: 1,
          aws_api: 's3:PutPublicAccessBlock',
          parameters: {
            Bucket: finding.resource_id,
            PublicAccessBlockConfiguration: {
              BlockPublicAcls: false,
              IgnorePublicAcls: false,
              BlockPublicPolicy: false,
              RestrictPublicBuckets: false,
            },
          },
          description: 'Disable S3 Block Public Access (restore previous state)',
        },
      ],
      post_checks: [
        'Verify Block Public Access is enabled',
        'Test that public access is denied',
        'Confirm authorized access still works',
      ],
      estimated_risk: 'LOW',
    } as ExecutionPlan;
  }

  return {
    ...base,
    pre_checks: ['Review S3 finding manually'],
    execution_steps: [],
    rollback_steps: [],
    post_checks: [],
    estimated_risk: 'MEDIUM',
    is_safe: false,
    denial_reason: 'S3 configuration changes require manual review.',
  } as ExecutionPlan;
}

function generateEC2Plan(finding: FindingInput, base: Partial<ExecutionPlan>): ExecutionPlan {
  return {
    ...base,
    pre_checks: ['Review EC2 finding manually'],
    execution_steps: [],
    rollback_steps: [],
    post_checks: [],
    estimated_risk: 'MEDIUM',
    is_safe: false,
    denial_reason: 'EC2 instance changes may cause downtime. Manual review required.',
  } as ExecutionPlan;
}

function generateRDSPlan(finding: FindingInput, base: Partial<ExecutionPlan>): ExecutionPlan {
  const title = finding.title.toLowerCase();

  // Public accessibility
  if (title.includes('public') || title.includes('publicly accessible')) {
    return {
      ...base,
      pre_checks: [
        'Verify RDS instance exists and status is available',
        'Check if any applications connect via public endpoint',
        'Document current network configuration',
        'Ensure VPC connectivity is properly configured',
      ],
      execution_steps: [
        {
          step_order: 1,
          aws_api: 'rds:DescribeDBInstances',
          parameters: { DBInstanceIdentifier: finding.resource_id },
          description: 'Retrieve current RDS configuration',
        },
        {
          step_order: 2,
          aws_api: 'rds:ModifyDBInstance',
          parameters: {
            DBInstanceIdentifier: finding.resource_id,
            PubliclyAccessible: false,
            ApplyImmediately: false,
          },
          description: 'Disable public accessibility (applies during maintenance window)',
        },
      ],
      rollback_steps: [
        {
          step_order: 1,
          aws_api: 'rds:ModifyDBInstance',
          parameters: {
            DBInstanceIdentifier: finding.resource_id,
            PubliclyAccessible: true,
            ApplyImmediately: false,
          },
          description: 'Re-enable public accessibility if needed',
        },
      ],
      post_checks: [
        'Verify PubliclyAccessible is set to false',
        'Test application connectivity via VPC',
        'Confirm no public endpoint is accessible',
      ],
      estimated_risk: 'MEDIUM',
    } as ExecutionPlan;
  }

  return {
    ...base,
    pre_checks: ['Review RDS finding manually'],
    execution_steps: [],
    rollback_steps: [],
    post_checks: [],
    estimated_risk: 'MEDIUM',
    is_safe: false,
    denial_reason: 'RDS changes may affect database availability. Manual review required.',
  } as ExecutionPlan;
}

function generateVPCPlan(finding: FindingInput, base: Partial<ExecutionPlan>): ExecutionPlan {
  return {
    ...base,
    pre_checks: ['Review VPC finding manually'],
    execution_steps: [],
    rollback_steps: [],
    post_checks: [],
    estimated_risk: 'MEDIUM',
    is_safe: false,
    denial_reason: 'VPC network changes may disrupt connectivity. Manual review required.',
  } as ExecutionPlan;
}
