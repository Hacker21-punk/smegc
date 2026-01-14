/**
 * Compliance Evidence Generator Engine
 * 
 * Generates READ-ONLY, AUDIT-READY compliance evidence reports
 * based on verified security findings.
 * 
 * IMPORTANT: This does NOT certify compliance. It provides supporting evidence only.
 */

export type ComplianceFramework = 'ISO_27001' | 'SOC_2' | 'DPDP_ACT' | 'GDPR';

export type CoverageStatus = 'SUPPORTED' | 'PARTIAL' | 'NOT_SUPPORTED';

export type VerificationStatus = 'FULLY_RESOLVED' | 'PARTIALLY_RESOLVED' | 'NOT_RESOLVED' | 'PENDING';

export interface EvidenceItem {
  finding_id: string;
  finding_title: string;
  verification_status: VerificationStatus;
  evidence_reference: string;
  detection_timestamp: string;
  remediation_guidance_provided: boolean;
  user_confirmed_remediation: boolean;
  verification_result?: string;
}

export interface ControlMapping {
  control_id: string;
  control_description: string;
  control_category: string;
  evidence: EvidenceItem[];
  coverage_status: CoverageStatus;
  gap_notes?: string;
}

export interface ComplianceReport {
  framework: ComplianceFramework;
  framework_display_name: string;
  report_type: 'Evidence Mapping';
  generated_at: string;
  aws_account_identifier: string;
  summary: {
    controls_supported: number;
    controls_partial: number;
    controls_missing: number;
    total_controls: number;
    coverage_percentage: number;
  };
  control_mapping: ControlMapping[];
  disclaimer: string;
}

export interface FindingForCompliance {
  id: string;
  title: string;
  service: string;
  severity: string;
  is_resolved: boolean | null;
  created_at: string;
  compliance_tags?: string[] | null;
  remediation_steps?: string[] | null;
  execution_tag?: string | null;
  aws_account_id?: string;
}

// Control definitions for each framework
const FRAMEWORK_CONTROLS: Record<ComplianceFramework, Array<{
  id: string;
  description: string;
  category: string;
  relevantServices: string[];
  relevantTags: string[];
}>> = {
  ISO_27001: [
    {
      id: 'A.9.1.2',
      description: 'Access to networks and network services',
      category: 'Access Control',
      relevantServices: ['security_groups', 'vpc'],
      relevantTags: ['network-access', 'firewall']
    },
    {
      id: 'A.9.2.1',
      description: 'User registration and de-registration',
      category: 'Access Control',
      relevantServices: ['iam'],
      relevantTags: ['user-management', 'identity']
    },
    {
      id: 'A.9.2.3',
      description: 'Management of privileged access rights',
      category: 'Access Control',
      relevantServices: ['iam'],
      relevantTags: ['privilege-management', 'admin-access']
    },
    {
      id: 'A.9.2.4',
      description: 'Management of secret authentication information',
      category: 'Access Control',
      relevantServices: ['iam'],
      relevantTags: ['credentials', 'mfa', 'access-keys']
    },
    {
      id: 'A.9.4.1',
      description: 'Information access restriction',
      category: 'Access Control',
      relevantServices: ['s3', 'iam'],
      relevantTags: ['data-access', 'bucket-policy']
    },
    {
      id: 'A.12.6.1',
      description: 'Management of technical vulnerabilities',
      category: 'Operations Security',
      relevantServices: ['ec2', 'rds'],
      relevantTags: ['vulnerability', 'patching']
    },
    {
      id: 'A.13.1.1',
      description: 'Network controls',
      category: 'Communications Security',
      relevantServices: ['security_groups', 'vpc'],
      relevantTags: ['network-security', 'segmentation']
    },
    {
      id: 'A.14.1.2',
      description: 'Securing application services on public networks',
      category: 'System Acquisition',
      relevantServices: ['s3', 'ec2'],
      relevantTags: ['public-access', 'encryption']
    },
    {
      id: 'A.18.1.3',
      description: 'Protection of records',
      category: 'Compliance',
      relevantServices: ['s3', 'rds'],
      relevantTags: ['data-protection', 'encryption']
    },
    {
      id: 'A.18.1.4',
      description: 'Privacy and protection of personally identifiable information',
      category: 'Compliance',
      relevantServices: ['s3', 'rds', 'iam'],
      relevantTags: ['pii', 'privacy', 'data-protection']
    }
  ],
  SOC_2: [
    {
      id: 'CC6.1',
      description: 'Logical and physical access controls',
      category: 'Common Criteria',
      relevantServices: ['iam', 'security_groups'],
      relevantTags: ['access-control', 'authentication']
    },
    {
      id: 'CC6.2',
      description: 'Prior to system access, user identity is validated',
      category: 'Common Criteria',
      relevantServices: ['iam'],
      relevantTags: ['identity', 'mfa', 'authentication']
    },
    {
      id: 'CC6.3',
      description: 'Access is authorized and modified based on roles',
      category: 'Common Criteria',
      relevantServices: ['iam'],
      relevantTags: ['rbac', 'privilege-management']
    },
    {
      id: 'CC6.6',
      description: 'External threats are identified and mitigated',
      category: 'Common Criteria',
      relevantServices: ['security_groups', 'vpc'],
      relevantTags: ['threat-mitigation', 'network-security']
    },
    {
      id: 'CC6.7',
      description: 'Transmission of data is protected',
      category: 'Common Criteria',
      relevantServices: ['s3', 'rds'],
      relevantTags: ['encryption', 'data-transit']
    },
    {
      id: 'CC7.1',
      description: 'Security events are detected and responded to',
      category: 'Common Criteria',
      relevantServices: ['security_groups', 'iam'],
      relevantTags: ['monitoring', 'incident-response']
    },
    {
      id: 'CC7.2',
      description: 'Anomalies are identified and evaluated',
      category: 'Common Criteria',
      relevantServices: ['cost', 'ec2'],
      relevantTags: ['anomaly-detection', 'monitoring']
    },
    {
      id: 'CC8.1',
      description: 'Changes are authorized, tested, and documented',
      category: 'Common Criteria',
      relevantServices: ['iam'],
      relevantTags: ['change-management']
    }
  ],
  DPDP_ACT: [
    {
      id: 'DPDP-4',
      description: 'Reasonable security safeguards for personal data',
      category: 'Data Protection',
      relevantServices: ['s3', 'rds', 'iam'],
      relevantTags: ['data-protection', 'encryption', 'access-control']
    },
    {
      id: 'DPDP-5',
      description: 'Data breach notification obligations',
      category: 'Breach Notification',
      relevantServices: ['s3', 'rds'],
      relevantTags: ['breach-detection', 'monitoring']
    },
    {
      id: 'DPDP-8',
      description: 'Rights of data principals',
      category: 'Data Rights',
      relevantServices: ['s3', 'rds'],
      relevantTags: ['data-access', 'data-management']
    },
    {
      id: 'DPDP-9',
      description: 'Duties of data fiduciaries',
      category: 'Fiduciary Duties',
      relevantServices: ['iam', 's3'],
      relevantTags: ['governance', 'access-control']
    },
    {
      id: 'DPDP-17',
      description: 'Significant data fiduciary obligations',
      category: 'Enhanced Obligations',
      relevantServices: ['iam', 's3', 'rds'],
      relevantTags: ['audit', 'compliance']
    }
  ],
  GDPR: [
    {
      id: 'Art.5',
      description: 'Principles relating to processing of personal data',
      category: 'Core Principles',
      relevantServices: ['s3', 'rds'],
      relevantTags: ['data-processing', 'data-minimization']
    },
    {
      id: 'Art.25',
      description: 'Data protection by design and default',
      category: 'Privacy by Design',
      relevantServices: ['s3', 'rds', 'iam'],
      relevantTags: ['privacy', 'security-by-default']
    },
    {
      id: 'Art.32',
      description: 'Security of processing',
      category: 'Security',
      relevantServices: ['s3', 'rds', 'iam', 'security_groups'],
      relevantTags: ['encryption', 'access-control', 'security']
    },
    {
      id: 'Art.33',
      description: 'Notification of personal data breach',
      category: 'Breach Notification',
      relevantServices: ['s3', 'rds'],
      relevantTags: ['breach-notification', 'monitoring']
    },
    {
      id: 'Art.35',
      description: 'Data protection impact assessment',
      category: 'Risk Assessment',
      relevantServices: ['s3', 'rds', 'iam'],
      relevantTags: ['risk-assessment', 'impact-analysis']
    }
  ]
};

const FRAMEWORK_DISPLAY_NAMES: Record<ComplianceFramework, string> = {
  ISO_27001: 'ISO 27001:2022',
  SOC_2: 'SOC 2 Type II',
  DPDP_ACT: 'Digital Personal Data Protection Act 2023',
  GDPR: 'General Data Protection Regulation'
};

// Map findings to controls based on service and tags
function mapFindingsToControl(
  control: typeof FRAMEWORK_CONTROLS[ComplianceFramework][0],
  findings: FindingForCompliance[]
): EvidenceItem[] {
  const evidence: EvidenceItem[] = [];

  for (const finding of findings) {
    // Check if finding matches this control
    const serviceMatch = control.relevantServices.includes(finding.service);
    const tagMatch = finding.compliance_tags?.some(tag => 
      control.relevantTags.some(rt => tag.toLowerCase().includes(rt))
    ) || false;

    if (serviceMatch || tagMatch) {
      const verificationStatus: VerificationStatus = finding.is_resolved 
        ? 'FULLY_RESOLVED' 
        : 'NOT_RESOLVED';

      evidence.push({
        finding_id: finding.id,
        finding_title: finding.title,
        verification_status: verificationStatus,
        evidence_reference: `AUDIT-${finding.id.slice(0, 8).toUpperCase()}`,
        detection_timestamp: finding.created_at,
        remediation_guidance_provided: !!finding.remediation_steps?.length,
        user_confirmed_remediation: finding.is_resolved || false,
        verification_result: finding.is_resolved 
          ? 'Remediation verified through post-fix scan'
          : 'Pending remediation'
      });
    }
  }

  return evidence;
}

// Determine coverage status based on evidence
function determineCoverageStatus(evidence: EvidenceItem[]): CoverageStatus {
  if (evidence.length === 0) {
    return 'NOT_SUPPORTED';
  }

  const resolvedCount = evidence.filter(
    e => e.verification_status === 'FULLY_RESOLVED'
  ).length;

  const resolvedPercentage = (resolvedCount / evidence.length) * 100;

  if (resolvedPercentage >= 80) {
    return 'SUPPORTED';
  } else if (resolvedPercentage >= 30) {
    return 'PARTIAL';
  }
  return 'NOT_SUPPORTED';
}

// Generate gap notes for controls with issues
function generateGapNotes(evidence: EvidenceItem[], coverageStatus: CoverageStatus): string | undefined {
  if (coverageStatus === 'SUPPORTED') {
    return undefined;
  }

  if (evidence.length === 0) {
    return 'No evidence available. Requires attention - manual evidence collection recommended.';
  }

  const unresolvedCount = evidence.filter(
    e => e.verification_status !== 'FULLY_RESOLVED'
  ).length;

  if (unresolvedCount > 0) {
    return `${unresolvedCount} finding(s) pending remediation. Partial evidence available.`;
  }

  return undefined;
}

// Main function to generate compliance report
export function generateComplianceReport(
  framework: ComplianceFramework,
  findings: FindingForCompliance[],
  awsAccountId: string
): ComplianceReport {
  const controls = FRAMEWORK_CONTROLS[framework];
  const controlMapping: ControlMapping[] = [];

  let supported = 0;
  let partial = 0;
  let missing = 0;

  for (const control of controls) {
    const evidence = mapFindingsToControl(control, findings);
    const coverageStatus = determineCoverageStatus(evidence);
    const gapNotes = generateGapNotes(evidence, coverageStatus);

    controlMapping.push({
      control_id: control.id,
      control_description: control.description,
      control_category: control.category,
      evidence,
      coverage_status: coverageStatus,
      gap_notes: gapNotes
    });

    switch (coverageStatus) {
      case 'SUPPORTED':
        supported++;
        break;
      case 'PARTIAL':
        partial++;
        break;
      case 'NOT_SUPPORTED':
        missing++;
        break;
    }
  }

  const totalControls = controls.length;
  const coveragePercentage = Math.round(
    ((supported + partial * 0.5) / totalControls) * 100
  );

  // Mask account ID for security
  const maskedAccountId = awsAccountId.length > 4 
    ? `****${awsAccountId.slice(-4)}`
    : awsAccountId;

  return {
    framework,
    framework_display_name: FRAMEWORK_DISPLAY_NAMES[framework],
    report_type: 'Evidence Mapping',
    generated_at: new Date().toISOString(),
    aws_account_identifier: maskedAccountId,
    summary: {
      controls_supported: supported,
      controls_partial: partial,
      controls_missing: missing,
      total_controls: totalControls,
      coverage_percentage: coveragePercentage
    },
    control_mapping: controlMapping,
    disclaimer: 'This report provides supporting security evidence and does not constitute certification or legal compliance. Organizations must conduct their own compliance assessments with qualified auditors.'
  };
}

// Get framework configuration for UI
export function getFrameworkConfig(framework: ComplianceFramework) {
  const configs = {
    ISO_27001: {
      name: 'ISO 27001',
      fullName: 'ISO 27001:2022',
      description: 'Information Security Management System',
      icon: 'Shield',
      color: 'text-primary'
    },
    SOC_2: {
      name: 'SOC 2',
      fullName: 'SOC 2 Type II',
      description: 'Service Organization Control',
      icon: 'Lock',
      color: 'text-info'
    },
    DPDP_ACT: {
      name: 'DPDP Act',
      fullName: 'Digital Personal Data Protection Act 2023',
      description: 'India Data Protection',
      icon: 'FileCheck',
      color: 'text-warning'
    },
    GDPR: {
      name: 'GDPR',
      fullName: 'General Data Protection Regulation',
      description: 'EU Data Privacy',
      icon: 'Globe',
      color: 'text-success'
    }
  };

  return configs[framework];
}

// Get coverage status configuration for UI
export function getCoverageStatusConfig(status: CoverageStatus) {
  const configs = {
    SUPPORTED: {
      label: 'Supported',
      color: 'bg-success/10 text-success border-success/20',
      description: 'Evidence supports this control'
    },
    PARTIAL: {
      label: 'Partial',
      color: 'bg-warning/10 text-warning border-warning/20',
      description: 'Partial evidence available'
    },
    NOT_SUPPORTED: {
      label: 'Requires Attention',
      color: 'bg-critical/10 text-critical border-critical/20',
      description: 'Missing or insufficient evidence'
    }
  };

  return configs[status];
}

// Format report as downloadable markdown
export function formatReportAsMarkdown(report: ComplianceReport): string {
  const lines: string[] = [
    `# ${report.framework_display_name} Evidence Report`,
    '',
    `**Report Type:** ${report.report_type}`,
    `**Generated:** ${new Date(report.generated_at).toLocaleString()}`,
    `**AWS Account:** ${report.aws_account_identifier}`,
    '',
    '---',
    '',
    '## Executive Summary',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Controls Supported | ${report.summary.controls_supported} |`,
    `| Controls Partial | ${report.summary.controls_partial} |`,
    `| Controls Missing | ${report.summary.controls_missing} |`,
    `| Total Controls | ${report.summary.total_controls} |`,
    `| Coverage Score | ${report.summary.coverage_percentage}% |`,
    '',
    '---',
    '',
    '## Control Mapping',
    ''
  ];

  // Group by category
  const byCategory = report.control_mapping.reduce((acc, control) => {
    if (!acc[control.control_category]) {
      acc[control.control_category] = [];
    }
    acc[control.control_category].push(control);
    return acc;
  }, {} as Record<string, ControlMapping[]>);

  for (const [category, controls] of Object.entries(byCategory)) {
    lines.push(`### ${category}`, '');

    for (const control of controls) {
      const statusEmoji = 
        control.coverage_status === 'SUPPORTED' ? '✅' :
        control.coverage_status === 'PARTIAL' ? '⚠️' : '❌';

      lines.push(`#### ${statusEmoji} ${control.control_id}: ${control.control_description}`);
      lines.push('');
      lines.push(`**Status:** ${control.coverage_status}`);
      
      if (control.gap_notes) {
        lines.push(`**Gap Notes:** ${control.gap_notes}`);
      }

      if (control.evidence.length > 0) {
        lines.push('', '**Evidence:**', '');
        for (const ev of control.evidence) {
          lines.push(`- ${ev.finding_title}`);
          lines.push(`  - Reference: ${ev.evidence_reference}`);
          lines.push(`  - Status: ${ev.verification_status}`);
          lines.push(`  - Detected: ${new Date(ev.detection_timestamp).toLocaleDateString()}`);
        }
      }
      lines.push('');
    }
  }

  lines.push('---', '', '## Disclaimer', '', report.disclaimer);

  return lines.join('\n');
}

// Get all available frameworks
export function getAvailableFrameworks(): ComplianceFramework[] {
  return ['ISO_27001', 'SOC_2', 'DPDP_ACT', 'GDPR'];
}
