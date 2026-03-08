import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { GlassCard } from "@/components/ui/glass-card";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  ShieldAlert,
  Radar,
  Activity,
  Zap,
  AlertTriangle,
  Eye,
  Key,
  Database,
  Container,
  Shield,
  CheckCircle2,
  Play,
  RefreshCw,
  Clock,
  Target,
  XCircle,
  Flame,
  TrendingUp,
  Radio,
  Crosshair,
} from "lucide-react";
import {
  getRuntimeSummary,
  simulateRuntimeEvents,
  resolveThreat,
  resolveAlert,
  executeIncidentResponse,
  type RuntimeSummary,
  type ThreatDetection,
  type SecurityAlert,
  type IncidentResponse,
} from "@/lib/runtime-security-service";

const severityConfig: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  critical: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/30",
    glow: "shadow-[0_0_15px_-3px_hsl(var(--destructive)/0.3)]",
  },
  high: {
    bg: "bg-warning/10",
    text: "text-warning",
    border: "border-warning/30",
    glow: "shadow-[0_0_15px_-3px_hsl(var(--warning)/0.3)]",
  },
  medium: {
    bg: "bg-info/10",
    text: "text-info",
    border: "border-info/30",
    glow: "",
  },
  low: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/30",
    glow: "",
  },
};

const categoryIcons: Record<string, React.ReactNode> = {
  credential_abuse: <Key className="h-4 w-4" />,
  privilege_escalation: <ShieldAlert className="h-4 w-4" />,
  data_exfiltration: <Database className="h-4 w-4" />,
  container_compromise: <Container className="h-4 w-4" />,
};

const categoryColors: Record<string, string> = {
  credential_abuse: "text-warning",
  privilege_escalation: "text-destructive",
  data_exfiltration: "text-critical",
  container_compromise: "text-info",
};

function SeverityBadge({ severity }: { severity: string }) {
  const config = severityConfig[severity] || severityConfig.medium;
  return (
    <Badge variant="outline" className={`${config.bg} ${config.text} ${config.border} font-semibold uppercase text-[9px] tracking-wider px-2`}>
      {severity}
    </Badge>
  );
}

function LiveIndicator({ size = "md" }: { size?: "sm" | "md" }) {
  const dims = size === "sm" ? "h-2 w-2" : "h-3 w-3";
  return (
    <span className={`relative flex ${dims}`}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
      <span className={`relative inline-flex rounded-full ${dims} bg-success`} />
    </span>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  variant: "destructive" | "warning" | "info" | "primary";
  delay: string;
}

function StatCard({ icon, value, label, variant, delay }: StatCardProps) {
  const variantStyles: Record<string, { ring: string; iconBg: string; valueColor: string }> = {
    destructive: {
      ring: "ring-1 ring-destructive/20",
      iconBg: "bg-destructive/10",
      valueColor: "text-destructive",
    },
    warning: {
      ring: "ring-1 ring-warning/20",
      iconBg: "bg-warning/10",
      valueColor: "text-warning",
    },
    info: {
      ring: "ring-1 ring-info/20",
      iconBg: "bg-info/10",
      valueColor: "text-info",
    },
    primary: {
      ring: "ring-1 ring-primary/20",
      iconBg: "bg-primary/10",
      valueColor: "text-primary",
    },
  };

  const style = variantStyles[variant];

  return (
    <GlassCard intensity="medium" className={`animate-fade-in-up opacity-0 ${delay} ${style.ring} overflow-hidden relative group`}>
      {/* Shimmer overlay on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-shimmer pointer-events-none" />
      <CardContent className="p-5 relative">
        <div className="flex items-center justify-between mb-3">
          <div className={`h-10 w-10 rounded-xl ${style.iconBg} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
            {icon}
          </div>
          {value > 0 && variant === "destructive" && (
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
            </span>
          )}
        </div>
        <p className={`text-3xl font-bold ${style.valueColor} tracking-tight`}>
          <AnimatedCounter value={value} duration={800} />
        </p>
        <p className="text-xs text-muted-foreground font-medium mt-1 uppercase tracking-wider">{label}</p>
      </CardContent>
    </GlassCard>
  );
}

export default function RuntimeSecurity() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [summary, setSummary] = useState<RuntimeSummary | null>(null);
  const [threats, setThreats] = useState<ThreatDetection[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [responses, setResponses] = useState<IncidentResponse[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [selectedThreat, setSelectedThreat] = useState<ThreatDetection | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getRuntimeSummary();
      setSummary(data.summary);
      setThreats(data.threats || []);
      setAlerts(data.alerts || []);
      setResponses(data.recent_responses || []);
      setRecentEvents(data.recent_events || []);
    } catch (err: any) {
      console.error("Failed to fetch runtime data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("runtime-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "threat_detections" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "security_alerts" }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      const result = await simulateRuntimeEvents();
      toast.success(`Simulated ${result.events_simulated} events → ${result.threats} threats, ${result.alerts} alerts`);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Simulation failed");
    } finally {
      setSimulating(false);
    }
  };

  const handleResolveThreat = async (id: string) => {
    try {
      await resolveThreat(id);
      toast.success("Threat resolved");
      await fetchData();
      setSelectedThreat(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleResolveAlert = async (id: string) => {
    try {
      await resolveAlert(id);
      toast.success("Alert resolved");
      await fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleExecuteResponse = async (id: string) => {
    try {
      await executeIncidentResponse(id);
      toast.success("Response action executed");
      await fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} lastScanTime="" onRefresh={fetchData} />
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="md:ml-64 pt-16">
        <div className="p-6 max-w-7xl mx-auto space-y-8">

          {/* ═══ HEADER ═══ */}
          <div className="flex items-center justify-between flex-wrap gap-4 animate-fade-in-up opacity-0 stagger-1">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center animate-pulse-glow">
                  <Radar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
                    Runtime Attack Detection
                    <LiveIndicator />
                  </h1>
                  <p className="text-sm text-muted-foreground">Real-time cloud attack detection & automated response</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={fetchData} disabled={loading} className="group">
                <RefreshCw className={`h-4 w-4 mr-2 transition-transform group-hover:rotate-180 duration-500 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button onClick={handleSimulate} disabled={simulating} className="relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary-foreground/10 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                {simulating ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Flame className="h-4 w-4 mr-2 transition-transform group-hover:scale-110" />
                )}
                {simulating ? "Simulating..." : "Simulate Attack"}
              </Button>
            </div>
          </div>

          {/* ═══ STAT CARDS ═══ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<ShieldAlert className="h-5 w-5 text-destructive" />}
              value={summary?.active_threats ?? 0}
              label="Active Threats"
              variant="destructive"
              delay="stagger-2"
            />
            <StatCard
              icon={<Key className="h-5 w-5 text-warning" />}
              value={summary?.suspicious_logins ?? 0}
              label="Suspicious Logins"
              variant="warning"
              delay="stagger-3"
            />
            <StatCard
              icon={<TrendingUp className="h-5 w-5 text-info" />}
              value={summary?.escalation_attempts ?? 0}
              label="Escalation Attempts"
              variant="info"
              delay="stagger-4"
            />
            <StatCard
              icon={<Zap className="h-5 w-5 text-primary" />}
              value={summary?.autopilot_actions ?? 0}
              label="Autopilot Actions"
              variant="primary"
              delay="stagger-5"
            />
          </div>

          {/* ═══ TABS ═══ */}
          <div className="animate-fade-in-up opacity-0 stagger-6">
            <Tabs defaultValue="threats" className="space-y-4">
              <TabsList className="bg-muted/50 backdrop-blur-sm p-1">
                <TabsTrigger value="threats" className="gap-2 data-[state=active]:shadow-md">
                  <Crosshair className="h-3.5 w-3.5" />
                  Threats
                  {threats.length > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 min-w-5 text-[10px] font-bold animate-scale-in">{threats.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="alerts" className="gap-2 data-[state=active]:shadow-md">
                  <Radio className="h-3.5 w-3.5" />
                  Alerts
                  {alerts.length > 0 && (
                    <Badge variant="outline" className="ml-1 h-5 min-w-5 text-[10px] font-bold">{alerts.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="responses" className="gap-2 data-[state=active]:shadow-md">
                  <Zap className="h-3.5 w-3.5" />
                  Responses
                </TabsTrigger>
                <TabsTrigger value="events" className="gap-2 data-[state=active]:shadow-md">
                  <Activity className="h-3.5 w-3.5" />
                  Event Stream
                </TabsTrigger>
              </TabsList>

              {/* ─── THREATS TAB ─── */}
              <TabsContent value="threats">
                <GlassCard intensity="light" hover={false} className="overflow-hidden">
                  <CardHeader className="border-b border-border/50 bg-muted/30">
                    <CardTitle className="flex items-center gap-2.5 text-base">
                      <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                        <ShieldAlert className="h-4 w-4 text-destructive" />
                      </div>
                      Active Threat Detections
                      {threats.length > 0 && (
                        <span className="text-xs text-muted-foreground font-normal">({threats.length} active)</span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {threats.length === 0 ? (
                      <div className="text-center py-16 text-muted-foreground">
                        <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                          <Shield className="h-8 w-8 opacity-30" />
                        </div>
                        <p className="font-medium">No active threats detected</p>
                        <p className="text-sm mt-1">Click "Simulate Attack" to test the detection engine</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[420px]">
                        <div className="divide-y divide-border/50">
                          {threats.map((t, i) => {
                            const config = severityConfig[t.severity] || severityConfig.medium;
                            return (
                              <div
                                key={t.id}
                                className={`flex items-start gap-4 p-4 hover:bg-muted/30 transition-all duration-300 cursor-pointer group animate-slide-up-fade opacity-0`}
                                style={{ animationDelay: `${i * 60}ms`, animationFillMode: "forwards" }}
                                onClick={() => setSelectedThreat(t)}
                              >
                                <div className={`h-10 w-10 rounded-xl ${config.bg} flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 ${config.glow}`}>
                                  <span className={categoryColors[t.threat_category] || "text-destructive"}>
                                    {categoryIcons[t.threat_category] || <AlertTriangle className="h-4 w-4" />}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <SeverityBadge severity={t.severity} />
                                    <Badge variant="outline" className="text-[10px] font-medium">{t.threat_category.replace(/_/g, " ")}</Badge>
                                    <div className="flex items-center gap-1 ml-auto">
                                      <span className="text-[10px] text-muted-foreground font-medium">Confidence</span>
                                      <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                                        <div
                                          className={`h-full rounded-full transition-all duration-500 ${t.confidence_score >= 80 ? "bg-destructive" : t.confidence_score >= 50 ? "bg-warning" : "bg-info"}`}
                                          style={{ width: `${t.confidence_score}%` }}
                                        />
                                      </div>
                                      <span className="text-[10px] font-bold tabular-nums">{t.confidence_score}%</span>
                                    </div>
                                  </div>
                                  <p className="font-medium text-sm leading-snug">{t.description}</p>
                                  {t.mitre_technique && (
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">MITRE {t.mitre_technique}</span>
                                    </div>
                                  )}
                                </div>
                                <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                  <Eye className="h-3.5 w-3.5 mr-1" /> Details
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </GlassCard>
              </TabsContent>

              {/* ─── ALERTS TAB ─── */}
              <TabsContent value="alerts">
                <GlassCard intensity="light" hover={false} className="overflow-hidden">
                  <CardHeader className="border-b border-border/50 bg-muted/30">
                    <CardTitle className="flex items-center gap-2.5 text-base">
                      <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      </div>
                      Open Security Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {alerts.length === 0 ? (
                      <div className="text-center py-16 text-muted-foreground">
                        <div className="h-16 w-16 rounded-2xl bg-success/5 flex items-center justify-center mx-auto mb-4">
                          <CheckCircle2 className="h-8 w-8 text-success opacity-50" />
                        </div>
                        <p className="font-medium">All clear — no open alerts</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[420px]">
                        <div className="divide-y divide-border/50">
                          {alerts.map((a, i) => {
                            const config = severityConfig[a.severity] || severityConfig.medium;
                            return (
                              <div
                                key={a.id}
                                className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-all duration-300 group animate-slide-up-fade opacity-0"
                                style={{ animationDelay: `${i * 60}ms`, animationFillMode: "forwards" }}
                              >
                                <div className={`h-10 w-10 rounded-xl ${config.bg} flex items-center justify-center shrink-0`}>
                                  <AlertTriangle className={`h-4 w-4 ${config.text}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <SeverityBadge severity={a.severity} />
                                    <Badge variant="outline" className="text-[10px] font-medium">{a.alert_type.replace(/_/g, " ")}</Badge>
                                  </div>
                                  <p className="font-medium text-sm">{a.title}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.description}</p>
                                </div>
                                <Button size="sm" variant="outline" onClick={() => handleResolveAlert(a.id)} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Resolve
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </GlassCard>
              </TabsContent>

              {/* ─── RESPONSES TAB ─── */}
              <TabsContent value="responses">
                <GlassCard intensity="light" hover={false} className="overflow-hidden">
                  <CardHeader className="border-b border-border/50 bg-muted/30">
                    <CardTitle className="flex items-center gap-2.5 text-base">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Zap className="h-4 w-4 text-primary" />
                      </div>
                      Incident Response Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {responses.length === 0 ? (
                      <div className="text-center py-16 text-muted-foreground">
                        <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                          <Shield className="h-8 w-8 opacity-30" />
                        </div>
                        <p className="font-medium">No incident responses yet</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[420px]">
                        <div className="divide-y divide-border/50">
                          {responses.map((r, i) => {
                            const statusConfig: Record<string, { icon: React.ReactNode; bg: string; badgeCls: string }> = {
                              completed: {
                                icon: <CheckCircle2 className="h-4 w-4 text-success" />,
                                bg: "bg-success/10",
                                badgeCls: "bg-success/10 text-success border-success/30",
                              },
                              pending: {
                                icon: <Clock className="h-4 w-4 text-warning" />,
                                bg: "bg-warning/10",
                                badgeCls: "bg-warning/10 text-warning border-warning/30",
                              },
                              failed: {
                                icon: <XCircle className="h-4 w-4 text-destructive" />,
                                bg: "bg-destructive/10",
                                badgeCls: "bg-destructive/10 text-destructive border-destructive/30",
                              },
                            };
                            const sc = statusConfig[r.status] || statusConfig.pending;

                            return (
                              <div
                                key={r.id}
                                className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-all duration-300 group animate-slide-up-fade opacity-0"
                                style={{ animationDelay: `${i * 60}ms`, animationFillMode: "forwards" }}
                              >
                                <div className={`h-10 w-10 rounded-xl ${sc.bg} flex items-center justify-center shrink-0`}>
                                  {sc.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <Badge variant="outline" className="text-[10px] font-medium capitalize">{r.action_type.replace(/_/g, " ")}</Badge>
                                    <Badge variant={r.action_mode === "autonomous" ? "default" : "outline"} className="text-[10px] font-medium">
                                      {r.action_mode === "autonomous" ? "⚡ Autonomous" : "📋 Advisory"}
                                    </Badge>
                                    <Badge variant="outline" className={`text-[10px] font-semibold ${sc.badgeCls}`}>
                                      {r.status}
                                    </Badge>
                                  </div>
                                  <p className="text-sm">{r.description}</p>
                                </div>
                                {r.status === "pending" && (
                                  <Button size="sm" onClick={() => handleExecuteResponse(r.id)} className="shrink-0 group-hover:animate-pulse-glow">
                                    <Play className="h-3.5 w-3.5 mr-1" /> Execute
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </GlassCard>
              </TabsContent>

              {/* ─── EVENTS TAB ─── */}
              <TabsContent value="events">
                <GlassCard intensity="light" hover={false} className="overflow-hidden">
                  <CardHeader className="border-b border-border/50 bg-muted/30">
                    <CardTitle className="flex items-center gap-2.5 text-base">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Activity className="h-4 w-4 text-primary" />
                      </div>
                      Runtime Event Stream
                      <LiveIndicator size="sm" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {recentEvents.length === 0 ? (
                      <div className="text-center py-16 text-muted-foreground">
                        <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                          <Activity className="h-8 w-8 opacity-30" />
                        </div>
                        <p className="font-medium">No runtime events yet</p>
                        <p className="text-sm mt-1">Click "Simulate Attack" to generate test events</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[420px]">
                        <div className="divide-y divide-border/30">
                          {recentEvents.map((e: any, i: number) => (
                            <div
                              key={e.id}
                              className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-all duration-200 animate-slide-up-fade opacity-0"
                              style={{ animationDelay: `${i * 40}ms`, animationFillMode: "forwards" }}
                            >
                              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                e.is_suspicious ? "bg-destructive/10" : "bg-muted/80"
                              }`}>
                                {e.is_suspicious ? (
                                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                                ) : (
                                  <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <SeverityBadge severity={e.severity} />
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{e.provider}</span>
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{e.event_source}</span>
                                  {e.is_suspicious && (
                                    <Badge variant="destructive" className="text-[9px] h-4 font-bold animate-pulse">⚠ SUSPICIOUS</Badge>
                                  )}
                                  <span className="text-[10px] text-muted-foreground ml-auto tabular-nums">
                                    {new Date(e.created_at).toLocaleTimeString()}
                                  </span>
                                </div>
                                <p className="font-medium text-sm mt-0.5 capitalize">{e.event_type.replace(/_/g, " ")}</p>
                                <p className="text-[11px] text-muted-foreground leading-tight">
                                  {e.actor || "unknown"} • {e.source_ip || "N/A"} • {e.target_resource || "N/A"}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </GlassCard>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      {/* ═══ THREAT DETAIL DIALOG ═══ */}
      <Dialog open={!!selectedThreat} onOpenChange={() => setSelectedThreat(null)}>
        <DialogContent className="max-w-lg border-border/50 glass-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-destructive/10 flex items-center justify-center">
                <Target className="h-4 w-4 text-destructive" />
              </div>
              Threat Intelligence Report
            </DialogTitle>
          </DialogHeader>
          {selectedThreat && (
            <div className="space-y-5">
              <div className="flex gap-2">
                <SeverityBadge severity={selectedThreat.severity} />
                <Badge variant="outline" className="text-[10px] font-medium capitalize">{selectedThreat.threat_category.replace(/_/g, " ")}</Badge>
              </div>

              <p className="text-sm leading-relaxed">{selectedThreat.description}</p>

              {/* Confidence meter */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Confidence Score</span>
                  <span className="font-bold tabular-nums">{selectedThreat.confidence_score}%</span>
                </div>
                <Progress value={selectedThreat.confidence_score} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Actor", value: selectedThreat.actor },
                  { label: "Source IP", value: selectedThreat.source_ip },
                  { label: "MITRE Technique", value: selectedThreat.mitre_technique },
                  { label: "Detected", value: selectedThreat.detected_at ? new Date(selectedThreat.detected_at).toLocaleString() : "N/A" },
                ].map(({ label, value }) => (
                  <div key={label} className="p-2.5 rounded-lg bg-muted/50 border border-border/30">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
                    <p className="text-sm font-semibold mt-0.5 truncate">{value || "N/A"}</p>
                  </div>
                ))}
              </div>

              {selectedThreat.affected_resources?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Affected Resources</p>
                  <div className="space-y-1.5">
                    {selectedThreat.affected_resources.map((r: any, i: number) => (
                      <div key={i} className="text-xs p-2.5 bg-muted/50 rounded-lg border border-border/30 flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
                        <span className="font-medium">{r.resource || "Unknown"}</span>
                        <span className="text-muted-foreground">({r.type || "unknown"})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                <Button variant="outline" onClick={() => setSelectedThreat(null)}>Close</Button>
                <Button variant="destructive" onClick={() => handleResolveThreat(selectedThreat.id)} className="gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Mark Resolved
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
