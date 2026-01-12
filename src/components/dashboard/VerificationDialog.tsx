import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  HelpCircle,
  RefreshCw,
  Download,
  ArrowRight,
  Shield,
  TrendingDown,
  Clock,
  FileText,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';
import { 
  verifyRemediation, 
  getVerificationStatusConfig,
  formatVerificationForAudit,
  type VerificationResult,
  type VerificationStatus
} from '@/lib/verification-engine';

interface VerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  finding: Tables<'security_findings'> | null;
  remediationTimestamp?: string;
}

const StatusIcon = ({ status }: { status: VerificationStatus }) => {
  const icons = {
    FULLY_RESOLVED: CheckCircle2,
    PARTIALLY_RESOLVED: AlertCircle,
    NOT_RESOLVED: XCircle,
    UNKNOWN: HelpCircle,
  };
  const Icon = icons[status] || HelpCircle;
  const config = getVerificationStatusConfig(status);
  return <Icon className={`h-6 w-6 ${config.color}`} />;
};

export function VerificationDialog({ 
  open, 
  onOpenChange, 
  finding,
  remediationTimestamp 
}: VerificationDialogProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const handleVerify = async () => {
    if (!finding) return;
    
    setIsVerifying(true);
    
    // Simulate verification delay (in production, this would call AWS APIs)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const verificationResult = verifyRemediation({
      finding,
      remediation_timestamp: remediationTimestamp || new Date().toISOString(),
    });
    
    setResult(verificationResult);
    setIsVerifying(false);
    
    if (verificationResult.verification_status === 'FULLY_RESOLVED') {
      toast.success('Remediation verified successfully!');
    } else if (verificationResult.verification_status === 'PARTIALLY_RESOLVED') {
      toast.warning('Remediation partially complete - review remaining issues');
    } else if (verificationResult.verification_status === 'NOT_RESOLVED') {
      toast.error('Remediation not detected - please review the steps');
    } else {
      toast.info('Verification inconclusive - manual review recommended');
    }
  };

  const handleDownloadReport = () => {
    if (!result) return;
    
    const report = formatVerificationForAudit(result);
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verification-report-${result.finding_id.slice(0, 8)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Verification report downloaded');
  };

  const handleReset = () => {
    setResult(null);
  };

  if (!finding) return null;

  const statusConfig = result ? getVerificationStatusConfig(result.verification_status) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Post-Remediation Verification
          </DialogTitle>
          <DialogDescription>
            Verify whether the security fix has been successfully applied
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-120px)]">
          <div className="space-y-4 pr-4">
            {/* Finding Info */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Finding Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Title:</span>
                  <span className="font-medium text-right max-w-[60%]">{finding.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resource:</span>
                  <code className="text-xs bg-muted px-2 py-0.5 rounded">{finding.resource_id}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service:</span>
                  <Badge variant="outline">{finding.service}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Original Risk:</span>
                  <Badge variant="destructive">{finding.risk_score_contribution || 0}</Badge>
                </div>
              </CardContent>
            </Card>

            {!result ? (
              /* Verification Trigger */
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="pt-6 text-center space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <RefreshCw className={`h-8 w-8 text-primary ${isVerifying ? 'animate-spin' : ''}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold">Ready to Verify</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Click below to run a read-only verification scan and confirm the fix was applied
                    </p>
                  </div>
                  <Button 
                    onClick={handleVerify} 
                    disabled={isVerifying}
                    className="gap-2"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Run Verification Scan
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Verification Result */}
                <Card className={`border ${statusConfig?.borderColor}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <StatusIcon status={result.verification_status} />
                        Verification Result
                      </CardTitle>
                      <Badge className={`${statusConfig?.bgColor} ${statusConfig?.color} border-0`}>
                        {statusConfig?.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm">{result.verification_summary}</p>
                    
                    {/* Risk Score Change */}
                    <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                      <TrendingDown className="h-5 w-5 text-muted-foreground" />
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">{result.previous_risk_score}</Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <Badge 
                          variant={result.current_risk_score === 0 ? 'default' : 'secondary'}
                          className={result.current_risk_score === 0 ? 'bg-green-500/20 text-green-400 border-green-500/30' : ''}
                        >
                          {result.current_risk_score}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground ml-auto">
                        Confidence: {result.confidence_level}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Evidence */}
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Evidence Collected</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {result.evidence.map((item, index) => (
                      <div 
                        key={index}
                        className={`p-3 rounded-lg border ${
                          item.matches 
                            ? 'bg-green-500/10 border-green-500/20' 
                            : 'bg-red-500/10 border-red-500/20'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {item.matches ? (
                            <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                          )}
                          <div className="space-y-1 text-sm min-w-0">
                            <p className="font-medium">{item.checked_setting}</p>
                            <p className="text-muted-foreground text-xs break-all">
                              Resource: {item.resource}
                            </p>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <div>
                                <span className="text-xs text-muted-foreground">Expected:</span>
                                <p className="text-xs">{item.expected_state}</p>
                              </div>
                              <div>
                                <span className="text-xs text-muted-foreground">Actual:</span>
                                <p className="text-xs">{item.actual_state}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Next Steps */}
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <ArrowRight className="h-4 w-4" />
                      Recommended Next Steps
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.next_steps.map((step, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <span className="text-primary font-medium">{index + 1}.</span>
                          <span className="text-muted-foreground">{step}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Timestamp */}
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Verified at {new Date(result.verified_at).toLocaleString()}
                </div>

                {/* Actions */}
                <Separator />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Re-verify
                  </Button>
                  <Button size="sm" onClick={handleDownloadReport}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
