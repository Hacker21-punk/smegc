import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, Shield, Server } from "lucide-react";

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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-critical/10 text-critical border-critical/20";
      case "high":
        return "bg-critical/10 text-critical border-critical/20";
      case "medium":
        return "bg-warning/10 text-warning border-warning/20";
      case "low":
        return "bg-info/10 text-info border-info/20";
      default:
        return "";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Recent Alerts
        </CardTitle>
        <Badge variant="secondary">{alerts.length} new</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.slice(0, 5).map((alert) => (
          <div
            key={alert.id}
            className={`flex items-start gap-3 p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}
          >
            <div className="mt-0.5">{getIcon(alert.type)}</div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{alert.title}</p>
              <p className="text-xs opacity-80 truncate">{alert.description}</p>
              <p className="text-xs opacity-60 mt-1">{alert.timestamp}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
