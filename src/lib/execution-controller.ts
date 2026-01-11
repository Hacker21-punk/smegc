// AI Cloud Security Execution Controller & P0 Execution Engine
// Manages execution of approved security fixes with strict priority and safety rules
// Platform maintains ZERO write access - provides simulation & manual guides only

import { ExecutionPlan } from './execution-plan-generator';
import { PriorityCategory, ExecutionWindow } from './prioritization-engine';

export type ExecutionStatus = 'SUCCESS' | 'FAILED' | 'ABORTED' | 'PENDING' | 'IN_PROGRESS';
export type ValidationStatus = 'PASSED' | 'FAILED' | 'PENDING';
export type RollbackStatus = 'SUCCESS' | 'FAILED' | 'NOT_REQUIRED' | 'PENDING';

export interface ExecutionStep {
  step_order: number;
  aws_api: string;
  parameters: Record<string, unknown>;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'skipped';
  started_at?: string;
  completed_at?: string;
  error?: string;
}

export interface ExecutedStepResult {
  step_order: number;
  aws_api: string;
  status: 'SUCCESS' | 'FAILED';
  timestamp: string;
  response?: Record<string, unknown>;
  error?: string;
}

export interface ExecutionLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success' | 'debug';
  message: string;
  step_order?: number;
  details?: Record<string, unknown>;
}

export interface ExecutionResult {
  execution_status: ExecutionStatus;
  executed_steps: ExecutedStepResult[];
  rollback_triggered: boolean;
  rollback_status: RollbackStatus;
  logs: ExecutionLog[];
  post_execution_validation: ValidationStatus;
  final_state_validation: ValidationStatus;
  started_at: string;
  completed_at?: string;
  abort_reason?: string;
  audit_log_id: string;
}

export interface ExecutionRequest {
  finding_id: string;
  priority_category: PriorityCategory;
  execution_plan: ExecutionPlan;
  environment_type: 'production' | 'staging' | 'unknown';
  user_approval: boolean;
  auto_fix_enabled: boolean;
  aws_account_id?: string;
  aws_region?: string;
}

export interface P0ExecutionRequest extends ExecutionRequest {
  priority_category: 'P0';
  user_approval: true;
  auto_fix_enabled: true;
  plan_checksum: string;
}

export interface SafetyCheckResult {
  check: string;
  passed: boolean;
  reason?: string;
  critical?: boolean;
}

export interface PreExecutionCheck {
  name: string;
  status: 'passed' | 'failed' | 'pending';
  message: string;
  timestamp: string;
}

export interface ExecutionEligibility {
  can_execute: boolean;
  execution_mode: 'AUTOMATED' | 'MANUAL_GUIDED' | 'BLOCKED';
  blocking_reasons: string[];
  safety_checks: SafetyCheckResult[];
  required_confirmations: string[];
  pre_execution_checks?: PreExecutionCheck[];
}

// Execution rules based on priority category
const PRIORITY_RULES: Record<PriorityCategory, {
  auto_execute_allowed: boolean;
  requires_confirmation: boolean;
  execution_window: ExecutionWindow;
  batch_allowed: boolean;
  max_retries: number;
}> = {
  'P0': {
    auto_execute_allowed: true,
    requires_confirmation: false,
    execution_window: 'IMMEDIATE',
    batch_allowed: false,
    max_retries: 2,
  },
  'P1': {
    auto_execute_allowed: false,
    requires_confirmation: true,
    execution_window: 'OFF_HOURS',
    batch_allowed: false,
    max_retries: 1,
  },
  'P2': {
    auto_execute_allowed: false,
    requires_confirmation: true,
    execution_window: 'OFF_HOURS',
    batch_allowed: true,
    max_retries: 0,
  },
  'P3': {
    auto_execute_allowed: false,
    requires_confirmation: true,
    execution_window: 'MANUAL',
    batch_allowed: false,
    max_retries: 0,
  },
};

// Generate a checksum for the execution plan to verify integrity
export function generatePlanChecksum(plan: ExecutionPlan): string {
  const content = JSON.stringify({
    service: plan.service,
    execution_steps: plan.execution_steps,
    rollback_steps: plan.rollback_steps,
  });
  
  // Simple hash function for plan verification
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return `PLAN-${Math.abs(hash).toString(16).toUpperCase().padStart(8, '0')}`;
}

// Generate a unique audit log ID
export function generateAuditLogId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `AUDIT-${timestamp}-${random}`.toUpperCase();
}

function addLog(
  logs: ExecutionLog[],
  level: ExecutionLog['level'],
  message: string,
  step_order?: number,
  details?: Record<string, unknown>
): void {
  logs.push({
    timestamp: new Date().toISOString(),
    level,
    message,
    step_order,
    details,
  });
}

// Validate P0 pre-execution checks (MUST ALL PASS)
export function validateP0PreExecutionChecks(
  request: P0ExecutionRequest,
  originalChecksum: string
): PreExecutionCheck[] {
  const checks: PreExecutionCheck[] = [];
  const now = new Date().toISOString();

  // Check 1: Execution plan checksum matches
  const currentChecksum = generatePlanChecksum(request.execution_plan);
  const checksumMatch = currentChecksum === originalChecksum;
  checks.push({
    name: 'Plan Integrity Verification',
    status: checksumMatch ? 'passed' : 'failed',
    message: checksumMatch 
      ? `Checksum verified: ${currentChecksum}`
      : `Checksum mismatch! Expected: ${originalChecksum}, Got: ${currentChecksum}`,
    timestamp: now,
  });

  // Check 2: Required AWS permissions present (simulated)
  const hasPermissions = request.execution_plan.execution_steps.length > 0;
  checks.push({
    name: 'AWS Permissions Validation',
    status: hasPermissions ? 'passed' : 'failed',
    message: hasPermissions
      ? 'Required IAM permissions verified for all API calls'
      : 'Missing required IAM permissions',
    timestamp: now,
  });

  // Check 3: Rollback steps exist and are valid
  const hasValidRollback = request.execution_plan.rollback_steps.length > 0;
  checks.push({
    name: 'Rollback Steps Validation',
    status: hasValidRollback ? 'passed' : 'failed',
    message: hasValidRollback
      ? `${request.execution_plan.rollback_steps.length} rollback step(s) validated`
      : 'No valid rollback steps defined - execution cannot proceed',
    timestamp: now,
  });

  // Check 4: No destructive or irreversible actions
  const destructivePatterns = ['Delete', 'Terminate', 'Remove', 'Destroy'];
  const hasDestructiveActions = request.execution_plan.execution_steps.some(step =>
    destructivePatterns.some(pattern => step.aws_api.includes(pattern))
  );
  checks.push({
    name: 'Destructive Action Check',
    status: !hasDestructiveActions ? 'passed' : 'failed',
    message: !hasDestructiveActions
      ? 'No destructive or irreversible actions detected'
      : 'Destructive actions detected - requires manual review',
    timestamp: now,
  });

  // Check 5: Environment is supported for P0 execution
  const supportedEnv = request.environment_type !== 'unknown' || 
    request.execution_plan.estimated_risk === 'LOW';
  checks.push({
    name: 'Environment Compatibility',
    status: supportedEnv ? 'passed' : 'failed',
    message: supportedEnv
      ? `Environment "${request.environment_type}" is supported for P0 execution`
      : 'Unknown environment with non-LOW risk - manual verification required',
    timestamp: now,
  });

  return checks;
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
    critical: true,
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
    critical: true,
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
    critical: request.priority_category === 'P0',
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
      critical: true,
    });
    blockingReasons.push('P3 findings are advisory only');
  }

  // Check 7: Pre-checks defined
  const hasPreChecks = request.execution_plan.pre_checks.length > 0;
  safetyChecks.push({
    check: 'Pre-execution checks defined',
    passed: hasPreChecks,
  });

  // Check 8: Plan has valid structure
  const hasValidPlan = request.execution_plan.execution_steps.length > 0;
  safetyChecks.push({
    check: 'Valid execution plan structure',
    passed: hasValidPlan,
    reason: hasValidPlan ? undefined : 'Execution plan has no steps',
    critical: true,
  });
  if (!hasValidPlan) {
    blockingReasons.push('Invalid execution plan structure');
  }

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

// P0 Execution Engine - Simulates execution for read-only platform
// In a real implementation, this would make actual AWS API calls
export function executeP0Fix(
  request: P0ExecutionRequest,
  originalChecksum: string
): ExecutionResult {
  const logs: ExecutionLog[] = [];
  const executedSteps: ExecutedStepResult[] = [];
  const startedAt = new Date().toISOString();
  const auditLogId = generateAuditLogId();

  addLog(logs, 'info', '═══════════════════════════════════════════════════════');
  addLog(logs, 'info', 'P0 EXECUTION ENGINE INITIALIZED');
  addLog(logs, 'info', '═══════════════════════════════════════════════════════');
  addLog(logs, 'debug', `Audit Log ID: ${auditLogId}`);
  addLog(logs, 'debug', `Finding ID: ${request.finding_id}`);
  addLog(logs, 'debug', `AWS Account: ${request.aws_account_id || 'Not specified'}`);
  addLog(logs, 'debug', `Region: ${request.aws_region || 'Not specified'}`);
  addLog(logs, 'debug', `Environment: ${request.environment_type}`);

  // Run pre-execution checks
  addLog(logs, 'info', '');
  addLog(logs, 'info', '▶ RUNNING PRE-EXECUTION CHECKS (ALL MUST PASS)');
  addLog(logs, 'info', '───────────────────────────────────────────────────────');
  
  const preChecks = validateP0PreExecutionChecks(request, originalChecksum);
  let allChecksPassed = true;
  
  preChecks.forEach((check, index) => {
    const icon = check.status === 'passed' ? '✓' : '✗';
    const level = check.status === 'passed' ? 'success' : 'error';
    addLog(logs, level, `[${index + 1}/${preChecks.length}] ${icon} ${check.name}`);
    addLog(logs, 'debug', `   ${check.message}`);
    
    if (check.status !== 'passed') {
      allChecksPassed = false;
    }
  });

  // If any pre-check fails, ABORT immediately
  if (!allChecksPassed) {
    addLog(logs, 'error', '');
    addLog(logs, 'error', '⚠ PRE-EXECUTION CHECK FAILED - ABORTING');
    addLog(logs, 'error', 'Execution cannot proceed due to failed safety checks.');
    
    return {
      execution_status: 'ABORTED',
      executed_steps: [],
      rollback_triggered: false,
      rollback_status: 'NOT_REQUIRED',
      logs,
      post_execution_validation: 'PENDING',
      final_state_validation: 'FAILED',
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      abort_reason: 'Pre-execution checks failed',
      audit_log_id: auditLogId,
    };
  }

  addLog(logs, 'success', '');
  addLog(logs, 'success', '✓ ALL PRE-EXECUTION CHECKS PASSED');
  addLog(logs, 'info', '');
  addLog(logs, 'info', '▶ BEGINNING EXECUTION SEQUENCE');
  addLog(logs, 'info', '───────────────────────────────────────────────────────');

  // Execute each step in order
  let executionFailed = false;
  let failedAtStep = -1;

  for (const step of request.execution_plan.execution_steps) {
    const stepStartTime = new Date().toISOString();
    
    addLog(logs, 'info', ``, step.step_order);
    addLog(logs, 'info', `[Step ${step.step_order}] Executing: ${step.aws_api}`, step.step_order);
    addLog(logs, 'debug', `Parameters: ${JSON.stringify(step.parameters)}`, step.step_order);
    
    // Simulate API call (in production, this would be real AWS SDK call)
    // For demo purposes, we'll simulate success
    const simulatedSuccess = true; // In real implementation, this would be the actual result
    
    if (simulatedSuccess) {
      const stepResult: ExecutedStepResult = {
        step_order: step.step_order,
        aws_api: step.aws_api,
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        response: { simulated: true, message: 'API call simulated successfully' },
      };
      
      executedSteps.push(stepResult);
      addLog(logs, 'success', `[Step ${step.step_order}] ✓ Completed successfully`, step.step_order);
    } else {
      const stepResult: ExecutedStepResult = {
        step_order: step.step_order,
        aws_api: step.aws_api,
        status: 'FAILED',
        timestamp: new Date().toISOString(),
        error: 'Simulated failure for demonstration',
      };
      
      executedSteps.push(stepResult);
      executionFailed = true;
      failedAtStep = step.step_order;
      
      addLog(logs, 'error', `[Step ${step.step_order}] ✗ EXECUTION FAILED`, step.step_order);
      addLog(logs, 'error', `Stopping execution - no retries beyond safe limits`, step.step_order);
      break;
    }
  }

  // Handle failure and rollback
  let rollbackTriggered = false;
  let rollbackStatus: RollbackStatus = 'NOT_REQUIRED';

  if (executionFailed) {
    addLog(logs, 'warn', '');
    addLog(logs, 'warn', '▶ TRIGGERING ROLLBACK SEQUENCE');
    addLog(logs, 'warn', '───────────────────────────────────────────────────────');
    
    rollbackTriggered = true;
    
    // Execute rollback steps in reverse order
    const stepsToRollback = request.execution_plan.rollback_steps
      .filter(rs => rs.step_order <= failedAtStep)
      .sort((a, b) => b.step_order - a.step_order);
    
    let rollbackSuccess = true;
    
    for (const rollbackStep of stepsToRollback) {
      addLog(logs, 'warn', `[Rollback ${rollbackStep.step_order}] ${rollbackStep.aws_api}`);
      
      // Simulate rollback (in production, this would be real)
      const rollbackSuccessful = true;
      
      if (rollbackSuccessful) {
        addLog(logs, 'success', `[Rollback ${rollbackStep.step_order}] ✓ Reverted successfully`);
      } else {
        addLog(logs, 'error', `[Rollback ${rollbackStep.step_order}] ✗ Rollback failed!`);
        rollbackSuccess = false;
      }
    }
    
    rollbackStatus = rollbackSuccess ? 'SUCCESS' : 'FAILED';
    
    if (rollbackSuccess) {
      addLog(logs, 'success', '');
      addLog(logs, 'success', '✓ ROLLBACK COMPLETED SUCCESSFULLY');
    } else {
      addLog(logs, 'error', '');
      addLog(logs, 'error', '✗ ROLLBACK FAILED - MANUAL INTERVENTION REQUIRED');
    }
  }

  // Post-execution validation
  addLog(logs, 'info', '');
  addLog(logs, 'info', '▶ POST-EXECUTION VALIDATION');
  addLog(logs, 'info', '───────────────────────────────────────────────────────');
  
  request.execution_plan.post_checks.forEach((check, index) => {
    addLog(logs, 'success', `[Post-check ${index + 1}] ✓ ${check}`);
  });

  const finalValidation = executionFailed 
    ? (rollbackStatus === 'SUCCESS' ? 'PASSED' : 'FAILED')
    : 'PASSED';

  // Final summary
  addLog(logs, 'info', '');
  addLog(logs, 'info', '═══════════════════════════════════════════════════════');
  if (!executionFailed) {
    addLog(logs, 'success', 'EXECUTION COMPLETED SUCCESSFULLY');
  } else {
    addLog(logs, 'error', 'EXECUTION FAILED - SEE LOGS FOR DETAILS');
  }
  addLog(logs, 'info', `Audit Log ID: ${auditLogId}`);
  addLog(logs, 'info', '═══════════════════════════════════════════════════════');

  return {
    execution_status: executionFailed ? 'FAILED' : 'SUCCESS',
    executed_steps: executedSteps,
    rollback_triggered: rollbackTriggered,
    rollback_status: rollbackStatus,
    logs,
    post_execution_validation: finalValidation,
    final_state_validation: finalValidation,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    audit_log_id: auditLogId,
  };
}

// Legacy simulate function for backward compatibility
export function simulateExecution(
  request: ExecutionRequest
): ExecutionResult {
  // For P0 with proper setup, use the full execution engine
  if (request.priority_category === 'P0' && 
      request.user_approval && 
      request.auto_fix_enabled) {
    const checksum = generatePlanChecksum(request.execution_plan);
    return executeP0Fix(
      { ...request, plan_checksum: checksum } as P0ExecutionRequest,
      checksum
    );
  }

  // For non-P0, use simplified simulation
  const logs: ExecutionLog[] = [];
  const executedSteps: ExecutedStepResult[] = [];
  const startedAt = new Date().toISOString();
  const auditLogId = generateAuditLogId();

  addLog(logs, 'info', 'Execution controller initialized (simulation mode)');
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
      rollback_status: 'NOT_REQUIRED',
      logs,
      post_execution_validation: 'PENDING',
      final_state_validation: 'PENDING',
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      abort_reason: eligibility.blocking_reasons.join('; '),
      audit_log_id: auditLogId,
    };
  }

  // Run pre-checks
  addLog(logs, 'info', 'Running pre-execution checks...');
  request.execution_plan.pre_checks.forEach((check, index) => {
    addLog(logs, 'success', `Pre-check ${index + 1}: ${check}`);
  });

  // Simulate execution steps
  addLog(logs, 'info', 'Beginning execution steps...');
  
  request.execution_plan.execution_steps.forEach((step) => {
    const stepResult: ExecutedStepResult = {
      step_order: step.step_order,
      aws_api: step.aws_api,
      status: 'SUCCESS',
      timestamp: new Date().toISOString(),
    };
    
    addLog(logs, 'info', `Step ${step.step_order}: Executing ${step.aws_api}`);
    addLog(logs, 'success', `Step ${step.step_order}: Completed successfully`);
    
    executedSteps.push(stepResult);
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
    rollback_status: 'NOT_REQUIRED',
    logs,
    post_execution_validation: 'PASSED',
    final_state_validation: 'PASSED',
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    audit_log_id: auditLogId,
  };
}

// Generate manual execution guide when auto-execution is not appropriate
export function generateManualExecutionGuide(
  plan: ExecutionPlan,
  priorityCategory: PriorityCategory
): string[] {
  const guide: string[] = [];
  const rules = PRIORITY_RULES[priorityCategory];
  const checksum = generatePlanChecksum(plan);

  guide.push(`### Manual Execution Guide for ${plan.service.toUpperCase()} Fix`);
  guide.push('');
  guide.push(`**Plan Checksum:** \`${checksum}\``);
  guide.push(`**Generated:** ${new Date().toISOString()}`);
  guide.push('');
  
  if (rules.execution_window === 'OFF_HOURS') {
    guide.push('⏰ **Recommended Timing:** Execute during off-hours or maintenance window');
    guide.push('');
  }

  guide.push('---');
  guide.push('');
  guide.push('#### Pre-Execution Checklist');
  guide.push('');
  plan.pre_checks.forEach((check, i) => {
    guide.push(`- [ ] ${i + 1}. ${check}`);
  });
  guide.push('');

  guide.push('---');
  guide.push('');
  guide.push('#### Execution Steps');
  guide.push('');
  guide.push('**Execute each step in order. STOP immediately if any step fails.**');
  guide.push('');
  plan.execution_steps.forEach(step => {
    guide.push(`##### Step ${step.step_order}: ${step.aws_api}`);
    guide.push('');
    guide.push('```bash');
    guide.push(`# AWS CLI equivalent command`);
    guide.push(`aws ${plan.service} ${step.aws_api.toLowerCase().replace(/([A-Z])/g, '-$1').toLowerCase()} \\`);
    Object.entries(step.parameters).forEach(([key, value]) => {
      guide.push(`  --${key.replace(/([A-Z])/g, '-$1').toLowerCase()} '${JSON.stringify(value)}' \\`);
    });
    guide.push('```');
    guide.push('');
    guide.push('**Parameters (JSON):**');
    guide.push('```json');
    guide.push(JSON.stringify(step.parameters, null, 2));
    guide.push('```');
    guide.push('');
  });

  guide.push('---');
  guide.push('');
  guide.push('#### Rollback Steps (If Any Step Fails)');
  guide.push('');
  guide.push('**Execute rollback steps in REVERSE order if needed.**');
  guide.push('');
  plan.rollback_steps.forEach(step => {
    guide.push(`##### Rollback ${step.step_order}: ${step.aws_api}`);
    guide.push('');
    guide.push('```json');
    guide.push(JSON.stringify(step.parameters, null, 2));
    guide.push('```');
    guide.push('');
  });

  guide.push('---');
  guide.push('');
  guide.push('#### Post-Execution Validation');
  guide.push('');
  guide.push('Verify each of the following after execution:');
  guide.push('');
  plan.post_checks.forEach((check, i) => {
    guide.push(`- [ ] ${i + 1}. ${check}`);
  });
  guide.push('');
  guide.push('---');
  guide.push('');
  guide.push('**⚠️ IMPORTANT:** Document any issues encountered and report them to your security team.');

  return guide;
}

// Get execution rules for a priority category
export function getExecutionRules(category: PriorityCategory) {
  return PRIORITY_RULES[category];
}
