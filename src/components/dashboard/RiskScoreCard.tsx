import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

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
    if (s <= 30) return "bg-success/10";
    if (s <= 60) return "bg-warning/10";
    return "bg-critical/10";
  };

  const getScoreLabel = (s: number) => {
    if (s <= 30) return "Low Risk";
    if (s <= 60) return "Medium Risk";
    return "High Risk";
  };

  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute inset-0 ${getScoreBg(score)} opacity-50`} />
      <CardHeader className="relative pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {accountName}
        </CardTitle>
      </CardHeader>
      <CardContent className="relative">
        <div className="flex items-end justify-between">
          <div>
            <div className={`text-5xl font-bold ${getScoreColor(score)}`}>
              {score}
            </div>
            <p className={`text-sm font-medium ${getScoreColor(score)}`}>
              {getScoreLabel(score)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1">
              {trend < 0 ? (
                <TrendingDown className="h-4 w-4 text-success" />
              ) : trend > 0 ? (
                <TrendingUp className="h-4 w-4 text-critical" />
              ) : (
                <Minus className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={trend < 0 ? "text-success" : trend > 0 ? "text-critical" : "text-muted-foreground"}>
                {Math.abs(trend)} pts
              </span>
            </div>
            <span className="text-xs text-muted-foreground">vs last week</span>
          </div>
        </div>
        <div className="mt-4 h-2 w-full rounded-full bg-muted overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              score <= 30 ? "bg-success" : score <= 60 ? "bg-warning" : "bg-critical"
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
