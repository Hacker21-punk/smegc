import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Lightbulb,
  Scale,
  ClipboardList,
  Play,
  RotateCcw,
  CheckCircle2,
  FileText,
  Download,
  Shield,
  Clock,
  Hash,
} from "lucide-react";
import {
  generateAuditLog,
  formatAuditTimeline,
  getStageConfig,
  getFinalStatusConfig,
  type AuditInput,
  type AuditLog,
  type AuditStage,
} from "@/lib/audit-logger";
import { FindingDetails } from "./FindingDetailsDialog";
import { generateExecutionPlan } from "@/lib/execution-plan-generator";

interface AuditTimelineDialogProps {
  finding: FindingDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  executionResult?: any;
  executionDecision?: {
    allowed: boolean;
    reason: string;
    decided_at: string;
    decided_by: 'SYSTEM' | 'USER';
  };
}

// Map stage to icon component
function StageIcon({ stage, className }: { stage: AuditStage; className?: string }) {
  const iconProps = { className: className || "h-4 w-4" };
  
  switch (stage) {
    case 'DETECTED':
      return <Search {...iconProps} />;
    case 'RECOMMENDED':
      return <Lightbulb {...iconProps} />;
    case 'DECISION':
      return <Scale {...iconProps} />;
    case 'PLANNED':
      return <ClipboardList {...iconProps} />;
    case 'EXECUTED':
      return <Play {...iconProps} />;
    case 'ROLLED_BACK':
      return <RotateCcw {...iconProps} />;
    case 'RESOLVED':
      return <CheckCircle2 {...iconProps} />;
    case 'ADVISORY_ISSUED':
      return <FileText {...iconProps} />;
    default:
      return <FileText {...iconProps} />;
  }
}

export function AuditTimelineDialog({
  finding,
  open,
  onOpenChange,
  executionResult,
  executionDecision,
}: AuditTimelineDialogProps) {
  // Generate audit log from finding
  const auditLog = useMemo<AuditLog | null>(() => {
    if (!finding) return null;

    // Generate execution plan if applicable
    const executionPlan = finding.execution_tag !== 'MANUAL_ONLY'
      ? generateExecutionPlan({
          title: finding.title,
          service: finding.service,
          resource_id: finding.resource_id,
          resource_type: finding.resource_type,
          severity: finding.severity,
          execution_tag: finding.execution_tag,
          remediation_steps: finding.remediation_steps,
          rollback_guidance: finding.rollback_guidance,
        })
      : null;

    const input: AuditInput = {
      finding_id: finding.id,
      aws_account_id: finding.aws_account_id,
      service: finding.service,
      risk_severity_score: finding.risk_score_contribution || 5,
      title: finding.title,
      description: finding.description,
      recommendation: finding.remediation_steps || undefined,
      execution_readiness_tag: finding.execution_tag,
      execution_decision: executionDecision,
      execution_plan: executionPlan,
      execution_result: executionResult,
      detected_at: finding.created_at,
      is_resolved: finding.is_resolved || false,
      resolved_at: null,
    };

    return generateAuditLog(input);
  }, [finding, executionResult, executionDecision]);

  if (!finding || !auditLog) return null;

  const finalStatusConfig = getFinalStatusConfig(auditLog.final_status);

  const handleDownloadJSON = () => {
    const blob = new Blob([JSON.stringify(auditLog, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${finding.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadText = () => {
    const text = formatAuditTimeline(auditLog);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${finding.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg">Security Audit Timeline</DialogTitle>
              <DialogDescription className="mt-1">
                Complete, immutable audit log for compliance evidence
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-5">
            {/* Summary Header */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Finding</span>
                <code className="text-xs bg-background px-2 py-0.5 rounded">
                  {auditLog.finding_id.substring(0, 8)}...
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Audit Log ID</span>
                <code className="text-xs bg-background px-2 py-0.5 rounded font-mono">
                  {auditLog.audit_log_id}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">AWS Account</span>
                <span className="text-sm text-muted-foreground">{auditLog.aws_account_id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Service</span>
                <span className="text-sm capitalize">{auditLog.service.replace('_', ' ')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Risk Score</span>
                <Badge variant="outline" className="font-mono">
                  {auditLog.risk_severity_score}/10
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Final Status</span>
                <Badge className={`${finalStatusConfig.bgColor} ${finalStatusConfig.color} border`}>
                  {finalStatusConfig.label}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Timeline */}
            <div>
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Audit Timeline
              </h4>
              
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[15px] top-0 bottom-0 w-[2px] bg-border" />
                
                {/* Timeline entries */}
                <div className="space-y-4">
                  {auditLog.audit_timeline.map((entry, index) => {
                    const config = getStageConfig(entry.stage);
                    
                    return (
                      <div key={index} className="relative flex gap-4">
                        {/* Timeline dot */}
                        <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full ${config.bgColor} border flex items-center justify-center`}>
                          <StageIcon stage={entry.stage} className={`h-4 w-4 ${config.color}`} />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 pb-4">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={`${config.bgColor} ${config.color} text-xs`}>
                              {config.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(entry.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {entry.details}
                          </p>
                          {entry.actor && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              Actor: <span className="font-medium">{entry.actor}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <Separator />

            {/* Compliance Frameworks */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Compliance Frameworks
              </h4>
              <div className="flex flex-wrap gap-2">
                {auditLog.compliance_frameworks.map((framework, index) => (
                  <Badge key={index} variant="secondary">
                    {framework}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                This audit log provides evidence for compliance audits. Timeline is immutable and factual.
              </p>
            </div>

            <Separator />

            {/* Integrity */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Hash className="h-4 w-4 text-primary" />
                Log Integrity
              </h4>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Checksum</span>
                  <code className="font-mono text-xs bg-background px-2 py-0.5 rounded">
                    {auditLog.checksum}
                  </code>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Created</span>
                  <span className="text-xs">{new Date(auditLog.created_at).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span className="text-xs">{new Date(auditLog.last_updated_at).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Download Actions */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadJSON} className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                Download JSON
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadText} className="flex-1">
                <FileText className="mr-2 h-4 w-4" />
                Download Report
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
