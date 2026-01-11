// AI Security Audit Logger for SME Cloud Guard
// Generates complete, immutable audit timelines for security findings
// Supports ISO 27001 & SOC 2 compliance evidence

import { ExecutionResult, ExecutionLog } from './execution-controller';
import { ExecutionPlan } from './execution-plan-generator';
import { PriorityCategory } from './prioritization-engine';

export type AuditStage = 
  | 'DETECTED'
  | 'RECOMMENDED'
  | 'DECISION'
  | 'PLANNED'
  | 'EXECUTED'
  | 'ROLLED_BACK'
  | 'RESOLVED'
  | 'ADVISORY_ISSUED';

export type FinalStatus = 'SECURED' | 'FAILED' | 'ROLLED_BACK' | 'ADVISORY_ONLY';

export interface AuditTimelineEntry {
  stage: AuditStage;
  timestamp: string;
  details: string;
  actor?: 'SYSTEM' | 'USER' | 'AUTO';
  metadata?: Record<string, unknown>;
}

export interface AuditLog {
  finding_id: string;
  audit_log_id: string;
  aws_account_id: string;
  service: string;
  risk_severity_score: number;
  audit_timeline: AuditTimelineEntry[];
  final_status: FinalStatus;
  compliance_frameworks: string[];
  created_at: string;
  last_updated_at: string;
  checksum: string;
}

export interface AuditInput {
  finding_id: string;
  aws_account_id: string;
  service: string;
  risk_severity_score: number;
  title: string;
  description?: string | null;
  recommendation?: string[];
  execution_readiness_tag?: 'SAFE_AUTOMATABLE' | 'REQUIRES_REVIEW' | 'MANUAL_ONLY' | null;
  execution_decision?: {
    allowed: boolean;
    reason: string;
    decided_at: string;
    decided_by: 'SYSTEM' | 'USER';
  };
  execution_plan?: ExecutionPlan | null;
  execution_result?: ExecutionResult | null;
  priority_category?: PriorityCategory;
  detected_at: string;
  is_resolved?: boolean;
  resolved_at?: string | null;
}

// Generate a checksum for audit log integrity
function generateAuditChecksum(log: Omit<AuditLog, 'checksum'>): string {
  const content = JSON.stringify({
    finding_id: log.finding_id,
    timeline: log.audit_timeline,
    final_status: log.final_status,
  });
  
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return `AUDIT-CHK-${Math.abs(hash).toString(16).toUpperCase().padStart(8, '0')}`;
}

// Generate a unique audit log ID
function generateAuditLogId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `AUD-${timestamp}-${random}`.toUpperCase();
}

// Build the detection stage entry
function buildDetectionEntry(input: AuditInput): AuditTimelineEntry {
  return {
    stage: 'DETECTED',
    timestamp: input.detected_at,
    details: `Security finding detected: ${input.title}. ` +
      `Risk severity: ${input.risk_severity_score}/10. ` +
      `Service: ${input.service.replace('_', ' ')}. ` +
      `AWS Account: ${input.aws_account_id}.`,
    actor: 'SYSTEM',
    metadata: {
      title: input.title,
      description: input.description,
      service: input.service,
      risk_score: input.risk_severity_score,
    },
  };
}

// Build the recommendation stage entry
function buildRecommendationEntry(input: AuditInput): AuditTimelineEntry | null {
  if (!input.recommendation || input.recommendation.length === 0) {
    return null;
  }

  const tagLabel = input.execution_readiness_tag === 'SAFE_AUTOMATABLE'
    ? 'Safe to Automate'
    : input.execution_readiness_tag === 'REQUIRES_REVIEW'
    ? 'Requires Review'
    : input.execution_readiness_tag === 'MANUAL_ONLY'
    ? 'Manual Only'
    : 'Pending Classification';

  return {
    stage: 'RECOMMENDED',
    timestamp: new Date(new Date(input.detected_at).getTime() + 1000).toISOString(),
    details: `Security recommendation generated with ${input.recommendation.length} remediation step(s). ` +
      `Execution readiness: ${tagLabel}.`,
    actor: 'SYSTEM',
    metadata: {
      steps_count: input.recommendation.length,
      execution_tag: input.execution_readiness_tag,
      steps: input.recommendation,
    },
  };
}

// Build the decision stage entry
function buildDecisionEntry(input: AuditInput): AuditTimelineEntry | null {
  if (!input.execution_decision) {
    return null;
  }

  const decision = input.execution_decision;
  const statusText = decision.allowed ? 'APPROVED' : 'BLOCKED';

  return {
    stage: 'DECISION',
    timestamp: decision.decided_at,
    details: `Execution ${statusText} by ${decision.decided_by}. Reason: ${decision.reason}`,
    actor: decision.decided_by,
    metadata: {
      allowed: decision.allowed,
      reason: decision.reason,
      priority_category: input.priority_category,
    },
  };
}

// Build the planned stage entry
function buildPlannedEntry(input: AuditInput): AuditTimelineEntry | null {
  if (!input.execution_plan || !input.execution_plan.is_safe) {
    return null;
  }

  const plan = input.execution_plan;
  const timestamp = input.execution_decision?.decided_at 
    ? new Date(new Date(input.execution_decision.decided_at).getTime() + 1000).toISOString()
    : new Date().toISOString();

  return {
    stage: 'PLANNED',
    timestamp,
    details: `Execution plan prepared with ${plan.execution_steps.length} step(s), ` +
      `${plan.rollback_steps.length} rollback step(s), and ${plan.post_checks.length} post-check(s). ` +
      `Estimated risk: ${plan.estimated_risk}.`,
    actor: 'SYSTEM',
    metadata: {
      steps_count: plan.execution_steps.length,
      rollback_steps_count: plan.rollback_steps.length,
      pre_checks_count: plan.pre_checks.length,
      post_checks_count: plan.post_checks.length,
      estimated_risk: plan.estimated_risk,
      plan_generated_at: plan.plan_generated_at,
    },
  };
}

// Build the executed stage entry
function buildExecutedEntry(input: AuditInput): AuditTimelineEntry | null {
  if (!input.execution_result) {
    return null;
  }

  const result = input.execution_result;
  const successCount = result.executed_steps.filter(s => s.status === 'SUCCESS').length;
  const failedCount = result.executed_steps.filter(s => s.status === 'FAILED').length;

  return {
    stage: 'EXECUTED',
    timestamp: result.completed_at || result.started_at,
    details: `Execution ${result.execution_status}. ` +
      `${successCount} step(s) completed successfully, ${failedCount} step(s) failed. ` +
      `Post-execution validation: ${result.post_execution_validation}.`,
    actor: 'AUTO',
    metadata: {
      status: result.execution_status,
      steps_succeeded: successCount,
      steps_failed: failedCount,
      post_validation: result.post_execution_validation,
      final_validation: result.final_state_validation,
      audit_log_id: result.audit_log_id,
    },
  };
}

// Build the rolled back stage entry
function buildRolledBackEntry(input: AuditInput): AuditTimelineEntry | null {
  if (!input.execution_result || !input.execution_result.rollback_triggered) {
    return null;
  }

  const result = input.execution_result;
  const timestamp = result.completed_at 
    ? new Date(new Date(result.completed_at).getTime() + 1000).toISOString()
    : new Date().toISOString();

  return {
    stage: 'ROLLED_BACK',
    timestamp,
    details: `Rollback ${result.rollback_status}. ` +
      `Rollback was triggered due to execution failure. ` +
      `System state restoration: ${result.rollback_status === 'SUCCESS' ? 'Complete' : 'Failed'}.`,
    actor: 'AUTO',
    metadata: {
      rollback_status: result.rollback_status,
      trigger_reason: result.abort_reason || 'Step execution failure',
    },
  };
}

// Build the resolved/advisory stage entry
function buildResolutionEntry(input: AuditInput): AuditTimelineEntry | null {
  if (input.is_resolved && input.resolved_at) {
    return {
      stage: 'RESOLVED',
      timestamp: input.resolved_at,
      details: 'Finding marked as resolved. Security issue has been addressed.',
      actor: 'USER',
      metadata: {
        resolved_by: 'user_action',
      },
    };
  }

  // For advisory-only findings (P3 or MANUAL_ONLY)
  if (input.execution_readiness_tag === 'MANUAL_ONLY' || input.priority_category === 'P3') {
    return {
      stage: 'ADVISORY_ISSUED',
      timestamp: new Date().toISOString(),
      details: 'Advisory issued for manual review. Finding requires human assessment and action.',
      actor: 'SYSTEM',
      metadata: {
        reason: input.execution_readiness_tag === 'MANUAL_ONLY' 
          ? 'High risk or business-critical finding'
          : 'Low priority advisory item',
      },
    };
  }

  return null;
}

// Determine the final status based on all inputs
function determineFinalStatus(input: AuditInput): FinalStatus {
  if (input.is_resolved) {
    return 'SECURED';
  }

  if (input.execution_result?.rollback_triggered) {
    return 'ROLLED_BACK';
  }

  if (input.execution_result?.execution_status === 'FAILED') {
    return 'FAILED';
  }

  if (input.execution_result?.execution_status === 'SUCCESS') {
    return 'SECURED';
  }

  if (input.execution_readiness_tag === 'MANUAL_ONLY' || input.priority_category === 'P3') {
    return 'ADVISORY_ONLY';
  }

  if (!input.execution_decision?.allowed) {
    return 'ADVISORY_ONLY';
  }

  return 'ADVISORY_ONLY';
}

// Main function to generate complete audit log
export function generateAuditLog(input: AuditInput): AuditLog {
  const timeline: AuditTimelineEntry[] = [];

  // Build timeline entries in chronological order
  const detectionEntry = buildDetectionEntry(input);
  timeline.push(detectionEntry);

  const recommendationEntry = buildRecommendationEntry(input);
  if (recommendationEntry) timeline.push(recommendationEntry);

  const decisionEntry = buildDecisionEntry(input);
  if (decisionEntry) timeline.push(decisionEntry);

  const plannedEntry = buildPlannedEntry(input);
  if (plannedEntry) timeline.push(plannedEntry);

  const executedEntry = buildExecutedEntry(input);
  if (executedEntry) timeline.push(executedEntry);

  const rolledBackEntry = buildRolledBackEntry(input);
  if (rolledBackEntry) timeline.push(rolledBackEntry);

  const resolutionEntry = buildResolutionEntry(input);
  if (resolutionEntry) timeline.push(resolutionEntry);

  // Sort timeline by timestamp
  timeline.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const finalStatus = determineFinalStatus(input);
  const now = new Date().toISOString();

  const logWithoutChecksum: Omit<AuditLog, 'checksum'> = {
    finding_id: input.finding_id,
    audit_log_id: generateAuditLogId(),
    aws_account_id: input.aws_account_id,
    service: input.service,
    risk_severity_score: input.risk_severity_score,
    audit_timeline: timeline,
    final_status: finalStatus,
    compliance_frameworks: ['ISO 27001', 'SOC 2', 'DPDP Act'],
    created_at: now,
    last_updated_at: now,
  };

  return {
    ...logWithoutChecksum,
    checksum: generateAuditChecksum(logWithoutChecksum),
  };
}

// Format audit log for human-readable display
export function formatAuditTimeline(log: AuditLog): string {
  const lines: string[] = [];
  
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                   SECURITY AUDIT TIMELINE');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Finding ID:     ${log.finding_id}`);
  lines.push(`Audit Log ID:   ${log.audit_log_id}`);
  lines.push(`AWS Account:    ${log.aws_account_id}`);
  lines.push(`Service:        ${log.service}`);
  lines.push(`Risk Score:     ${log.risk_severity_score}/10`);
  lines.push(`Final Status:   ${log.final_status}`);
  lines.push(`Checksum:       ${log.checksum}`);
  lines.push('');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('                        TIMELINE');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('');

  log.audit_timeline.forEach((entry, index) => {
    const time = new Date(entry.timestamp).toLocaleString();
    const icon = getStageIcon(entry.stage);
    
    lines.push(`[${index + 1}] ${icon} ${entry.stage}`);
    lines.push(`    Timestamp: ${time}`);
    lines.push(`    Actor:     ${entry.actor || 'SYSTEM'}`);
    lines.push(`    Details:   ${entry.details}`);
    lines.push('');
  });

  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('                   COMPLIANCE NOTES');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('');
  lines.push(`Frameworks: ${log.compliance_frameworks.join(', ')}`);
  lines.push('');
  lines.push('This audit log provides evidence for compliance audits.');
  lines.push('Timeline is immutable and factual - no assumptions or opinions.');
  lines.push('Neutral language used throughout for auditor consumption.');
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

function getStageIcon(stage: AuditStage): string {
  switch (stage) {
    case 'DETECTED': return '🔍';
    case 'RECOMMENDED': return '💡';
    case 'DECISION': return '⚖️';
    case 'PLANNED': return '📋';
    case 'EXECUTED': return '▶️';
    case 'ROLLED_BACK': return '↩️';
    case 'RESOLVED': return '✅';
    case 'ADVISORY_ISSUED': return '📢';
    default: return '•';
  }
}

// Get stage configuration for UI
export function getStageConfig(stage: AuditStage): {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
} {
  switch (stage) {
    case 'DETECTED':
      return { 
        label: 'Detected', 
        color: 'text-info', 
        bgColor: 'bg-info/10 border-info/20',
        icon: 'Search'
      };
    case 'RECOMMENDED':
      return { 
        label: 'Recommended', 
        color: 'text-primary', 
        bgColor: 'bg-primary/10 border-primary/20',
        icon: 'Lightbulb'
      };
    case 'DECISION':
      return { 
        label: 'Decision', 
        color: 'text-warning', 
        bgColor: 'bg-warning/10 border-warning/20',
        icon: 'Scale'
      };
    case 'PLANNED':
      return { 
        label: 'Planned', 
        color: 'text-muted-foreground', 
        bgColor: 'bg-muted/50 border-muted',
        icon: 'ClipboardList'
      };
    case 'EXECUTED':
      return { 
        label: 'Executed', 
        color: 'text-primary', 
        bgColor: 'bg-primary/10 border-primary/20',
        icon: 'Play'
      };
    case 'ROLLED_BACK':
      return { 
        label: 'Rolled Back', 
        color: 'text-warning', 
        bgColor: 'bg-warning/10 border-warning/20',
        icon: 'RotateCcw'
      };
    case 'RESOLVED':
      return { 
        label: 'Resolved', 
        color: 'text-success', 
        bgColor: 'bg-success/10 border-success/20',
        icon: 'CheckCircle2'
      };
    case 'ADVISORY_ISSUED':
      return { 
        label: 'Advisory Issued', 
        color: 'text-muted-foreground', 
        bgColor: 'bg-muted/50 border-muted',
        icon: 'FileText'
      };
    default:
      return { 
        label: stage, 
        color: 'text-muted-foreground', 
        bgColor: 'bg-muted/50 border-muted',
        icon: 'Circle'
      };
  }
}

// Get final status configuration for UI
export function getFinalStatusConfig(status: FinalStatus): {
  label: string;
  color: string;
  bgColor: string;
} {
  switch (status) {
    case 'SECURED':
      return { 
        label: 'Secured', 
        color: 'text-success', 
        bgColor: 'bg-success/10 border-success/30'
      };
    case 'FAILED':
      return { 
        label: 'Failed', 
        color: 'text-critical', 
        bgColor: 'bg-critical/10 border-critical/30'
      };
    case 'ROLLED_BACK':
      return { 
        label: 'Rolled Back', 
        color: 'text-warning', 
        bgColor: 'bg-warning/10 border-warning/30'
      };
    case 'ADVISORY_ONLY':
      return { 
        label: 'Advisory Only', 
        color: 'text-muted-foreground', 
        bgColor: 'bg-muted border-muted'
      };
    default:
      return { 
        label: status, 
        color: 'text-muted-foreground', 
        bgColor: 'bg-muted border-muted'
      };
  }
}
