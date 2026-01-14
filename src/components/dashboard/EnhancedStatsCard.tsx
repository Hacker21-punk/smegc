import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EnhancedStatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: { value: number; positive: boolean };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'critical';
  className?: string;
}

export function EnhancedStatsCard({ 
  title, 
  value, 
  description, 
  icon, 
  trend,
  variant = 'default',
  className 
}: EnhancedStatsCardProps) {
  const variantStyles = {
    default: {
      iconBg: 'bg-muted',
      iconColor: 'text-muted-foreground',
      valueColor: 'text-foreground'
    },
    primary: {
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      valueColor: 'text-primary'
    },
    success: {
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
      valueColor: 'text-success'
    },
    warning: {
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
      valueColor: 'text-warning'
    },
    critical: {
      iconBg: 'bg-critical/10',
      iconColor: 'text-critical',
      valueColor: 'text-critical'
    }
  };

  const styles = variantStyles[variant];

  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-200 hover:shadow-md",
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={cn("text-3xl font-bold tracking-tight", styles.valueColor)}>
              {value}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {trend && (
              <div className={cn(
                "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                trend.positive 
                  ? "bg-success/10 text-success" 
                  : "bg-critical/10 text-critical"
              )}>
                <span>{trend.positive ? "↓" : "↑"}</span>
                <span>{Math.abs(trend.value)}% from last week</span>
              </div>
            )}
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
