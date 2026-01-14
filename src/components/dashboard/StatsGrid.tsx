import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, AlertTriangle, Server, FileText, IndianRupee, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  trend?: { value: number; positive: boolean };
  variant?: 'default' | 'critical' | 'success' | 'warning' | 'info';
}

function StatCard({ title, value, description, icon, trend, variant = 'default' }: StatCardProps) {
  const variantStyles = {
    default: {
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      ring: 'ring-primary/10'
    },
    critical: {
      iconBg: 'bg-critical/10',
      iconColor: 'text-critical',
      ring: 'ring-critical/10'
    },
    success: {
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
      ring: 'ring-success/10'
    },
    warning: {
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
      ring: 'ring-warning/10'
    },
    info: {
      iconBg: 'bg-info/10',
      iconColor: 'text-info',
      ring: 'ring-info/10'
    }
  };

  const styles = variantStyles[variant];

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-200 hover:shadow-md",
      "ring-1",
      styles.ring
    )}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold tracking-tight">{value}</p>
              {trend && (
                <div className={cn(
                  "flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full",
                  trend.positive 
                    ? "bg-success/10 text-success" 
                    : "bg-critical/10 text-critical"
                )}>
                  {trend.positive ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : (
                    <TrendingUp className="h-3 w-3" />
                  )}
                  {Math.abs(trend.value)}%
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className={cn(
            "p-3 rounded-xl transition-transform hover:scale-105",
            styles.iconBg,
            styles.iconColor
          )}>
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
        variant="default"
      />
      <StatCard
        title="Critical Issues"
        value={criticalFindings}
        description="Require immediate action"
        icon={<AlertTriangle className="h-5 w-5" />}
        variant={criticalFindings > 0 ? "critical" : "success"}
      />
      <StatCard
        title="Resources Scanned"
        value={resourcesScanned.toLocaleString()}
        description="Across all accounts"
        icon={<Server className="h-5 w-5" />}
        variant="info"
      />
      <StatCard
        title="Compliance Score"
        value={`${complianceScore}%`}
        description="IT Act & GST aligned"
        icon={<FileText className="h-5 w-5" />}
        variant={complianceScore >= 80 ? "success" : complianceScore >= 50 ? "warning" : "critical"}
      />
      <StatCard
        title="Cost Anomaly"
        value={`₹${estimatedCostAnomaly.toLocaleString('en-IN')}`}
        description="Unusual spending detected"
        icon={<IndianRupee className="h-5 w-5" />}
        variant={estimatedCostAnomaly > 0 ? "warning" : "success"}
      />
    </div>
  );
}
