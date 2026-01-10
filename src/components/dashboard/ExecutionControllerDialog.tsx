import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Play,
  Square,
  FileDown,
  Clock,
  Shield,
  Zap,
  RotateCcw,
} from "lucide-react";
import { 
  validateExecutionEligibility, 
  simulateExecution,
  generateManualExecutionGuide,
  getExecutionRules,
  ExecutionResult,
  ExecutionEligibility,
  ExecutionRequest,
} from "@/lib/execution-controller";
import { generateExecutionPlan, ExecutionPlan } from "@/lib/execution-plan-generator";
import { PriorityCategory, getCategoryConfig } from "@/lib/prioritization-engine";
import { toast } from "sonner";
import { format } from "date-fns";

interface ExecutionControllerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  finding: {
    id: string;
    title: string;
    severity: string;
    service: string;
    resource_id: string;
    execution_tag: 'SAFE_AUTOMATABLE' | 'REQUIRES_REVIEW' | 'MANUAL_ONLY' | null;
  } | null;
  priorityCategory: PriorityCategory;
  priorityScore: number;
}

export function ExecutionControllerDialog({
  open,
  onOpenChange,
  finding,
  priorityCategory,
  priorityScore,
}: ExecutionControllerDialogProps) {
  const [userApproval, setUserApproval] = useState(false);
  const [autoFixEnabled, setAutoFixEnabled] = useState(false);
  const [environmentType, setEnvironmentType] = useState<'production' | 'staging' | 'unknown'>('unknown');
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const categoryConfig = getCategoryConfig(priorityCategory);
  const executionRules = getExecutionRules(priorityCategory);

  // Generate execution plan
  const executionPlan: ExecutionPlan | null = useMemo(() => {
    if (!finding) return null;
    return generateExecutionPlan({
      title: finding.title,
      severity: finding.severity,
      service: finding.service,
      resource_id: finding.resource_id,
      resource_type: 'aws-resource',
      execution_tag: finding.execution_tag,
    });
  }, [finding]);

  // Validate eligibility
  const eligibility: ExecutionEligibility | null = useMemo(() => {
    if (!finding || !executionPlan) return null;
    
    const request: ExecutionRequest = {
      finding_id: finding.id,
      priority_category: priorityCategory,
      execution_plan: executionPlan,
      environment_type: environmentType,
      user_approval: userApproval,
      auto_fix_enabled: autoFixEnabled,
    };

    return validateExecutionEligibility(request);
  }, [finding, executionPlan, priorityCategory, environmentType, userApproval, autoFixEnabled]);

  // Manual execution guide
  const manualGuide = useMemo(() => {
    if (!executionPlan) return [];
    return generateManualExecutionGuide(executionPlan, priorityCategory);
  }, [executionPlan, priorityCategory]);

  const handleExecute = async () => {
    if (!finding || !executionPlan || !eligibility?.can_execute) return;

    setIsExecuting(true);
    setShowLogs(true);

    // Simulate execution (platform is read-only)
    const request: ExecutionRequest = {
      finding_id: finding.id,
      priority_category: priorityCategory,
      execution_plan: executionPlan,
      environment_type: environmentType,
      user_approval: userApproval,
      auto_fix_enabled: autoFixEnabled,
    };

    // Add small delay to simulate execution time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const result = simulateExecution(request);
    setExecutionResult(result);
    setIsExecuting(false);

    if (result.execution_status === 'SUCCESS') {
      toast.success('Execution plan validated successfully');
    } else if (result.execution_status === 'ABORTED') {
      toast.error('Execution aborted: ' + result.abort_reason);
    }
  };

  const handleDownloadGuide = () => {
    const content = manualGuide.join('\n');
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `execution-guide-${finding?.id || 'unknown'}-${format(new Date(), 'yyyy-MM-dd')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Execution guide downloaded');
  };

  const handleDownloadResult = () => {
    if (!executionResult) return;
    const blob = new Blob([JSON.stringify(executionResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `execution-result-${finding?.id || 'unknown'}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Execution result downloaded');
  };

  const resetState = () => {
    setExecutionResult(null);
    setShowLogs(false);
    setUserApproval(false);
  };

  if (!finding || !executionPlan) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetState(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Execution Controller
          </DialogTitle>
          <DialogDescription>
            Validate and execute security fix for: {finding.title}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Priority & Status */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Badge className={categoryConfig.bgColor + ' ' + categoryConfig.color}>
                  {priorityCategory}
                </Badge>
                <span className="text-sm font-medium">{categoryConfig.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Priority Score:</span>
                <Progress value={priorityScore} className="w-20 h-2" />
                <span className="text-sm font-medium">{priorityScore}</span>
              </div>
            </div>

            {/* Execution Rules */}
            <div className="p-4 border rounded-lg space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Execution Rules for {priorityCategory}
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  {executionRules.auto_execute_allowed ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span>Auto-execution {executionRules.auto_execute_allowed ? 'allowed' : 'not allowed'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {executionRules.requires_confirmation ? (
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  )}
                  <span>{executionRules.requires_confirmation ? 'Confirmation required' : 'No confirmation needed'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Window: {executionRules.execution_window}</span>
                </div>
                <div className="flex items-center gap-2">
                  {executionRules.batch_allowed ? (
                    <CheckCircle2 className="h-4 w-4 text-info" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span>Batch execution {executionRules.batch_allowed ? 'allowed' : 'not allowed'}</span>
                </div>
              </div>
            </div>

            {/* Configuration */}
            <div className="p-4 border rounded-lg space-y-4">
              <h4 className="font-medium">Execution Configuration</h4>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="user-approval">User Approval</Label>
                    <p className="text-xs text-muted-foreground">
                      I confirm I want to proceed with this execution plan
                    </p>
                  </div>
                  <Switch
                    id="user-approval"
                    checked={userApproval}
                    onCheckedChange={setUserApproval}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-fix">Enable Auto-Fix</Label>
                    <p className="text-xs text-muted-foreground">
                      Allow automated execution for P0 items
                    </p>
                  </div>
                  <Switch
                    id="auto-fix"
                    checked={autoFixEnabled}
                    onCheckedChange={setAutoFixEnabled}
                    disabled={priorityCategory !== 'P0'}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Environment Type</Label>
                  <div className="flex gap-2">
                    {(['staging', 'unknown', 'production'] as const).map(env => (
                      <Button
                        key={env}
                        variant={environmentType === env ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setEnvironmentType(env)}
                        className={env === 'production' ? 'border-critical/50' : ''}
                      >
                        {env.charAt(0).toUpperCase() + env.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Safety Checks */}
            {eligibility && (
              <div className="p-4 border rounded-lg space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Safety Validation
                </h4>
                <div className="space-y-2">
                  {eligibility.safety_checks.map((check, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      {check.passed ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <XCircle className="h-4 w-4 text-critical" />
                      )}
                      <span className={check.passed ? '' : 'text-critical'}>{check.check}</span>
                      {check.reason && (
                        <span className="text-xs text-muted-foreground">({check.reason})</span>
                      )}
                    </div>
                  ))}
                </div>

                {eligibility.blocking_reasons.length > 0 && (
                  <div className="mt-3 p-3 bg-critical/10 border border-critical/20 rounded-lg">
                    <p className="text-sm font-medium text-critical mb-1">Blocking Reasons</p>
                    <ul className="text-xs text-critical space-y-1">
                      {eligibility.blocking_reasons.map((reason, i) => (
                        <li key={i}>• {reason}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {eligibility.required_confirmations.length > 0 && (
                  <div className="mt-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                    <p className="text-sm font-medium text-warning mb-1">Required Confirmations</p>
                    <ul className="text-xs space-y-1">
                      {eligibility.required_confirmations.map((conf, i) => (
                        <li key={i}>• {conf}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-3">
                  <Badge variant={
                    eligibility.execution_mode === 'AUTOMATED' ? 'default' :
                    eligibility.execution_mode === 'MANUAL_GUIDED' ? 'outline' : 'destructive'
                  }>
                    {eligibility.execution_mode}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {eligibility.can_execute ? 'Ready for execution' : 'Execution blocked'}
                  </span>
                </div>
              </div>
            )}

            {/* Execution Result */}
            {executionResult && (
              <Collapsible open={showLogs} onOpenChange={setShowLogs}>
                <div className="p-4 border rounded-lg space-y-3">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between cursor-pointer">
                      <h4 className="font-medium flex items-center gap-2">
                        {showLogs ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        Execution Result
                      </h4>
                      <Badge variant={
                        executionResult.execution_status === 'SUCCESS' ? 'default' :
                        executionResult.execution_status === 'ABORTED' ? 'destructive' : 'outline'
                      } className={
                        executionResult.execution_status === 'SUCCESS' ? 'bg-success' : ''
                      }>
                        {executionResult.execution_status}
                      </Badge>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="space-y-3 mt-3">
                      {/* Summary */}
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="text-center p-2 bg-muted/50 rounded">
                          <p className="text-lg font-bold">{executionResult.executed_steps.length}</p>
                          <p className="text-xs text-muted-foreground">Steps Executed</p>
                        </div>
                        <div className="text-center p-2 bg-muted/50 rounded">
                          <p className={`text-lg font-bold ${
                            executionResult.post_execution_validation === 'PASSED' ? 'text-success' : 'text-critical'
                          }`}>
                            {executionResult.post_execution_validation}
                          </p>
                          <p className="text-xs text-muted-foreground">Validation</p>
                        </div>
                        <div className="text-center p-2 bg-muted/50 rounded">
                          <p className={`text-lg font-bold ${
                            executionResult.rollback_triggered ? 'text-critical' : 'text-success'
                          }`}>
                            {executionResult.rollback_triggered ? 'Yes' : 'No'}
                          </p>
                          <p className="text-xs text-muted-foreground">Rollback</p>
                        </div>
                      </div>

                      {/* Logs */}
                      <div className="bg-muted/30 rounded-lg p-3 max-h-48 overflow-y-auto">
                        <p className="text-xs font-medium mb-2">Execution Logs</p>
                        <div className="space-y-1 font-mono text-xs">
                          {executionResult.logs.map((log, i) => (
                            <div key={i} className="flex gap-2">
                              <span className="text-muted-foreground w-20 flex-shrink-0">
                                {format(new Date(log.timestamp), 'HH:mm:ss')}
                              </span>
                              <span className={
                                log.level === 'error' ? 'text-critical' :
                                log.level === 'warn' ? 'text-warning' :
                                log.level === 'success' ? 'text-success' : ''
                              }>
                                [{log.level.toUpperCase()}] {log.message}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Button variant="outline" size="sm" onClick={handleDownloadResult}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Download Result
                      </Button>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )}

            {/* Manual Execution Guide */}
            <Collapsible open={showGuide} onOpenChange={setShowGuide}>
              <div className="p-4 border rounded-lg">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between cursor-pointer">
                    <h4 className="font-medium flex items-center gap-2">
                      {showGuide ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      Manual Execution Guide
                    </h4>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDownloadGuide(); }}>
                      <FileDown className="h-4 w-4" />
                    </Button>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="mt-3 p-3 bg-muted/30 rounded-lg max-h-64 overflow-y-auto">
                    <pre className="text-xs whitespace-pre-wrap font-mono">
                      {manualGuide.join('\n')}
                    </pre>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          </div>
        </ScrollArea>

        <Separator className="my-4" />

        {/* Actions */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Platform operates in read-only mode. Actual changes require manual CloudFormation deployment.
          </p>
          <div className="flex gap-2">
            {executionResult ? (
              <Button variant="outline" onClick={resetState}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            ) : (
              <Button
                onClick={handleExecute}
                disabled={!eligibility?.can_execute || isExecuting}
                className="gap-2"
              >
                {isExecuting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Validate Execution Plan
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
