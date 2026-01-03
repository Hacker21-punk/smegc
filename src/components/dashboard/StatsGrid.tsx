import { Card, CardContent } from "@/components/ui/card";
import { Shield, AlertTriangle, Server, FileText, IndianRupee } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  trend?: { value: number; positive: boolean };
}

function StatCard({ title, value, description, icon, trend }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
            {trend && (
              <p className={`text-xs mt-1 ${trend.positive ? "text-success" : "text-critical"}`}>
                {trend.positive ? "↓" : "↑"} {Math.abs(trend.value)}% from last week
              </p>
            )}
          </div>
          <div className="p-3 rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface StatsGridProps {
  totalFindings: number;
  criticalFindings: number;
  resourcesScanned: number;
  complianceScore: number;
  estimatedCostAnomaly: number;
}

export function StatsGrid({ 
  totalFindings, 
  criticalFindings, 
  resourcesScanned, 
  complianceScore,
  estimatedCostAnomaly 
}: StatsGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <StatCard
        title="Total Findings"
        value={totalFindings}
        description="Active security issues"
        icon={<Shield className="h-5 w-5" />}
        trend={{ value: 12, positive: true }}
      />
      <StatCard
        title="Critical Issues"
        value={criticalFindings}
        description="Require immediate action"
        icon={<AlertTriangle className="h-5 w-5" />}
      />
      <StatCard
        title="Resources Scanned"
        value={resourcesScanned}
        description="Across all accounts"
        icon={<Server className="h-5 w-5" />}
      />
      <StatCard
        title="Compliance Score"
        value={`${complianceScore}%`}
        description="IT Act & GST aligned"
        icon={<FileText className="h-5 w-5" />}
      />
      <StatCard
        title="Cost Anomaly"
        value={`₹${estimatedCostAnomaly.toLocaleString('en-IN')}`}
        description="Unusual spending detected"
        icon={<IndianRupee className="h-5 w-5" />}
      />
    </div>
  );
}
