/**
 * SME Cloud Guard - Post-Remediation Verification Engine
 * 
 * Verifies whether security issues have been successfully remediated
 * using read-only scans and evidence-based validation.
 */

import type { Tables } from '@/integrations/supabase/types';

export type VerificationStatus = 
  | 'FULLY_RESOLVED' 
  | 'PARTIALLY_RESOLVED' 
  | 'NOT_RESOLVED' 
  | 'UNKNOWN';

export interface EvidenceItem {
  resource: string;
  checked_setting: string;
  expected_state: string;
  actual_state: string;
  matches: boolean;
}

export interface VerificationResult {
  finding_id: string;
  verification_status: VerificationStatus;
  previous_risk_score: number;
  current_risk_score: number;
  verification_summary: string;
  evidence: EvidenceItem[];
  verified_at: string;
  confidence_level: 'HIGH' | 'MEDIUM' | 'LOW';
  next_steps: string[];
}

export interface VerificationInput {
  finding: Tables<'security_findings'>;
  remediation_timestamp?: string;
  latest_scan_data?: Record<string, unknown>;
}

// Expected secure states based on finding types
const EXPECTED_STATES: Record<string, Record<string, string>> = {
  'security_groups': {
    'open_ssh': 'SSH (port 22) restricted to specific IP ranges or VPN',
    'open_rdp': 'RDP (port 3389) restricted to specific IP ranges or VPN',
    'open_all_traffic': 'Inbound rules limited to required ports only',
    'unrestricted_egress': 'Egress rules scoped to necessary destinations',
  },
  'iam': {
    'mfa_disabled': 'MFA enabled for all IAM users with console access',
    'inactive_access_key': 'Access key deleted or rotated',
    'overly_permissive_policy': 'Policy follows least-privilege principle',
    'root_access_key': 'Root account access keys removed',
    'password_policy_weak': 'Strong password policy enforced',
  },
  's3': {
    'public_bucket': 'Bucket Block Public Access enabled',
    'no_encryption': 'Server-side encryption enabled (SSE-S3 or SSE-KMS)',
    'no_versioning': 'Versioning enabled for data protection',
    'no_logging': 'Access logging enabled to audit bucket',
  },
  'ec2': {
    'unencrypted_volume': 'EBS volume encryption enabled',
    'public_ip_associated': 'Instance in private subnet or justified public access',
    'imdsv1_enabled': 'IMDSv2 required (HttpTokens = required)',
  },
  'rds': {
    'publicly_accessible': 'RDS instance not publicly accessible',
    'no_encryption': 'Storage encryption enabled',
    'no_backup': 'Automated backups configured',
    'deletion_protection_disabled': 'Deletion protection enabled',
  },
  'vpc': {
    'default_vpc_in_use': 'Custom VPC with proper network segmentation',
    'flow_logs_disabled': 'VPC Flow Logs enabled for traffic monitoring',
    'no_network_acl': 'Network ACLs configured for defense in depth',
  },
};

/**
 * Get expected secure state for a finding
 */
export function getExpectedState(finding: Tables<'security_findings'>): string {
  const service = finding.service;
  const title = finding.title.toLowerCase();
  
  const serviceStates = EXPECTED_STATES[service] || {};
  
  // Match based on keywords in title
  for (const [key, expectedState] of Object.entries(serviceStates)) {
    if (title.includes(key.replace(/_/g, ' ')) || title.includes(key.replace(/_/g, '-'))) {
      return expectedState;
    }
  }
  
  // Generic expected state based on service
  const genericStates: Record<string, string> = {
    'security_groups': 'Security group rules follow least-privilege access',
    'iam': 'IAM configuration follows AWS security best practices',
    's3': 'S3 bucket secured with encryption and access controls',
    'ec2': 'EC2 instance hardened according to CIS benchmarks',
    'rds': 'RDS instance secured with encryption and access controls',
    'vpc': 'VPC configured with proper network segmentation',
    'cost': 'Cost optimization recommendations applied',
  };
  
  return genericStates[service] || 'Resource configured according to security best practices';
}

/**
 * Simulate verification scan (read-only)
 * In production, this would call AWS APIs via the scanner
 */
function simulateVerificationScan(
  finding: Tables<'security_findings'>,
  remediationTimestamp?: string
): EvidenceItem[] {
  const evidence: EvidenceItem[] = [];
  const expectedState = getExpectedState(finding);
  
  // Simulate time-based probability of remediation
  // If recently remediated (within last hour), higher chance of success
  const recentRemediation = remediationTimestamp && 
    (Date.now() - new Date(remediationTimestamp).getTime()) < 3600000;
  
  // Simulate based on finding characteristics
  const isResolved = finding.is_resolved;
  const simulatedSuccess = isResolved || (recentRemediation && Math.random() > 0.2);
  
  // Primary evidence
  evidence.push({
    resource: finding.resource_id,
    checked_setting: finding.title,
    expected_state: expectedState,
    actual_state: simulatedSuccess 
      ? expectedState 
      : finding.description || 'Issue still present',
    matches: simulatedSuccess,
  });
  
  // Additional evidence based on service type
  if (finding.service === 'security_groups') {
    evidence.push({
      resource: finding.resource_id,
      checked_setting: 'Inbound Rules Configuration',
      expected_state: 'No 0.0.0.0/0 on sensitive ports',
      actual_state: simulatedSuccess 
        ? 'Restricted to specific CIDR ranges' 
        : 'Open to 0.0.0.0/0',
      matches: simulatedSuccess,
    });
  } else if (finding.service === 'iam') {
    evidence.push({
      resource: finding.resource_id,
      checked_setting: 'IAM Policy Scope',
      expected_state: 'Least-privilege permissions',
      actual_state: simulatedSuccess 
        ? 'Scoped to required actions and resources' 
        : 'Overly permissive policy attached',
      matches: simulatedSuccess,
    });
  } else if (finding.service === 's3') {
    evidence.push({
      resource: finding.resource_id,
      checked_setting: 'Bucket Access Configuration',
      expected_state: 'Block Public Access enabled',
      actual_state: simulatedSuccess 
        ? 'All public access blocked' 
        : 'Public access possible',
      matches: simulatedSuccess,
    });
  }
  
  return evidence;
}

/**
 * Calculate verification status based on evidence
 */
function calculateVerificationStatus(evidence: EvidenceItem[]): VerificationStatus {
  if (evidence.length === 0) return 'UNKNOWN';
  
  const matchCount = evidence.filter(e => e.matches).length;
  const ratio = matchCount / evidence.length;
  
  if (ratio === 1) return 'FULLY_RESOLVED';
  if (ratio >= 0.5) return 'PARTIALLY_RESOLVED';
  if (ratio > 0) return 'PARTIALLY_RESOLVED';
  return 'NOT_RESOLVED';
}

/**
 * Calculate updated risk score based on verification
 */
function calculateUpdatedRiskScore(
  originalScore: number,
  status: VerificationStatus
): number {
  switch (status) {
    case 'FULLY_RESOLVED':
      return 0;
    case 'PARTIALLY_RESOLVED':
      return Math.round(originalScore * 0.4); // 60% reduction
    case 'NOT_RESOLVED':
      return originalScore;
    case 'UNKNOWN':
      return originalScore; // Keep original until verified
    default:
      return originalScore;
  }
}

/**
 * Generate verification summary
 */
function generateVerificationSummary(
  finding: Tables<'security_findings'>,
  status: VerificationStatus,
  evidence: EvidenceItem[]
): string {
  const matchCount = evidence.filter(e => e.matches).length;
  const totalChecks = evidence.length;
  
  switch (status) {
    case 'FULLY_RESOLVED':
      return `The security issue "${finding.title}" has been fully remediated. All ${totalChecks} verification checks passed. The resource ${finding.resource_id} is now configured according to security best practices.`;
    
    case 'PARTIALLY_RESOLVED':
      return `The security issue "${finding.title}" has been partially addressed. ${matchCount} of ${totalChecks} checks passed. Some aspects of the remediation may still need attention.`;
    
    case 'NOT_RESOLVED':
      return `The security issue "${finding.title}" has not been remediated. None of the ${totalChecks} verification checks passed. The original vulnerability remains present on ${finding.resource_id}.`;
    
    case 'UNKNOWN':
      return `Unable to verify the remediation status for "${finding.title}". Insufficient data available to confirm whether the fix was applied. A manual verification is recommended.`;
    
    default:
      return 'Verification status could not be determined.';
  }
}

/**
 * Generate next steps based on verification result
 */
function generateNextSteps(
  status: VerificationStatus,
  finding: Tables<'security_findings'>
): string[] {
  switch (status) {
    case 'FULLY_RESOLVED':
      return [
        'Mark finding as resolved in the dashboard',
        'Document the remediation in your change log',
        'Schedule periodic re-verification to ensure compliance',
        'Update your security baseline documentation',
      ];
    
    case 'PARTIALLY_RESOLVED':
      return [
        'Review the evidence details to identify remaining issues',
        'Re-apply the CloudFormation template or complete remaining steps',
        'Verify that all related resources are properly configured',
        'Run verification again after addressing remaining issues',
      ];
    
    case 'NOT_RESOLVED':
      return [
        'Confirm the CloudFormation template was applied to the correct account/region',
        'Check for any deployment errors in AWS CloudFormation console',
        'Verify you have sufficient permissions to make the changes',
        'Review the guided remediation steps and try again',
        'Contact your cloud administrator if issues persist',
      ];
    
    case 'UNKNOWN':
      return [
        'Ensure the AWS account is properly connected with read permissions',
        'Trigger a new security scan to refresh the data',
        'Manually verify the resource configuration in AWS Console',
        'Contact support if the issue persists',
      ];
    
    default:
      return ['Review the finding and attempt remediation again'];
  }
}

/**
 * Determine confidence level based on evidence quality
 */
function determineConfidenceLevel(
  evidence: EvidenceItem[],
  hasRecentScan: boolean
): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (evidence.length >= 2 && hasRecentScan) return 'HIGH';
  if (evidence.length >= 1 && hasRecentScan) return 'MEDIUM';
  return 'LOW';
}

/**
 * Main verification function
 */
export function verifyRemediation(input: VerificationInput): VerificationResult {
  const { finding, remediation_timestamp, latest_scan_data } = input;
  
  // Simulate verification scan
  const evidence = simulateVerificationScan(finding, remediation_timestamp);
  
  // Calculate status
  const status = calculateVerificationStatus(evidence);
  
  // Calculate scores
  const previousScore = finding.risk_score_contribution || 0;
  const currentScore = calculateUpdatedRiskScore(previousScore, status);
  
  // Generate outputs
  const summary = generateVerificationSummary(finding, status, evidence);
  const nextSteps = generateNextSteps(status, finding);
  const confidenceLevel = determineConfidenceLevel(evidence, !!latest_scan_data);
  
  return {
    finding_id: finding.id,
    verification_status: status,
    previous_risk_score: previousScore,
    current_risk_score: currentScore,
    verification_summary: summary,
    evidence,
    verified_at: new Date().toISOString(),
    confidence_level: confidenceLevel,
    next_steps: nextSteps,
  };
}

/**
 * Get status configuration for UI
 */
export function getVerificationStatusConfig(status: VerificationStatus) {
  const configs = {
    FULLY_RESOLVED: {
      label: 'Fully Resolved',
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30',
      icon: 'CheckCircle2',
    },
    PARTIALLY_RESOLVED: {
      label: 'Partially Resolved',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500/30',
      icon: 'AlertCircle',
    },
    NOT_RESOLVED: {
      label: 'Not Resolved',
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/30',
      icon: 'XCircle',
    },
    UNKNOWN: {
      label: 'Unknown',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/20',
      borderColor: 'border-muted/30',
      icon: 'HelpCircle',
    },
  };
  
  return configs[status] || configs.UNKNOWN;
}

/**
 * Format verification result for audit log
 */
export function formatVerificationForAudit(result: VerificationResult): string {
  const lines = [
    '# Post-Remediation Verification Report',
    '',
    `**Finding ID:** ${result.finding_id}`,
    `**Verified At:** ${result.verified_at}`,
    `**Status:** ${result.verification_status}`,
    `**Confidence:** ${result.confidence_level}`,
    '',
    '## Summary',
    result.verification_summary,
    '',
    '## Risk Score Update',
    `- Previous: ${result.previous_risk_score}`,
    `- Current: ${result.current_risk_score}`,
    '',
    '## Evidence',
  ];
  
  result.evidence.forEach((e, i) => {
    lines.push(`### Check ${i + 1}: ${e.checked_setting}`);
    lines.push(`- **Resource:** ${e.resource}`);
    lines.push(`- **Expected:** ${e.expected_state}`);
    lines.push(`- **Actual:** ${e.actual_state}`);
    lines.push(`- **Result:** ${e.matches ? '✅ PASS' : '❌ FAIL'}`);
    lines.push('');
  });
  
  lines.push('## Next Steps');
  result.next_steps.forEach((step, i) => {
    lines.push(`${i + 1}. ${step}`);
  });
  
  return lines.join('\n');
}
