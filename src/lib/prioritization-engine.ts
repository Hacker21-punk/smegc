// AI Cloud Security Prioritization Engine
// Orders approved security execution plans based on risk, impact, and safety

export type PriorityCategory = 'P0' | 'P1' | 'P2' | 'P3';
export type ExecutionWindow = 'IMMEDIATE' | 'OFF_HOURS' | 'MANUAL';

export interface PrioritizedFinding {
  finding_id: string;
  priority_category: PriorityCategory;
  priority_score: number;
  recommended_execution_window: ExecutionWindow;
  reason: string;
}

export interface PrioritizationResult {
  execution_order: PrioritizedFinding[];
  global_recommendation: string;
}

export interface FindingForPrioritization {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  execution_tag: 'SAFE_AUTOMATABLE' | 'REQUIRES_REVIEW' | 'MANUAL_ONLY' | null;
  service: string;
  is_resolved: boolean | null;
  title: string;
  risk_score_contribution?: number | null;
  environment_type?: 'production' | 'staging' | 'unknown';
}

// Weight factors for priority scoring
const WEIGHTS = {
  RISK_SEVERITY: 0.40,
  EXECUTION_SAFETY: 0.30,
  CONFIDENCE: 0.20,
  ENVIRONMENT: 0.10,
};

// Severity to risk score mapping (1-10)
const SEVERITY_SCORES: Record<string, number> = {
  critical: 10,
  high: 8,
  medium: 5,
  low: 3,
  info: 1,
};

// Execution tag to safety score mapping (0-100)
const SAFETY_SCORES: Record<string, number> = {
  SAFE_AUTOMATABLE: 95,
  REQUIRES_REVIEW: 50,
  MANUAL_ONLY: 20,
};

// Confidence scores based on execution tag
const CONFIDENCE_SCORES: Record<string, number> = {
  SAFE_AUTOMATABLE: 90,
  REQUIRES_REVIEW: 60,
  MANUAL_ONLY: 30,
};

// Environment sensitivity penalties
const ENVIRONMENT_MULTIPLIERS: Record<string, number> = {
  production: 0.7, // Lower priority for production (more caution)
  staging: 0.9,
  unknown: 0.8,
};

function calculatePriorityScore(finding: FindingForPrioritization): number {
  const executionTag = finding.execution_tag || 'MANUAL_ONLY';
  const environmentType = finding.environment_type || 'unknown';
  
  // Risk severity component (0-100 scale from 1-10 severity)
  const riskScore = (SEVERITY_SCORES[finding.severity] || 1) * 10;
  
  // Execution safety component
  const safetyScore = SAFETY_SCORES[executionTag] || 20;
  
  // Confidence component
  const confidenceScore = CONFIDENCE_SCORES[executionTag] || 30;
  
  // Environment sensitivity - affects final score
  const envMultiplier = ENVIRONMENT_MULTIPLIERS[environmentType] || 0.8;
  
  // Calculate weighted score
  let score = 
    (riskScore * WEIGHTS.RISK_SEVERITY) +
    (safetyScore * WEIGHTS.EXECUTION_SAFETY) +
    (confidenceScore * WEIGHTS.CONFIDENCE);
  
  // Apply environment modifier
  // For production environments, only critical issues get full weight
  if (environmentType === 'production' && finding.severity !== 'critical') {
    score *= envMultiplier;
  }
  
  // Boost score for SAFE_AUTOMATABLE findings (trust-building)
  if (executionTag === 'SAFE_AUTOMATABLE') {
    score *= 1.1;
  }
  
  // MANUAL_ONLY always gets reduced priority
  if (executionTag === 'MANUAL_ONLY') {
    score *= 0.5;
  }
  
  return Math.min(100, Math.round(score));
}

function determinePriorityCategory(
  finding: FindingForPrioritization,
  priorityScore: number
): PriorityCategory {
  const executionTag = finding.execution_tag || 'MANUAL_ONLY';
  const environmentType = finding.environment_type || 'unknown';
  
  // MANUAL_ONLY always goes to P3
  if (executionTag === 'MANUAL_ONLY') {
    return 'P3';
  }
  
  // P0 - CRITICAL & SAFE
  // High risk, low execution risk, safe to run first
  if (
    executionTag === 'SAFE_AUTOMATABLE' &&
    (finding.severity === 'critical' || finding.severity === 'high') &&
    environmentType !== 'production'
  ) {
    return 'P0';
  }
  
  // Critical in production with SAFE_AUTOMATABLE still gets P0
  if (
    executionTag === 'SAFE_AUTOMATABLE' &&
    finding.severity === 'critical'
  ) {
    return 'P0';
  }
  
  // P1 - HIGH RISK, NEEDS CARE
  // Important but may impact production
  if (
    (finding.severity === 'critical' || finding.severity === 'high') &&
    (executionTag === 'REQUIRES_REVIEW' || environmentType === 'production')
  ) {
    return 'P1';
  }
  
  // Medium severity SAFE_AUTOMATABLE also P1
  if (
    executionTag === 'SAFE_AUTOMATABLE' &&
    finding.severity === 'medium'
  ) {
    return 'P1';
  }
  
  // P2 - MEDIUM RISK
  // Should be fixed later or in batches
  if (
    (finding.severity === 'medium' || finding.severity === 'low') &&
    executionTag === 'REQUIRES_REVIEW'
  ) {
    return 'P2';
  }
  
  // Low severity SAFE_AUTOMATABLE
  if (
    executionTag === 'SAFE_AUTOMATABLE' &&
    finding.severity === 'low'
  ) {
    return 'P2';
  }
  
  // Default to P3 for anything else
  return 'P3';
}

function determineExecutionWindow(
  category: PriorityCategory,
  finding: FindingForPrioritization
): ExecutionWindow {
  const executionTag = finding.execution_tag || 'MANUAL_ONLY';
  const environmentType = finding.environment_type || 'unknown';
  
  // MANUAL_ONLY always requires manual execution
  if (executionTag === 'MANUAL_ONLY') {
    return 'MANUAL';
  }
  
  // REQUIRES_REVIEW typically needs off-hours
  if (executionTag === 'REQUIRES_REVIEW') {
    return 'OFF_HOURS';
  }
  
  // SAFE_AUTOMATABLE execution windows based on category and environment
  switch (category) {
    case 'P0':
      // Critical & safe can run immediately, except in production
      return environmentType === 'production' ? 'OFF_HOURS' : 'IMMEDIATE';
    case 'P1':
      // High risk needs care, prefer off-hours
      return 'OFF_HOURS';
    case 'P2':
      // Medium risk can batch during off-hours
      return 'OFF_HOURS';
    case 'P3':
      // Low risk / advisory is manual
      return 'MANUAL';
    default:
      return 'MANUAL';
  }
}

function generateReason(
  finding: FindingForPrioritization,
  category: PriorityCategory,
  priorityScore: number
): string {
  const executionTag = finding.execution_tag || 'MANUAL_ONLY';
  const environmentType = finding.environment_type || 'unknown';
  
  const parts: string[] = [];
  
  // Severity context
  parts.push(`${finding.severity.toUpperCase()} severity`);
  
  // Execution readiness
  if (executionTag === 'SAFE_AUTOMATABLE') {
    parts.push('safe to automate');
  } else if (executionTag === 'REQUIRES_REVIEW') {
    parts.push('requires human review');
  } else {
    parts.push('manual action required');
  }
  
  // Environment context
  if (environmentType === 'production') {
    parts.push('production environment (extra caution)');
  }
  
  // Priority context
  switch (category) {
    case 'P0':
      parts.push('recommended for immediate attention');
      break;
    case 'P1':
      parts.push('high priority with careful execution');
      break;
    case 'P2':
      parts.push('can be batched with similar fixes');
      break;
    case 'P3':
      parts.push('advisory only');
      break;
  }
  
  return parts.join('; ');
}

function generateGlobalRecommendation(prioritized: PrioritizedFinding[]): string {
  const p0Count = prioritized.filter(p => p.priority_category === 'P0').length;
  const p1Count = prioritized.filter(p => p.priority_category === 'P1').length;
  const p2Count = prioritized.filter(p => p.priority_category === 'P2').length;
  const p3Count = prioritized.filter(p => p.priority_category === 'P3').length;
  
  const immediateCount = prioritized.filter(p => p.recommended_execution_window === 'IMMEDIATE').length;
  
  if (p0Count === 0 && p1Count === 0) {
    return 'No critical security issues requiring immediate attention. Focus on P2/P3 items during scheduled maintenance windows.';
  }
  
  const recommendations: string[] = [];
  
  if (p0Count > 0) {
    recommendations.push(`${p0Count} critical issue(s) can be safely remediated immediately.`);
  }
  
  if (p1Count > 0) {
    recommendations.push(`${p1Count} high-priority issue(s) require careful, sequential execution.`);
  }
  
  if (immediateCount > 0) {
    recommendations.push(`${immediateCount} fix(es) are pre-approved for immediate execution.`);
  }
  
  if (p2Count > 0) {
    recommendations.push(`${p2Count} medium-priority items can be batched during off-hours.`);
  }
  
  recommendations.push('Always verify execution plans before proceeding. Safety first.');
  
  return recommendations.join(' ');
}

export function prioritizeFindings(
  findings: FindingForPrioritization[]
): PrioritizationResult {
  // Filter out resolved findings
  const openFindings = findings.filter(f => !f.is_resolved);
  
  // Calculate priority for each finding
  const prioritized: PrioritizedFinding[] = openFindings.map(finding => {
    const priorityScore = calculatePriorityScore(finding);
    const priorityCategory = determinePriorityCategory(finding, priorityScore);
    const executionWindow = determineExecutionWindow(priorityCategory, finding);
    const reason = generateReason(finding, priorityCategory, priorityScore);
    
    return {
      finding_id: finding.id,
      priority_category: priorityCategory,
      priority_score: priorityScore,
      recommended_execution_window: executionWindow,
      reason,
    };
  });
  
  // Sort by priority category first, then by score within category
  const categoryOrder: Record<PriorityCategory, number> = {
    'P0': 0,
    'P1': 1,
    'P2': 2,
    'P3': 3,
  };
  
  prioritized.sort((a, b) => {
    const categoryDiff = categoryOrder[a.priority_category] - categoryOrder[b.priority_category];
    if (categoryDiff !== 0) return categoryDiff;
    return b.priority_score - a.priority_score; // Higher score first within category
  });
  
  return {
    execution_order: prioritized,
    global_recommendation: generateGlobalRecommendation(prioritized),
  };
}

// Get category display properties
export function getCategoryConfig(category: PriorityCategory): {
  label: string;
  description: string;
  color: string;
  bgColor: string;
} {
  switch (category) {
    case 'P0':
      return {
        label: 'P0 - CRITICAL & SAFE',
        description: 'High risk, safe to run first',
        color: 'text-critical',
        bgColor: 'bg-critical/10 border-critical/20',
      };
    case 'P1':
      return {
        label: 'P1 - HIGH RISK, NEEDS CARE',
        description: 'Important but may impact production',
        color: 'text-warning',
        bgColor: 'bg-warning/10 border-warning/20',
      };
    case 'P2':
      return {
        label: 'P2 - MEDIUM RISK',
        description: 'Can be batched during off-hours',
        color: 'text-info',
        bgColor: 'bg-info/10 border-info/20',
      };
    case 'P3':
      return {
        label: 'P3 - LOW RISK / MANUAL',
        description: 'Advisory only',
        color: 'text-muted-foreground',
        bgColor: 'bg-muted border-border',
      };
  }
}

export function getExecutionWindowConfig(window: ExecutionWindow): {
  label: string;
  icon: 'zap' | 'moon' | 'hand';
  color: string;
} {
  switch (window) {
    case 'IMMEDIATE':
      return { label: 'Immediate', icon: 'zap', color: 'text-success' };
    case 'OFF_HOURS':
      return { label: 'Off-Hours', icon: 'moon', color: 'text-warning' };
    case 'MANUAL':
      return { label: 'Manual', icon: 'hand', color: 'text-muted-foreground' };
  }
}
