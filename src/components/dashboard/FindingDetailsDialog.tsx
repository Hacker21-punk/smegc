import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AlertTriangle, 
  Shield, 
  Info, 
  CheckCircle2, 
  Download, 
  ExternalLink,
  Gauge,
  AlertCircle,
  RotateCcw,
  FileCheck,
  Zap
} from "lucide-react";

export interface FindingDetails {
  id: string;
  title: string;
  description: string | null;
  severity: "critical" | "high" | "medium" | "low" | "info";
  resource_id: string;
  resource_type: string;
  service: string;
  aws_account_id: string;
  remediation_steps: string[] | null;
  cloudformation_template: string | null;
  is_resolved: boolean | null;
  created_at: string;
  // Enhanced analysis fields
  risk_score_contribution?: number | null;
  impact_assessment?: string | null;
  execution_tag?: 'SAFE_AUTOMATABLE' | 'REQUIRES_REVIEW' | 'MANUAL_ONLY' | null;
  rollback_guidance?: string | null;
  compliance_tags?: string[] | null;
}

interface FindingDetailsDialogProps {
  finding: FindingDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMarkResolved?: (id: string) => void;
}

export function FindingDetailsDialog({ 
  finding, 
  open, 
  onOpenChange,
  onMarkResolved 
}: FindingDetailsDialogProps) {
  if (!finding) return null;

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case "critical":
        return { 
          color: "bg-critical text-critical-foreground", 
          icon: AlertTriangle,
          label: "Critical",
          description: "Immediate action required - high risk of exploitation"
        };
      case "high":
        return { 
          color: "bg-critical/80 text-critical-foreground", 
          icon: AlertTriangle,
          label: "High",
          description: "Should be addressed within 24 hours"
        };
      case "medium":
        return { 
          color: "bg-warning text-warning-foreground", 
          icon: Shield,
          label: "Medium",
          description: "Plan to fix within this week"
        };
      case "low":
        return { 
          color: "bg-info text-info-foreground", 
          icon: Info,
          label: "Low",
          description: "Address when convenient"
        };
      default:
        return { 
          color: "bg-muted text-muted-foreground", 
          icon: Info,
          label: "Info",
          description: "For your awareness"
        };
    }
  };

  const getExecutionTagConfig = (tag: string | null | undefined) => {
    switch (tag) {
      case "SAFE_AUTOMATABLE":
        return { 
          color: "bg-success/20 text-success border-success/30", 
          label: "Safe to Automate",
          description: "Low risk, reversible, standard best practice"
        };
      case "REQUIRES_REVIEW":
        return { 
          color: "bg-warning/20 text-warning border-warning/30", 
          label: "Requires Review",
          description: "May affect production or access - review before applying"
        };
      case "MANUAL_ONLY":
        return { 
          color: "bg-critical/20 text-critical border-critical/30", 
          label: "Manual Only",
          description: "High risk or business-critical - apply manually with care"
        };
      default:
        return null;
    }
  };

  const config = getSeverityConfig(finding.severity);
  const SeverityIcon = config.icon;
  const executionTagConfig = getExecutionTagConfig(finding.execution_tag);

  const handleDownloadTemplate = () => {
    if (!finding.cloudformation_template) return;
    
    const blob = new Blob([finding.cloudformation_template], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `remediation-${finding.resource_id}.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${config.color}`}>
              <SeverityIcon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg leading-tight">{finding.title}</DialogTitle>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge className={config.color}>{config.label}</Badge>
                {finding.risk_score_contribution && (
                  <Badge variant="outline" className="gap-1">
                    <Gauge className="h-3 w-3" />
                    Risk: {finding.risk_score_contribution}/10
                  </Badge>
                )}
                {executionTagConfig && (
                  <Badge variant="outline" className={executionTagConfig.color}>
                    <Zap className="h-3 w-3 mr-1" />
                    {executionTagConfig.label}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-5">
            {/* 1. Issue Identification - Resource Details */}
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                Issue Identification
              </h4>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resource ID:</span>
                  <code className="bg-background px-2 py-0.5 rounded font-mono">{finding.resource_id}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resource Type:</span>
                  <span>{finding.resource_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">AWS Service:</span>
                  <span className="capitalize">{finding.service.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Detected:</span>
                  <span>{new Date(finding.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* 2. Risk Explanation */}
            {finding.description && (
              <>
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    Risk Explanation
                  </h4>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {finding.description}
                  </p>
                </div>
                <Separator />
              </>
            )}

            {/* 3. Risk Severity Scoring */}
            {finding.risk_score_contribution && (
              <>
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-primary" />
                    Risk Severity Score
                  </h4>
                  <div className="flex items-center gap-4">
                    <div className="text-3xl font-bold text-primary">
                      {finding.risk_score_contribution}<span className="text-lg text-muted-foreground">/10</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {config.description}
                    </div>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* 4. Security Recommendation (Remediation Steps) */}
            {finding.remediation_steps && finding.remediation_steps.length > 0 && (
              <>
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Security Recommendation
                  </h4>
                  <ol className="space-y-3">
                    {finding.remediation_steps.map((step, index) => (
                      <li key={index} className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center font-medium">
                          {index + 1}
                        </span>
                        <span className="text-muted-foreground text-sm pt-0.5">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <Separator />
              </>
            )}

            {/* 5. Impact & Breakage Assessment */}
            {finding.impact_assessment && (
              <>
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-warning" />
                    Impact & Breakage Assessment
                  </h4>
                  <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">
                      {finding.impact_assessment}
                    </p>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* 6. Execution Readiness Tag & Eligibility Decision */}
            {executionTagConfig && (
              <>
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Execution Readiness & Eligibility
                  </h4>
                  <div className={`rounded-lg p-3 border ${executionTagConfig.color} mb-3`}>
                    <div className="flex items-center gap-2 font-medium mb-1">
                      {executionTagConfig.label}
                    </div>
                    <p className="text-sm opacity-80">
                      {executionTagConfig.description}
                    </p>
                  </div>
                  
                  {/* Execution Eligibility Decision */}
                  {(() => {
                    const tag = finding.execution_tag;
                    const isAutomatable = tag === 'SAFE_AUTOMATABLE';
                    const executionAllowed = isAutomatable;
                    const executionMode = isAutomatable ? 'AUTOMATED' : 'MANUAL';
                    const confidenceScore = isAutomatable ? 95 : tag === 'REQUIRES_REVIEW' ? 60 : 30;
                    const blockingReason = 
                      tag === 'MANUAL_ONLY' 
                        ? 'High-risk or business-critical change requires manual intervention'
                        : tag === 'REQUIRES_REVIEW'
                          ? 'May affect production workloads - human review recommended before execution'
                          : null;
                    
                    return (
                      <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Execution Allowed:</span>
                          <Badge variant={executionAllowed ? "default" : "secondary"} className={executionAllowed ? "bg-success text-success-foreground" : ""}>
                            {executionAllowed ? "Yes" : "No"}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Execution Mode:</span>
                          <Badge variant="outline">
                            {executionMode}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Confidence Score:</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${confidenceScore >= 80 ? 'bg-success' : confidenceScore >= 50 ? 'bg-warning' : 'bg-critical'}`}
                                style={{ width: `${confidenceScore}%` }}
                              />
                            </div>
                            <span className="font-medium">{confidenceScore}%</span>
                          </div>
                        </div>
                        {blockingReason && (
                          <div className="pt-2 border-t border-border">
                            <span className="text-muted-foreground block mb-1">Blocking Reason:</span>
                            <p className="text-warning-foreground bg-warning/10 rounded p-2 text-xs">
                              {blockingReason}
                            </p>
                          </div>
                        )}
                        {executionAllowed && (
                          <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                            ✓ Change is reversible, no downtime expected, follows AWS best practices
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <Separator />
              </>
            )}

            {/* 7. Rollback Guidance */}
            {finding.rollback_guidance && (
              <>
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 text-info" />
                    Rollback Guidance
                  </h4>
                  <div className="bg-info/10 border border-info/20 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">
                      {finding.rollback_guidance}
                    </p>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* 8. Compliance Alignment */}
            {finding.compliance_tags && finding.compliance_tags.length > 0 && (
              <>
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-success" />
                    Compliance Alignment
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {finding.compliance_tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Addressing this finding supports compliance with the above frameworks.
                  </p>
                </div>
                <Separator />
              </>
            )}

            {/* CloudFormation Template Download */}
            {finding.cloudformation_template && (
              <div>
                <h4 className="font-semibold mb-2">Automated Fix Available</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Download a CloudFormation template that provides guided remediation for this issue.
                </p>
                <Button variant="outline" onClick={handleDownloadTemplate}>
                  <Download className="mr-2 h-4 w-4" />
                  Download CloudFormation Template
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>

        <Separator />

        <div className="flex justify-between items-center pt-2">
          <Button variant="ghost" size="sm" asChild>
            <a 
              href={`https://console.aws.amazon.com/`} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open AWS Console
            </a>
          </Button>
          
          {!finding.is_resolved && onMarkResolved && (
            <Button onClick={() => onMarkResolved(finding.id)}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Mark as Resolved
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
