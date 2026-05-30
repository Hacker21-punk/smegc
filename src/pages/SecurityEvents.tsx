import { EmptyState } from "@/components/dashboard/EmptyState";
import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity,
  AlertTriangle,
  Shield,
  Key,
  Globe,
  Server,
  Database,
  Lock,
  Eye,
  Zap,
} from "lucide-react";

interface SecurityEvent {
  id: string;
  timestamp: string;
  source: "CloudTrail" | "VPC Flow" | "K8s Audit" | "Auth Events" | "WAF";
  severity: "critical" | "high" | "medium" | "low" | "info";
  event: string;
  details: string;
  icon: React.ReactNode;
}

const BASE_EVENTS: Omit<SecurityEvent, "id" | "timestamp">[] = [];

const severityColors: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  info: "bg-muted text-muted-foreground border-border",
};

function generateTime(offset: number) {
  const d = new Date(Date.now() - offset * 1000);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function SecurityEvents() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [events, setEvents] = useState<SecurityEvent[]>(() =>
    BASE_EVENTS.map((e, i) => ({ ...e, id: `evt-${i}`, timestamp: generateTime(i * 120) }))
  );

  // Live stream from cloud audit sources — disabled until a cloud account is connected.
  useEffect(() => {
    if (BASE_EVENTS.length === 0) return;
    const interval = setInterval(() => {
      const randomEvent = BASE_EVENTS[Math.floor(Math.random() * BASE_EVENTS.length)];
      if (!randomEvent) return;
      const newEvent: SecurityEvent = {
        ...randomEvent,
        id: `evt-${Date.now()}`,
        timestamp: generateTime(0),
      };
      setEvents(prev => [newEvent, ...prev].slice(0, 50));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const isLive = events.length > 0;

  const critCount = events.filter(e => e.severity === "critical").length;
  const highCount = events.filter(e => e.severity === "high").length;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} lastScanTime="" onRefresh={() => {}} />
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="md:ml-64 pt-16">
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              Real-Time Security Events
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
            </h1>
            <p className="text-muted-foreground">Live streaming analysis of security events from cloud audit logs, network traffic, and authentication</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{events.length}</p><p className="text-xs text-muted-foreground">Events (Last Hour)</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-destructive">{critCount}</p><p className="text-xs text-muted-foreground">Critical</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-orange-500">{highCount}</p><p className="text-xs text-muted-foreground">High</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">5</p><p className="text-xs text-muted-foreground">Sources</p></CardContent></Card>
          </div>

          {events.length === 0 ? (
            <EmptyState
              icon={<Activity className="h-7 w-7" />}
              title="No security events yet"
              description="Connect a cloud account to start streaming real-time security events from CloudTrail, VPC Flow Logs, Kubernetes audit, and authentication sources."
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Event Stream
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {events.map(e => (
                      <div key={e.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                          {e.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={`text-[10px] ${severityColors[e.severity]}`}>{e.severity}</Badge>
                            <Badge variant="outline" className="text-[10px]">{e.source}</Badge>
                            <span className="text-[10px] text-muted-foreground ml-auto">{e.timestamp}</span>
                          </div>
                          <p className="font-medium text-sm mt-1">{e.event}</p>
                          <p className="text-xs text-muted-foreground">{e.details}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
