import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Shield, Info, TrendingDown } from "lucide-react";

interface RiskScoreBreakdownProps {
  score: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  topIssues?: Array<{
    title: string;
    severity: string;
    resource_id: string;
  }>;
}

export function RiskScoreBreakdown({
  score,
  criticalCount,
  highCount,
  mediumCount,
  lowCount,
  topIssues = [],
}: RiskScoreBreakdownProps) {
  // Risk score calculation breakdown (matches aws-scanner logic)
  const criticalPoints = criticalCount * 10;
  const highPoints = highCount * 5;
  const mediumPoints = mediumCount * 2;
  const lowPoints = lowCount * 1;

  const getScoreColor = (s: number) => {
    if (s <= 25) return "text-success";
    if (s <= 50) return "text-info";
    if (s <= 75) return "text-warning";
    return "text-critical";
  };

  const getScoreLabel = (s: number) => {
    if (s <= 25) return "Low Risk";
    if (s <= 50) return "Moderate Risk";
    if (s <= 75) return "High Risk";
    return "Critical Risk";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Risk Score Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="text-center">
          <div className={`text-5xl font-bold ${getScoreColor(score)}`}>
            {score}
            <span className="text-2xl text-muted-foreground">/100</span>
          </div>
          <p className={`text-sm font-medium ${getScoreColor(score)}`}>
            {getScoreLabel(score)}
          </p>
        </div>

        <Progress value={score} className="h-2" />

        {/* Breakdown by Severity */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Contributing Factors
          </h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-lg bg-critical/10">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-critical" />
                <span className="text-sm">Critical ({criticalCount})</span>
              </div>
              <span className="text-sm font-medium text-critical">
                +{criticalPoints} pts
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-critical/5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-critical/70" />
                <span className="text-sm">High ({highCount})</span>
              </div>
              <span className="text-sm font-medium text-critical/70">
                +{highPoints} pts
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-warning/10">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-warning" />
                <span className="text-sm">Medium ({mediumCount})</span>
              </div>
              <span className="text-sm font-medium text-warning">
                +{mediumPoints} pts
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-info/10">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-info" />
                <span className="text-sm">Low ({lowCount})</span>
              </div>
              <span className="text-sm font-medium text-info">
                +{lowPoints} pts
              </span>
            </div>
          </div>
        </div>

        {/* Top Issues */}
        {topIssues.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Top Priority Issues
            </h4>
            <div className="space-y-2">
              {topIssues.slice(0, 3).map((issue, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-2 p-2 rounded-lg bg-muted/50"
                >
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{issue.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {issue.resource_id}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Tip */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-success/10 text-success">
          <TrendingDown className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p className="text-sm">
            Fix critical and high severity issues first to reduce your risk score quickly.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}