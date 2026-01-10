import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Zap, 
  Moon, 
  Hand, 
  ChevronDown, 
  ChevronRight,
  AlertTriangle,
  Shield,
  Info,
  FileDown,
  ArrowUpRight
} from "lucide-react";
import { 
  prioritizeFindings, 
  PrioritizationResult, 
  PriorityCategory,
  ExecutionWindow,
  getCategoryConfig,
  getExecutionWindowConfig,
  FindingForPrioritization
} from "@/lib/prioritization-engine";
import { toast } from "sonner";
import { format } from "date-fns";

interface Finding {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  service: string;
  resource_id: string;
  is_resolved: boolean | null;
  execution_tag: 'SAFE_AUTOMATABLE' | 'REQUIRES_REVIEW' | 'MANUAL_ONLY' | null;
  risk_score_contribution?: number | null;
}

interface PrioritizedRemediationViewProps {
  findings: Finding[];
  onFindingClick: (id: string) => void;
}

const serviceNames: Record<string, string> = {
  security_groups: "Security Groups",
  iam: "IAM",
  s3: "S3",
  ec2: "EC2",
  rds: "RDS",
  vpc: "VPC",
  cost: "Cost",
};

const ExecutionWindowIcon = ({ window }: { window: ExecutionWindow }) => {
  const config = getExecutionWindowConfig(window);
  switch (config.icon) {
    case 'zap':
      return <Zap className={`h-4 w-4 ${config.color}`} />;
    case 'moon':
      return <Moon className={`h-4 w-4 ${config.color}`} />;
    case 'hand':
      return <Hand className={`h-4 w-4 ${config.color}`} />;
  }
};

const SeverityIcon = ({ severity }: { severity: string }) => {
  switch (severity) {
    case 'critical':
    case 'high':
      return <AlertTriangle className="h-4 w-4" />;
    case 'medium':
      return <Shield className="h-4 w-4" />;
    default:
      return <Info className="h-4 w-4" />;
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "critical":
      return "bg-critical text-critical-foreground";
    case "high":
      return "bg-critical/80 text-critical-foreground";
    case "medium":
      return "bg-warning text-warning-foreground";
    case "low":
      return "bg-info text-info-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export function PrioritizedRemediationView({ findings, onFindingClick }: PrioritizedRemediationViewProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<PriorityCategory>>(
    new Set(['P0', 'P1'])
  );

  // Convert findings to prioritization format
  const findingsForPrioritization: FindingForPrioritization[] = useMemo(() => 
    findings.map(f => ({
      id: f.id,
      severity: f.severity,
      execution_tag: f.execution_tag,
      service: f.service,
      is_resolved: f.is_resolved,
      title: f.title,
      risk_score_contribution: f.risk_score_contribution,
      environment_type: 'unknown' as const, // Default - could be enhanced with account settings
    })),
    [findings]
  );

  // Calculate prioritization
  const prioritization: PrioritizationResult = useMemo(
    () => prioritizeFindings(findingsForPrioritization),
    [findingsForPrioritization]
  );

  // Group by priority category
  const groupedFindings = useMemo(() => {
    const groups: Record<PriorityCategory, typeof prioritization.execution_order> = {
      'P0': [],
      'P1': [],
      'P2': [],
      'P3': [],
    };

    prioritization.execution_order.forEach(item => {
      groups[item.priority_category].push(item);
    });

    return groups;
  }, [prioritization]);

  // Find the original finding data
  const findingMap = useMemo(() => {
    const map = new Map<string, Finding>();
    findings.forEach(f => map.set(f.id, f));
    return map;
  }, [findings]);

  const toggleCategory = (category: PriorityCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleExportPlan = () => {
    const exportData = {
      generated_at: new Date().toISOString(),
      global_recommendation: prioritization.global_recommendation,
      execution_order: prioritization.execution_order.map(item => {
        const finding = findingMap.get(item.finding_id);
        return {
          ...item,
          title: finding?.title,
          service: finding?.service,
          severity: finding?.severity,
        };
      }),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `remediation-plan-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Remediation plan exported');
  };

  const totalOpen = prioritization.execution_order.length;
  const p0Count = groupedFindings['P0'].length;
  const immediateCount = prioritization.execution_order.filter(
    p => p.recommended_execution_window === 'IMMEDIATE'
  ).length;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Prioritized Remediation Plan
              </CardTitle>
              <CardDescription className="mt-1.5">
                AI-ordered execution sequence based on risk, safety, and impact
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportPlan}>
              <FileDown className="mr-2 h-4 w-4" />
              Export Plan
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Global Recommendation */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6 border">
            <p className="text-sm font-medium mb-1">AI Recommendation</p>
            <p className="text-sm text-muted-foreground">
              {prioritization.global_recommendation}
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold">{totalOpen}</p>
              <p className="text-xs text-muted-foreground">Open Issues</p>
            </div>
            <div className="text-center p-3 bg-critical/10 rounded-lg">
              <p className="text-2xl font-bold text-critical">{p0Count}</p>
              <p className="text-xs text-muted-foreground">P0 Critical</p>
            </div>
            <div className="text-center p-3 bg-success/10 rounded-lg">
              <p className="text-2xl font-bold text-success">{immediateCount}</p>
              <p className="text-xs text-muted-foreground">Safe to Execute</p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold">{groupedFindings['P3'].length}</p>
              <p className="text-xs text-muted-foreground">Manual Only</p>
            </div>
          </div>

          {/* Priority Categories */}
          <div className="space-y-4">
            {(['P0', 'P1', 'P2', 'P3'] as PriorityCategory[]).map(category => {
              const categoryConfig = getCategoryConfig(category);
              const items = groupedFindings[category];
              const isExpanded = expandedCategories.has(category);

              if (items.length === 0) return null;

              return (
                <Collapsible key={category} open={isExpanded} onOpenChange={() => toggleCategory(category)}>
                  <Card className={`border ${categoryConfig.bgColor}`}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/20 transition-colors py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div>
                              <p className={`font-semibold ${categoryConfig.color}`}>
                                {categoryConfig.label}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {categoryConfig.description}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className={categoryConfig.color}>
                            {items.length} {items.length === 1 ? 'issue' : 'issues'}
                          </Badge>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          {items.map((item, index) => {
                            const finding = findingMap.get(item.finding_id);
                            if (!finding) return null;

                            const windowConfig = getExecutionWindowConfig(item.recommended_execution_window);

                            return (
                              <div
                                key={item.finding_id}
                                className="flex items-start gap-4 p-3 bg-background rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors"
                                onClick={() => onFindingClick(item.finding_id)}
                              >
                                {/* Order Number */}
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                                  {index + 1}
                                </div>

                                {/* Finding Details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge className={`${getSeverityColor(finding.severity)} text-xs`}>
                                      <SeverityIcon severity={finding.severity} />
                                      <span className="ml-1">{finding.severity.toUpperCase()}</span>
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {serviceNames[finding.service] || finding.service}
                                    </span>
                                  </div>
                                  <p className="font-medium text-sm truncate">{finding.title}</p>
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                    {item.reason}
                                  </p>
                                </div>

                                {/* Priority Score & Execution Window */}
                                <div className="flex-shrink-0 text-right">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Progress 
                                      value={item.priority_score} 
                                      className="w-16 h-2" 
                                    />
                                    <span className="text-xs font-medium w-8">
                                      {item.priority_score}
                                    </span>
                                  </div>
                                  <div className={`flex items-center gap-1 text-xs ${windowConfig.color}`}>
                                    <ExecutionWindowIcon window={item.recommended_execution_window} />
                                    <span>{windowConfig.label}</span>
                                  </div>
                                </div>

                                {/* Action Arrow */}
                                <ArrowUpRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>

          {/* Execution Rules */}
          <div className="mt-6 p-4 bg-muted/30 rounded-lg border">
            <p className="text-sm font-medium mb-2">Execution Rules</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• P0 items always come first</li>
              <li>• Never execute more than ONE P1 item at a time</li>
              <li>• P2 items may be batched only if services differ</li>
              <li>• P3 items must never auto-execute</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
