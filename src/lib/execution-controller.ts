// AI Cloud Security Execution Controller
// Manages execution of approved security fixes with strict priority and safety rules

import { ExecutionPlan } from './execution-plan-generator';
import { PriorityCategory, ExecutionWindow } from './prioritization-engine';

export type ExecutionStatus = 'SUCCESS' | 'FAILED' | 'ABORTED' | 'PENDING' | 'IN_PROGRESS';
export type ValidationStatus = 'PASSED' | 'FAILED' | 'PENDING';

export interface ExecutionStep {
  step_order: number;
  aws_api: string;
  parameters: Record<string, unknown>;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'skipped';
  started_at?: string;
  completed_at?: string;
  error?: string;
}

export interface ExecutionLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  step_order?: number;
}

export interface ExecutionResult {
  execution_status: ExecutionStatus;
  executed_steps: ExecutionStep[];
  rollback_triggered: boolean;
  logs: ExecutionLog[];
  post_execution_validation: ValidationStatus;
  started_at: string;
  completed_at?: string;
  abort_reason?: string;
}

export interface ExecutionRequest {
  finding_id: string;
  priority_category: PriorityCategory;
  execution_plan: ExecutionPlan;
  environment_type: 'production' | 'staging' | 'unknown';
  user_approval: boolean;
  auto_fix_enabled: boolean;
}

export interface SafetyCheckResult {
  check: string;
  passed: boolean;
  reason?: string;
}

export interface ExecutionEligibility {
  can_execute: boolean;
  execution_mode: 'AUTOMATED' | 'MANUAL_GUIDED' | 'BLOCKED';
  blocking_reasons: string[];
  safety_checks: SafetyCheckResult[];
  required_confirmations: string[];
}

// Execution rules based on priority category
const PRIORITY_RULES: Record<PriorityCategory, {
  auto_execute_allowed: boolean;
  requires_confirmation: boolean;
  execution_window: ExecutionWindow;
  batch_allowed: boolean;
}> = {
  'P0': {
    auto_execute_allowed: true,
    requires_confirmation: false,
    execution_window: 'IMMEDIATE',
    batch_allowed: false,
  },
  'P1': {
    auto_execute_allowed: false,
    requires_confirmation: true,
    execution_window: 'OFF_HOURS',
    batch_allowed: false,
  },
  'P2': {
    auto_execute_allowed: false,
    requires_confirmation: true,
    execution_window: 'OFF_HOURS',
    batch_allowed: true,
  },
  'P3': {
    auto_execute_allowed: false,
    requires_confirmation: true,
    execution_window: 'MANUAL',
    batch_allowed: false,
  },
};

function addLog(
  logs: ExecutionLog[],
  level: ExecutionLog['level'],
  message: string,
  step_order?: number
): void {
  logs.push({
    timestamp: new Date().toISOString(),
    level,
    message,
    step_order,
  });
}

export function validateExecutionEligibility(
  request: ExecutionRequest
): ExecutionEligibility {
  const safetyChecks: SafetyCheckResult[] = [];
  const blockingReasons: string[] = [];
  const requiredConfirmations: string[] = [];
  const rules = PRIORITY_RULES[request.priority_category];

  // Check 1: User approval
  safetyChecks.push({
    check: 'User approval received',
    passed: request.user_approval,
    reason: request.user_approval ? undefined : 'User approval is required before execution',
  });
  if (!request.user_approval) {
    blockingReasons.push('User approval not received');
  }

  // Check 2: Rollback steps exist
  const hasRollback = request.execution_plan.rollback_steps.length > 0;
  safetyChecks.push({
    check: 'Rollback steps defined',
    passed: hasRollback,
    reason: hasRollback ? undefined : 'No rollback steps in execution plan',
  });
  if (!hasRollback) {
    blockingReasons.push('Execution plan lacks rollback capability');
  }

  // Check 3: Execution plan risk level
  const isLowRisk = request.execution_plan.estimated_risk === 'LOW';
  safetyChecks.push({
    check: 'Low execution risk',
    passed: isLowRisk,
    reason: isLowRisk ? undefined : `Execution risk is ${request.execution_plan.estimated_risk}`,
  });
  if (!isLowRisk && request.priority_category === 'P0') {
    blockingReasons.push('P0 automation requires LOW risk rating');
  }

  // Check 4: Environment sensitivity
  const isProduction = request.environment_type === 'production';
  const productionSafe = !isProduction || request.priority_category === 'P0';
  safetyChecks.push({
    check: 'Environment is safe for execution',
    passed: productionSafe,
    reason: productionSafe ? undefined : 'Production environment requires extra caution',
  });
  if (isProduction && request.priority_category !== 'P0') {
    requiredConfirmations.push('Confirm production environment execution');
  }

  // Check 5: Priority category rules
  const autoAllowed = rules.auto_execute_allowed && request.auto_fix_enabled;
  safetyChecks.push({
    check: 'Auto-execution permitted',
    passed: autoAllowed || !rules.auto_execute_allowed,
    reason: !autoAllowed && rules.auto_execute_allowed 
      ? 'Auto-fix is disabled in preferences' 
      : undefined,
  });

  // Check 6: P3 items never execute automatically
  if (request.priority_category === 'P3') {
    safetyChecks.push({
      check: 'P3 advisory check',
      passed: false,
      reason: 'P3 items are advisory only and should not be auto-executed',
    });
    blockingReasons.push('P3 findings are advisory only');
  }

  // Check 7: Pre-checks defined
  const hasPreChecks = request.execution_plan.pre_checks.length > 0;
  safetyChecks.push({
    check: 'Pre-execution checks defined',
    passed: hasPreChecks,
  });

  // Determine execution mode
  let executionMode: ExecutionEligibility['execution_mode'] = 'BLOCKED';
  if (blockingReasons.length === 0 && autoAllowed && request.priority_category === 'P0') {
    executionMode = 'AUTOMATED';
  } else if (blockingReasons.length === 0 || 
             (blockingReasons.length === 1 && blockingReasons[0] === 'User approval not received')) {
    executionMode = 'MANUAL_GUIDED';
  }

  // Add required confirmations based on rules
  if (rules.requires_confirmation) {
    requiredConfirmations.push('Explicit user confirmation required');
  }
  if (rules.execution_window === 'OFF_HOURS') {
    requiredConfirmations.push('Schedule execution during off-hours');
  }

  return {
    can_execute: blockingReasons.length === 0 && request.user_approval,
    execution_mode: executionMode,
    blocking_reasons: blockingReasons,
    safety_checks: safetyChecks,
    required_confirmations: requiredConfirmations,
  };
}

// Simulate execution for the UI (platform is read-only, actual execution is manual)
export function simulateExecution(
  request: ExecutionRequest
): ExecutionResult {
  const logs: ExecutionLog[] = [];
  const executedSteps: ExecutionStep[] = [];
  const startedAt = new Date().toISOString();

  addLog(logs, 'info', 'Execution controller initialized');
  addLog(logs, 'info', `Finding ID: ${request.finding_id}`);
  addLog(logs, 'info', `Priority: ${request.priority_category}`);
  addLog(logs, 'info', `Environment: ${request.environment_type}`);

  // Validate eligibility first
  const eligibility = validateExecutionEligibility(request);
  
  if (!eligibility.can_execute) {
    addLog(logs, 'error', 'Execution blocked by safety checks');
    eligibility.blocking_reasons.forEach(reason => {
      addLog(logs, 'error', `Blocking reason: ${reason}`);
    });
    
    return {
      execution_status: 'ABORTED',
      executed_steps: [],
      rollback_triggered: false,
      logs,
      post_execution_validation: 'PENDING',
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      abort_reason: eligibility.blocking_reasons.join('; '),
    };
  }

  // Run pre-checks
  addLog(logs, 'info', 'Running pre-execution checks...');
  request.execution_plan.pre_checks.forEach((check, index) => {
    addLog(logs, 'success', `Pre-check ${index + 1}: ${check}`);
  });

  // Simulate execution steps
  addLog(logs, 'info', 'Beginning execution steps...');
  
  request.execution_plan.execution_steps.forEach((step, index) => {
    const executedStep: ExecutionStep = {
      step_order: step.step_order,
      aws_api: step.aws_api,
      parameters: step.parameters,
      status: 'completed',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    };
    
    addLog(logs, 'info', `Step ${step.step_order}: Executing ${step.aws_api}`);
    addLog(logs, 'success', `Step ${step.step_order}: Completed successfully`);
    
    executedSteps.push(executedStep);
  });

  // Run post-checks
  addLog(logs, 'info', 'Running post-execution validation...');
  request.execution_plan.post_checks.forEach((check, index) => {
    addLog(logs, 'success', `Post-check ${index + 1}: ${check}`);
  });

  addLog(logs, 'success', 'Execution completed successfully');

  return {
    execution_status: 'SUCCESS',
    executed_steps: executedSteps,
    rollback_triggered: false,
    logs,
    post_execution_validation: 'PASSED',
    started_at: startedAt,
    completed_at: new Date().toISOString(),
  };
}

// Generate manual execution guide when auto-execution is not appropriate
export function generateManualExecutionGuide(
  plan: ExecutionPlan,
  priorityCategory: PriorityCategory
): string[] {
  const guide: string[] = [];
  const rules = PRIORITY_RULES[priorityCategory];

  guide.push(`### Execution Guide for ${plan.service.toUpperCase()} Fix`);
  guide.push('');
  
  if (rules.execution_window === 'OFF_HOURS') {
    guide.push('⏰ **Recommended Timing:** Execute during off-hours or maintenance window');
    guide.push('');
  }

  guide.push('#### Pre-Execution Checklist');
  plan.pre_checks.forEach((check, i) => {
    guide.push(`${i + 1}. ${check}`);
  });
  guide.push('');

  guide.push('#### Execution Steps');
  plan.execution_steps.forEach(step => {
    guide.push(`**Step ${step.step_order}: ${step.aws_api}**`);
    guide.push('```json');
    guide.push(JSON.stringify(step.parameters, null, 2));
    guide.push('```');
    guide.push('');
  });

  guide.push('#### Rollback Steps (If Needed)');
  plan.rollback_steps.forEach(step => {
    guide.push(`**Rollback ${step.step_order}: ${step.aws_api}**`);
    guide.push('```json');
    guide.push(JSON.stringify(step.parameters, null, 2));
    guide.push('```');
    guide.push('');
  });

  guide.push('#### Post-Execution Validation');
  plan.post_checks.forEach((check, i) => {
    guide.push(`${i + 1}. ${check}`);
  });

  return guide;
}

// Get execution rules for a priority category
export function getExecutionRules(category: PriorityCategory) {
  return PRIORITY_RULES[category];
}
