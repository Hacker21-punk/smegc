import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

const severityColors: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
};

const categoryIcons: Record<string, React.ReactNode> = {
  credential_abuse: <Key className="h-4 w-4" />,
  privilege_escalation: <ShieldAlert className="h-4 w-4" />,
  data_exfiltration: <Database className="h-4 w-4" />,
  container_compromise: <Container className="h-4 w-4" />,
};

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
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Radar className="h-6 w-6 text-primary" />
                Runtime Attack Detection
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                </span>
              </h1>
              <p className="text-muted-foreground">Real-time cloud attack detection and automated response</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchData} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button onClick={handleSimulate} disabled={simulating}>
                <Play className={`h-4 w-4 mr-2 ${simulating ? "animate-spin" : ""}`} />
                {simulating ? "Simulating..." : "Simulate Attack"}
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <ShieldAlert className="h-5 w-5 text-destructive mx-auto mb-1" />
                <p className="text-2xl font-bold text-destructive">{summary?.active_threats ?? 0}</p>
                <p className="text-xs text-muted-foreground">Active Threats</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Key className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-orange-500">{summary?.suspicious_logins ?? 0}</p>
                <p className="text-xs text-muted-foreground">Suspicious Logins</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
                <p className="text-2xl font-bold">{summary?.escalation_attempts ?? 0}</p>
                <p className="text-xs text-muted-foreground">Escalation Attempts</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Zap className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-2xl font-bold">{summary?.autopilot_actions ?? 0}</p>
                <p className="text-xs text-muted-foreground">Autopilot Actions</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="threats">
            <TabsList>
              <TabsTrigger value="threats">
                Threats {threats.length > 0 && <Badge variant="destructive" className="ml-2 h-5 text-[10px]">{threats.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="alerts">
                Alerts {alerts.length > 0 && <Badge variant="outline" className="ml-2 h-5 text-[10px]">{alerts.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="responses">Incident Responses</TabsTrigger>
              <TabsTrigger value="events">Event Stream</TabsTrigger>
            </TabsList>

            {/* Threats Tab */}
            <TabsContent value="threats">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-destructive" /> Active Threat Detections
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {threats.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>No active threats detected. Click "Simulate Attack" to test the detection engine.</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3">
                        {threats.map((t) => (
                          <div key={t.id} className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                            <div className="h-9 w-9 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                              {categoryIcons[t.threat_category] || <AlertTriangle className="h-4 w-4 text-destructive" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className={severityColors[t.severity]}>{t.severity}</Badge>
                                <Badge variant="outline" className="text-[10px]">{t.threat_category.replace(/_/g, " ")}</Badge>
                                <span className="text-[10px] text-muted-foreground">Confidence: {t.confidence_score}%</span>
                              </div>
                              <p className="font-medium text-sm mt-1">{t.description}</p>
                              {t.mitre_technique && (
                                <p className="text-xs text-muted-foreground mt-0.5">MITRE: {t.mitre_technique}</p>
                              )}
                            </div>
                            <Button size="sm" variant="outline" onClick={() => setSelectedThreat(t)}>
                              <Eye className="h-3 w-3 mr-1" /> Details
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Alerts Tab */}
            <TabsContent value="alerts">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" /> Open Security Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {alerts.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>No open alerts</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3">
                        {alerts.map((a) => (
                          <div key={a.id} className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                            <div className="h-9 w-9 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                              <AlertTriangle className="h-4 w-4 text-orange-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={severityColors[a.severity]}>{a.severity}</Badge>
                                <Badge variant="outline" className="text-[10px]">{a.alert_type.replace(/_/g, " ")}</Badge>
                              </div>
                              <p className="font-medium text-sm mt-1">{a.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => handleResolveAlert(a.id)}>
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Resolve
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Responses Tab */}
            <TabsContent value="responses">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" /> Incident Response Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {responses.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>No incident responses yet</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3">
                        {responses.map((r) => (
                          <div key={r.id} className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                            <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                              r.status === "completed" ? "bg-green-500/10" : r.status === "pending" ? "bg-yellow-500/10" : "bg-muted"
                            }`}>
                              {r.status === "completed" ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : r.status === "pending" ? (
                                <Clock className="h-4 w-4 text-yellow-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px]">{r.action_type.replace(/_/g, " ")}</Badge>
                                <Badge variant={r.action_mode === "autonomous" ? "default" : "outline"} className="text-[10px]">
                                  {r.action_mode}
                                </Badge>
                                <Badge variant="outline" className={`text-[10px] ${
                                  r.status === "completed" ? "bg-green-500/10 text-green-600" : 
                                  r.status === "pending" ? "bg-yellow-500/10 text-yellow-600" : ""
                                }`}>{r.status}</Badge>
                              </div>
                              <p className="text-sm mt-1">{r.description}</p>
                            </div>
                            {r.status === "pending" && (
                              <Button size="sm" onClick={() => handleExecuteResponse(r.id)}>
                                <Play className="h-3 w-3 mr-1" /> Execute
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Events Tab */}
            <TabsContent value="events">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" /> Recent Runtime Events
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentEvents.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>No runtime events yet. Click "Simulate Attack" to generate test events.</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {recentEvents.map((e: any) => (
                          <div key={e.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                              e.is_suspicious ? "bg-destructive/10" : "bg-muted"
                            }`}>
                              {e.is_suspicious ? (
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                              ) : (
                                <Activity className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className={severityColors[e.severity] || ""}>{e.severity}</Badge>
                                <Badge variant="outline" className="text-[10px]">{e.provider}</Badge>
                                <Badge variant="outline" className="text-[10px]">{e.event_source}</Badge>
                                {e.is_suspicious && <Badge variant="destructive" className="text-[10px]">Suspicious</Badge>}
                                <span className="text-[10px] text-muted-foreground ml-auto">{new Date(e.created_at).toLocaleTimeString()}</span>
                              </div>
                              <p className="font-medium text-sm mt-1">{e.event_type.replace(/_/g, " ")}</p>
                              <p className="text-xs text-muted-foreground">Actor: {e.actor || "unknown"} • IP: {e.source_ip || "N/A"} • Target: {e.target_resource || "N/A"}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Threat Detail Dialog */}
      <Dialog open={!!selectedThreat} onOpenChange={() => setSelectedThreat(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-destructive" />
              Threat Details
            </DialogTitle>
          </DialogHeader>
          {selectedThreat && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge variant="outline" className={severityColors[selectedThreat.severity]}>{selectedThreat.severity}</Badge>
                <Badge variant="outline">{selectedThreat.threat_category.replace(/_/g, " ")}</Badge>
              </div>
              <p className="text-sm">{selectedThreat.description}</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Actor:</span> <span className="font-medium">{selectedThreat.actor || "N/A"}</span></div>
                <div><span className="text-muted-foreground">Source IP:</span> <span className="font-medium">{selectedThreat.source_ip || "N/A"}</span></div>
                <div><span className="text-muted-foreground">Confidence:</span> <span className="font-medium">{selectedThreat.confidence_score}%</span></div>
                <div><span className="text-muted-foreground">MITRE:</span> <span className="font-medium">{selectedThreat.mitre_technique || "N/A"}</span></div>
              </div>
              {selectedThreat.affected_resources?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1">Affected Resources</p>
                  <div className="space-y-1">
                    {selectedThreat.affected_resources.map((r: any, i: number) => (
                      <div key={i} className="text-xs p-2 bg-muted rounded">
                        {r.resource || "Unknown"} ({r.type || "unknown"})
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedThreat(null)}>Close</Button>
                <Button variant="destructive" onClick={() => handleResolveThreat(selectedThreat.id)}>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Mark Resolved
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
