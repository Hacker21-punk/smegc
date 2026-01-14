import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, TrendingUp, Minus, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface RiskScoreCardProps {
  score: number;
  previousScore: number;
  accountName: string;
}

export function RiskScoreCard({ score, previousScore, accountName }: RiskScoreCardProps) {
  const trend = score - previousScore;
  
  const getScoreColor = (s: number) => {
    if (s <= 30) return "text-success";
    if (s <= 60) return "text-warning";
    return "text-critical";
  };

  const getScoreBg = (s: number) => {
    if (s <= 30) return "from-success/20 to-success/5";
    if (s <= 60) return "from-warning/20 to-warning/5";
    return "from-critical/20 to-critical/5";
  };

  const getScoreRing = (s: number) => {
    if (s <= 30) return "ring-success/20";
    if (s <= 60) return "ring-warning/20";
    return "ring-critical/20";
  };

  const getScoreLabel = (s: number) => {
    if (s <= 30) return "Low Risk";
    if (s <= 60) return "Medium Risk";
    return "High Risk";
  };

  const getProgressColor = (s: number) => {
    if (s <= 30) return "bg-success";
    if (s <= 60) return "bg-warning";
    return "bg-critical";
  };

  // Calculate the circumference and offset for the circular progress
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 hover:shadow-lg",
      "ring-1",
      getScoreRing(score)
    )}>
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-50",
        getScoreBg(score)
      )} />
      <CardHeader className="relative pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Shield className="h-4 w-4" />
          {accountName}
        </CardTitle>
      </CardHeader>
      <CardContent className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Circular Progress Ring */}
            <div className="relative h-24 w-24">
              <svg className="h-24 w-24 -rotate-90 transform">
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-muted/30"
                />
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  className={cn(
                    "transition-all duration-700 ease-out",
                    getScoreColor(score)
                  )}
                  style={{
                    stroke: `hsl(var(--${score <= 30 ? 'success' : score <= 60 ? 'warning' : 'critical'}))`
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn("text-2xl font-bold", getScoreColor(score))}>
                  {score}
                </span>
                <span className="text-[10px] text-muted-foreground">/ 100</span>
              </div>
            </div>
            <div>
              <p className={cn("text-lg font-semibold", getScoreColor(score))}>
                {getScoreLabel(score)}
              </p>
              <p className="text-xs text-muted-foreground">Security Score</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium",
              trend < 0 ? "bg-success/10 text-success" : 
              trend > 0 ? "bg-critical/10 text-critical" : 
              "bg-muted text-muted-foreground"
            )}>
              {trend < 0 ? (
                <TrendingDown className="h-3.5 w-3.5" />
              ) : trend > 0 ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <Minus className="h-3.5 w-3.5" />
              )}
              <span>{Math.abs(trend)} pts</span>
            </div>
            <span className="text-xs text-muted-foreground">vs last week</span>
          </div>
        </div>
        {/* Bottom progress bar */}
        <div className="mt-4 h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-700 ease-out",
              getProgressColor(score)
            )}
            style={{ width: `${score}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
