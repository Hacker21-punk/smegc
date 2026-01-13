import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, TrendingDown, TrendingUp, Minus, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

interface ExecutiveSummaryProps {
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  resolvedCount: number;
  overallRiskScore: number;
  previousRiskScore: number;
  accountsCount: number;
}

type RiskPosture = "low" | "medium" | "high";
type RiskTrend = "improving" | "unchanged" | "worsening";

export function ExecutiveSummary({
  totalFindings,
  criticalCount,
  highCount,
  mediumCount,
  lowCount,
  resolvedCount,
  overallRiskScore,
  previousRiskScore,
  accountsCount,
}: ExecutiveSummaryProps) {
  // Determine overall security posture
  const getSecurityPosture = (): RiskPosture => {
    if (overallRiskScore <= 30) return "low";
    if (overallRiskScore <= 60) return "medium";
    return "high";
  };

  // Determine risk trend
  const getRiskTrend = (): RiskTrend => {
    const diff = overallRiskScore - previousRiskScore;
    if (diff < -5) return "improving";
    if (diff > 5) return "worsening";
    return "unchanged";
  };

  // Generate top business risks in plain English
  const getTopBusinessRisks = (): string[] => {
    const risks: string[] = [];
    
    if (criticalCount > 0) {
      risks.push(
        `${criticalCount} urgent issue${criticalCount > 1 ? 's' : ''} could allow unauthorized access to your business systems`
      );
    }
    
    if (highCount > 0) {
      risks.push(
        `${highCount} important concern${highCount > 1 ? 's' : ''} may expose sensitive business data if not addressed`
      );
    }
    
    if (risks.length === 0 && mediumCount > 0) {
      risks.push(
        `${mediumCount} moderate issue${mediumCount > 1 ? 's' : ''} should be reviewed when convenient`
      );
    }
    
    if (risks.length === 0) {
      risks.push("No significant business risks identified at this time");
    }
    
    return risks.slice(0, 2);
  };

  // Generate what has been secured
  const getSecuredSummary = (): string => {
    if (resolvedCount === 0 && totalFindings === 0) {
      return `${accountsCount} cloud account${accountsCount !== 1 ? 's' : ''} monitored with no issues detected`;
    }
    if (resolvedCount > 0) {
      return `${resolvedCount} security issue${resolvedCount > 1 ? 's have' : ' has'} been successfully fixed`;
    }
    return `${accountsCount} account${accountsCount !== 1 ? 's are' : ' is'} being actively monitored for threats`;
  };

  // Generate what needs attention
  const getAttentionSummary = (): string => {
    const urgentCount = criticalCount + highCount;
    if (urgentCount > 0) {
      return `${urgentCount} issue${urgentCount > 1 ? 's require' : ' requires'} your attention to protect your business`;
    }
    if (mediumCount + lowCount > 0) {
      return `${mediumCount + lowCount} minor item${mediumCount + lowCount > 1 ? 's' : ''} can be reviewed at your convenience`;
    }
    return "Your cloud environment is well-protected";
  };

  // Generate next step recommendation
  const getNextStep = (): string => {
    if (criticalCount > 0) {
      return "Review the critical issues with your IT team or contact support for guidance";
    }
    if (highCount > 0) {
      return "Schedule time this week to address the important security concerns";
    }
    if (mediumCount > 0) {
      return "Consider reviewing moderate issues during your next IT check-in";
    }
    if (totalFindings > 0) {
      return "Keep monitoring your dashboard to stay ahead of any new issues";
    }
    return "Continue regular monitoring to maintain your strong security posture";
  };

  const posture = getSecurityPosture();
  const trend = getRiskTrend();
  const topRisks = getTopBusinessRisks();

  const postureConfig = {
    low: {
      label: "Low Risk",
      description: "Your business is well-protected",
      color: "bg-success/10 text-success border-success/20",
      iconColor: "text-success",
    },
    medium: {
      label: "Medium Risk",
      description: "Some areas need attention",
      color: "bg-warning/10 text-warning border-warning/20",
      iconColor: "text-warning",
    },
    high: {
      label: "High Risk",
      description: "Immediate attention recommended",
      color: "bg-critical/10 text-critical border-critical/20",
      iconColor: "text-critical",
    },
  };

  const trendConfig = {
    improving: {
      label: "Improving",
      Icon: TrendingDown,
      color: "text-success",
    },
    unchanged: {
      label: "Stable",
      Icon: Minus,
      color: "text-muted-foreground",
    },
    worsening: {
      label: "Needs attention",
      Icon: TrendingUp,
      color: "text-critical",
    },
  };

  const config = postureConfig[posture];
  const trendInfo = trendConfig[trend];

  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-1 h-full ${posture === 'low' ? 'bg-success' : posture === 'medium' ? 'bg-warning' : 'bg-critical'}`} />
      
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.color}`}>
              <Shield className={`h-5 w-5 ${config.iconColor}`} />
            </div>
            <div>
              <CardTitle className="text-lg">Security Summary</CardTitle>
              <p className="text-sm text-muted-foreground">For business decision-makers</p>
            </div>
          </div>
          <Badge variant="outline" className={config.color}>
            {config.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Posture */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
          <div>
            <p className="font-medium">Overall Security Posture</p>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <trendInfo.Icon className={`h-4 w-4 ${trendInfo.color}`} />
            <span className={`text-sm font-medium ${trendInfo.color}`}>
              {trendInfo.label}
            </span>
          </div>
        </div>

        {/* Top Business Risks */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Top Business Risks
          </h4>
          <ul className="space-y-2">
            {topRisks.map((risk, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-warning mt-0.5">•</span>
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* What's Been Secured */}
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            What's Been Secured
          </h4>
          <p className="text-sm text-muted-foreground">{getSecuredSummary()}</p>
        </div>

        {/* What Needs Attention */}
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            What Needs Attention
          </h4>
          <p className="text-sm text-muted-foreground">{getAttentionSummary()}</p>
        </div>

        {/* Next Step */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-primary" />
            Recommended Next Step
          </h4>
          <p className="text-sm text-foreground">{getNextStep()}</p>
        </div>
      </CardContent>
    </Card>
  );
}
