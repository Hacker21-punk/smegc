import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, TrendingDown, IndianRupee, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BreachCostWidgetProps {
  securityScore: number;
  totalFindings: number;
  criticalFindings: number;
}

export function BreachCostWidget({ securityScore, totalFindings, criticalFindings }: BreachCostWidgetProps) {
  const navigate = useNavigate();

  // Simple breach probability model based on findings
  const breachProbability = Math.min(
    95,
    Math.round(criticalFindings * 8 + (totalFindings - criticalFindings) * 2 + (100 - securityScore) * 0.3)
  );

  // Financial impact estimation (simplified model)
  const baseImpact = 500000; // ₹5L base
  const perFindingImpact = criticalFindings * 400000 + (totalFindings - criticalFindings) * 50000;
  const estimatedImpact = baseImpact + perFindingImpact;

  // Risk prevented (simulated monthly value)
  const riskPrevented = Math.round(estimatedImpact * 0.25);

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate("/dashboard/attack-paths")}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <IndianRupee className="h-4 w-4" />
            Breach Cost Prediction
          </CardTitle>
          <Badge variant="outline" className="text-xs">AI-Powered</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Security Score */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Shield className={`h-4 w-4 ${
                securityScore >= 80 ? "text-green-500" : securityScore >= 50 ? "text-yellow-500" : "text-destructive"
              }`} />
              <span className="text-xs text-muted-foreground">Security Score</span>
            </div>
            <p className="text-2xl font-bold">{securityScore}<span className="text-sm text-muted-foreground">/100</span></p>
          </div>

          {/* Breach Probability */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className={`h-4 w-4 ${
                breachProbability >= 40 ? "text-destructive" : breachProbability >= 20 ? "text-yellow-500" : "text-green-500"
              }`} />
              <span className="text-xs text-muted-foreground">Breach Probability</span>
            </div>
            <p className="text-2xl font-bold">{breachProbability}<span className="text-sm text-muted-foreground">%</span></p>
          </div>
        </div>

        {/* Financial Impact */}
        <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/10">
          <p className="text-xs text-muted-foreground mb-1">Estimated Financial Impact</p>
          <p className="text-xl font-bold text-destructive">
            ₹{estimatedImpact.toLocaleString("en-IN")}
          </p>
        </div>

        {/* Risk Prevented */}
        <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown className="h-3 w-3 text-green-500" />
            <p className="text-xs text-muted-foreground">Risk Prevented This Month</p>
          </div>
          <p className="text-xl font-bold text-green-600">
            ₹{riskPrevented.toLocaleString("en-IN")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
