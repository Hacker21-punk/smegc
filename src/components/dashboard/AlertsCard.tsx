import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, Shield, Server, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  timestamp: string;
  type: "security" | "cost" | "compliance";
}

interface AlertsCardProps {
  alerts: Alert[];
}

export function AlertsCard({ alerts }: AlertsCardProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "security":
        return <Shield className="h-4 w-4" />;
      case "cost":
        return <Server className="h-4 w-4" />;
      case "compliance":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case "critical":
        return {
          bg: "bg-critical/10",
          border: "border-critical/20",
          text: "text-critical",
          iconBg: "bg-critical/20",
          dot: "bg-critical"
        };
      case "high":
        return {
          bg: "bg-critical/5",
          border: "border-critical/10",
          text: "text-critical",
          iconBg: "bg-critical/15",
          dot: "bg-critical/80"
        };
      case "medium":
        return {
          bg: "bg-warning/10",
          border: "border-warning/20",
          text: "text-warning",
          iconBg: "bg-warning/20",
          dot: "bg-warning"
        };
      case "low":
        return {
          bg: "bg-info/10",
          border: "border-info/20",
          text: "text-info",
          iconBg: "bg-info/20",
          dot: "bg-info"
        };
      default:
        return {
          bg: "bg-muted",
          border: "border-border",
          text: "text-muted-foreground",
          iconBg: "bg-muted",
          dot: "bg-muted-foreground"
        };
    }
  };

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const highCount = alerts.filter(a => a.severity === 'high').length;

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Bell className="h-4 w-4 text-primary" />
            </div>
            Recent Alerts
          </CardTitle>
          <CardDescription className="text-xs">
            {alerts.length > 0 ? `${alerts.length} alerts require attention` : 'No recent alerts'}
          </CardDescription>
        </div>
        {alerts.length > 0 && (
          <div className="flex items-center gap-1">
            {criticalCount > 0 && (
              <Badge variant="outline" className="bg-critical/10 text-critical border-critical/20 text-xs">
                {criticalCount} Critical
              </Badge>
            )}
            {highCount > 0 && (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-xs">
                {highCount} High
              </Badge>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 space-y-2 overflow-hidden">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-3 rounded-full bg-success/10 mb-3">
              <Shield className="h-6 w-6 text-success" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">All clear!</p>
            <p className="text-xs text-muted-foreground/70">No alerts to display</p>
          </div>
        ) : (
          alerts.slice(0, 4).map((alert, index) => {
            const config = getSeverityConfig(alert.severity);
            return (
              <div
                key={alert.id}
                className={cn(
                  "group flex items-start gap-3 p-3 rounded-lg border transition-all duration-200",
                  "hover:shadow-sm cursor-pointer",
                  config.bg,
                  config.border
                )}
              >
                <div className={cn(
                  "mt-0.5 p-1.5 rounded-md",
                  config.iconBg,
                  config.text
                )}>
                  {getIcon(alert.type)}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("font-medium text-sm leading-tight", config.text)}>
                      {alert.title}
                    </p>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {alert.description}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70">{alert.timestamp}</p>
                </div>
              </div>
            );
          })
        )}
        {alerts.length > 4 && (
          <button className="w-full py-2 text-xs text-primary hover:text-primary/80 font-medium transition-colors">
            View all {alerts.length} alerts →
          </button>
        )}
      </CardContent>
    </Card>
  );
}
