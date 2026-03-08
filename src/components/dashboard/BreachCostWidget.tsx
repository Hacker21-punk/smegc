import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, TrendingDown, IndianRupee, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface BreachCostWidgetProps {
  securityScore: number;
  totalFindings: number;
  criticalFindings: number;
}

export function BreachCostWidget({ securityScore, totalFindings, criticalFindings }: BreachCostWidgetProps) {
  const navigate = useNavigate();

  const breachProbability = Math.min(
    95,
    Math.round(criticalFindings * 8 + (totalFindings - criticalFindings) * 2 + (100 - securityScore) * 0.3)
  );

  const baseImpact = 500000;
  const perFindingImpact = criticalFindings * 400000 + (totalFindings - criticalFindings) * 50000;
  const estimatedImpact = baseImpact + perFindingImpact;
  const riskPrevented = Math.round(estimatedImpact * 0.25);

  return (
    <Card
      className="card-premium cursor-pointer group"
      onClick={() => navigate("/dashboard/attack-paths")}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <IndianRupee className="h-4 w-4 text-primary" />
            </div>
            Breach Cost Prediction
          </CardTitle>
          <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/20 text-primary">AI-Powered</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-muted/50 space-y-1">
            <div className="flex items-center gap-1.5">
              <Shield className={cn("h-3.5 w-3.5",
                securityScore >= 80 ? "text-success" : securityScore >= 50 ? "text-warning" : "text-critical"
              )} />
              <span className="text-[11px] text-muted-foreground font-medium">Security Score</span>
            </div>
            <p className="text-xl font-bold tabular-nums">{securityScore}<span className="text-xs text-muted-foreground">/100</span></p>
          </div>
          <div className="p-3 rounded-xl bg-muted/50 space-y-1">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className={cn("h-3.5 w-3.5",
                breachProbability >= 40 ? "text-critical" : breachProbability >= 20 ? "text-warning" : "text-success"
              )} />
              <span className="text-[11px] text-muted-foreground font-medium">Breach Probability</span>
            </div>
            <p className="text-xl font-bold tabular-nums">{breachProbability}<span className="text-xs text-muted-foreground">%</span></p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-critical/5 border border-critical/10">
          <p className="text-[11px] text-muted-foreground mb-0.5 font-medium">Estimated Financial Impact</p>
          <p className="text-lg font-bold text-critical tabular-nums">
            ₹{estimatedImpact.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-success/5 border border-success/10">
          <div className="flex items-center gap-1.5 mb-0.5">
            <TrendingDown className="h-3 w-3 text-success" />
            <p className="text-[11px] text-muted-foreground font-medium">Risk Prevented This Month</p>
          </div>
          <p className="text-lg font-bold text-success tabular-nums">
            ₹{riskPrevented.toLocaleString("en-IN")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}