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
import { AlertTriangle, Shield, Info, CheckCircle2, Download, ExternalLink } from "lucide-react";

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

  const config = getSeverityConfig(finding.severity);
  const SeverityIcon = config.icon;

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
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${config.color}`}>
              <SeverityIcon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg leading-tight">{finding.title}</DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={config.color}>{config.label}</Badge>
                <span className="text-sm text-muted-foreground">{config.description}</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Resource Details */}
            <div>
              <h4 className="font-semibold mb-2">Resource Details</h4>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resource ID:</span>
                  <code className="text-sm bg-background px-2 py-0.5 rounded">{finding.resource_id}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span>{finding.resource_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service:</span>
                  <span className="capitalize">{finding.service.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Detected:</span>
                  <span>{new Date(finding.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* What's the Risk? */}
            {finding.description && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  What's the Risk?
                </h4>
                <p className="text-muted-foreground leading-relaxed">
                  {finding.description}
                </p>
              </div>
            )}

            <Separator />

            {/* Remediation Steps */}
            {finding.remediation_steps && finding.remediation_steps.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  How to Fix
                </h4>
                <ol className="space-y-3">
                  {finding.remediation_steps.map((step, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center font-medium">
                        {index + 1}
                      </span>
                      <span className="text-muted-foreground pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* CloudFormation Template */}
            {finding.cloudformation_template && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Automated Fix Available</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Download a CloudFormation template that will automatically remediate this issue.
                  </p>
                  <Button variant="outline" onClick={handleDownloadTemplate}>
                    <Download className="mr-2 h-4 w-4" />
                    Download CloudFormation Template
                  </Button>
                </div>
              </>
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