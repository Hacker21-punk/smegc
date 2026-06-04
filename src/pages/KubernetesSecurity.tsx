import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { GlassCard } from "@/components/ui/glass-card";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Container, Shield, AlertTriangle, CheckCircle2, Lock, Eye, Users,
  Search, Server, Box, Activity, Layers, Network, RefreshCw, Crosshair,
} from "lucide-react";
import {
  type KubernetesCluster, type KubernetesResource, type KubernetesFinding,
  fetchKubernetesClusters, fetchKubernetesResources, fetchKubernetesFindings,
  discoverKubernetesClusters, scanKubernetesCluster, resolveKubernetesFinding,
} from "@/lib/kubernetes-service";

/* ─── Design tokens ─── */
const severityConfig: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  critical: { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/30", glow: "shadow-[0_0_15px_-3px_hsl(var(--destructive)/0.3)]" },
  high: { bg: "bg-warning/10", text: "text-warning", border: "border-warning/30", glow: "shadow-[0_0_15px_-3px_hsl(var(--warning)/0.3)]" },
  medium: { bg: "bg-info/10", text: "text-info", border: "border-info/30", glow: "" },
  low: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/30", glow: "" },
};

const categoryLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  privileged_container: { label: "Privileged Container", icon: <Shield className="h-3.5 w-3.5" /> },
  root_container: { label: "Root Container", icon: <Shield className="h-3.5 w-3.5" /> },
  rbac: { label: "RBAC", icon: <Users className="h-3.5 w-3.5" /> },
  network_exposure: { label: "Network Exposure", icon: <Network className="h-3.5 w-3.5" /> },
  network_policy: { label: "Network Policy", icon: <Lock className="h-3.5 w-3.5" /> },
  unencrypted_secrets: { label: "Unencrypted Secrets", icon: <Lock className="h-3.5 w-3.5" /> },
  dashboard: { label: "Dashboard", icon: <Eye className="h-3.5 w-3.5" /> },
};

const providerIcon = (p: string) => p === "aws" ? "🟠" : p === "azure" ? "🔷" : p === "gcp" ? "🔶" : "☁️";
const clusterTypeLabel = (t: string) => ({ eks: "EKS", aks: "AKS", gke: "GKE" }[t] || t.toUpperCase());

/* ─── Sub-components ─── */
function SeverityBadge({ severity }: { severity: string }) {
  const c = severityConfig[severity] || severityConfig.medium;
  return <Badge variant="outline" className={`${c.bg} ${c.text} ${c.border} font-semibold uppercase text-[9px] tracking-wider px-2`}>{severity}</Badge>;
}

function LiveIndicator() {
  return (
    <span className="relative flex h-3 w-3">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
      <span className="relative inline-flex rounded-full h-3 w-3 bg-success" />
    </span>
  );
}

interface StatCardProps { icon: React.ReactNode; value: number; label: string; variant: "destructive" | "warning" | "info" | "primary"; delay: string }

function StatCard({ icon, value, label, variant, delay }: StatCardProps) {
  const styles: Record<string, { ring: string; iconBg: string; valueColor: string }> = {
    destructive: { ring: "ring-1 ring-destructive/20", iconBg: "bg-destructive/10", valueColor: "text-destructive" },
    warning: { ring: "ring-1 ring-warning/20", iconBg: "bg-warning/10", valueColor: "text-warning" },
    info: { ring: "ring-1 ring-info/20", iconBg: "bg-info/10", valueColor: "text-info" },
    primary: { ring: "ring-1 ring-primary/20", iconBg: "bg-primary/10", valueColor: "text-primary" },
  };
  const s = styles[variant];
  return (
    <GlassCard intensity="medium" className={`animate-fade-in-up opacity-0 ${delay} ${s.ring} overflow-hidden relative group`}>
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-shimmer pointer-events-none" />
      <CardContent className="p-5 relative">
        <div className="flex items-center justify-between mb-3">
          <div className={`h-10 w-10 rounded-xl ${s.iconBg} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
            {icon}
          </div>
          {value > 0 && variant === "destructive" && (
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
            </span>
          )}
        </div>
        <p className={`text-3xl font-bold ${s.valueColor} tracking-tight`}>
          <AnimatedCounter value={value} duration={800} />
        </p>
        <p className="text-xs text-muted-foreground font-medium mt-1 uppercase tracking-wider">{label}</p>
      </CardContent>
    </GlassCard>
  );
}

/* ─── Main page ─── */
export default function KubernetesSecurity() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clusters, setClusters] = useState<KubernetesCluster[]>([]);
  const [resources, setResources] = useState<KubernetesResource[]>([]);
  const [findings, setFindings] = useState<KubernetesFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<KubernetesFinding | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [c, r, f] = await Promise.all([fetchKubernetesClusters(), fetchKubernetesResources(), fetchKubernetesFindings()]);
      setClusters(c); setResources(r); setFindings(f);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleDiscover = async () => {
    setDiscovering(true);
    toast.info("Discovering Kubernetes clusters across all cloud accounts...");
    try {
      const result = await discoverKubernetesClusters();
      toast.success(`Discovered ${result.clusters_discovered} Kubernetes clusters!`);
      loadData();
    } catch (err) { toast.error("Discovery failed", { description: err instanceof Error ? err.message : "Unknown error" }); }
    finally { setDiscovering(false); }
  };

  const handleScan = async (cluster: KubernetesCluster) => {
    setScanningId(cluster.id);
    toast.info(`Scanning ${cluster.cluster_name}...`);
    try {
      const result = await scanKubernetesCluster(cluster.id);
      toast.success(`Scan complete: ${result.findings_count} findings, ${result.resources_discovered} resources discovered`);
      loadData();
    } catch (err) { toast.error("Scan failed", { description: err instanceof Error ? err.message : "Unknown error" }); }
    finally { setScanningId(null); }
  };

  const handleResolve = async (finding: KubernetesFinding) => {
    try { await resolveKubernetesFinding(finding.id); toast.success("Finding marked as resolved"); loadData(); setSelectedFinding(null); }
    catch { toast.error("Failed to resolve finding"); }
  };

  const openFindings = findings.filter(f => !f.is_resolved);
  const criticalFindings = findings.filter(f => f.severity === "critical" && !f.is_resolved);
  const totalPods = resources.filter(r => r.resource_kind === "Pod").length;
  const privilegedCount = findings.filter(f => f.category === "privileged_container" && !f.is_resolved).length;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} lastScanTime="" onRefresh={loadData} />
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="md:ml-64 pt-16">
        <div className="p-6 max-w-7xl mx-auto space-y-6">

          {/* ═══ HEADER ═══ */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in-up opacity-0 stagger-1">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center animate-pulse-glow">
                <Container className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="heading-display flex items-center gap-2.5">
                  Kubernetes Security
                  <LiveIndicator />
                </h1>
                <p className="text-sm text-muted-foreground">Detect misconfigurations across EKS, AKS &amp; GKE clusters</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={loadData} disabled={loading} className="group">
                <RefreshCw className={`h-4 w-4 mr-2 transition-transform group-hover:rotate-180 duration-500 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button onClick={handleDiscover} disabled={discovering} className="relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary-foreground/10 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                {discovering ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2 transition-transform group-hover:scale-110" />}
                {discovering ? "Discovering..." : "Discover Clusters"}
              </Button>
            </div>
          </div>

          {/* ═══ STAT CARDS ═══ */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard icon={<Server className="h-5 w-5 text-primary" />} value={clusters.length} label="Clusters" variant="primary" delay="stagger-2" />
            <StatCard icon={<Box className="h-5 w-5 text-info" />} value={totalPods} label="Pods Running" variant="info" delay="stagger-3" />
            <StatCard icon={<AlertTriangle className="h-5 w-5 text-destructive" />} value={criticalFindings.length} label="Critical Risks" variant="destructive" delay="stagger-4" />
            <StatCard icon={<Shield className="h-5 w-5 text-warning" />} value={privilegedCount} label="Privileged Containers" variant="warning" delay="stagger-5" />
            <StatCard icon={<Activity className="h-5 w-5 text-primary" />} value={resources.length} label="Resources" variant="primary" delay="stagger-6" />
          </div>

          {/* ═══ TABS ═══ */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <GlassCard key={i} intensity="light" hover={false} className="h-24 animate-pulse"><div /></GlassCard>
              ))}
            </div>
          ) : (
            <div className="animate-fade-in-up opacity-0 stagger-7">
              <Tabs defaultValue="clusters" className="space-y-4">
                <TabsList className="bg-background/60 backdrop-blur-sm border border-border/50">
                  <TabsTrigger value="clusters" className="data-[state=active]:bg-primary/10 gap-1.5">
                    <Server className="h-3.5 w-3.5" /> Clusters
                    {clusters.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{clusters.length}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="resources" className="data-[state=active]:bg-primary/10 gap-1.5">
                    <Layers className="h-3.5 w-3.5" /> Resources
                    {resources.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{resources.length}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="findings" className="data-[state=active]:bg-primary/10 gap-1.5">
                    <Crosshair className="h-3.5 w-3.5" /> Findings
                    {openFindings.length > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">{openFindings.length}</Badge>}
                  </TabsTrigger>
                </TabsList>

                {/* ── Clusters ── */}
                <TabsContent value="clusters" className="space-y-3">
                  {clusters.length === 0 ? (
                    <GlassCard intensity="light" hover={false} className="py-16 text-center">
                      <Container className="h-14 w-14 mx-auto text-muted-foreground/40 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Kubernetes clusters discovered</h3>
                      <p className="text-muted-foreground max-w-md mx-auto text-sm">Connect cloud accounts first, then click "Discover Clusters" to find EKS, AKS, and GKE clusters.</p>
                    </GlassCard>
                  ) : clusters.map((cluster, idx) => {
                    const cf = findings.filter(f => f.cluster_id === cluster.id && !f.is_resolved);
                    const cc = cf.filter(f => f.severity === "critical").length;
                    const riskColor = cluster.risk_score >= 70 ? "text-destructive" : cluster.risk_score >= 40 ? "text-warning" : "text-success";
                    return (
                      <GlassCard
                        key={cluster.id}
                        intensity="medium"
                        className={`animate-fade-in-up opacity-0 ring-1 ring-border/30 ${cc > 0 ? "ring-destructive/20" : ""}`}
                        style={{ animationDelay: `${idx * 80}ms`, animationFillMode: "forwards" } as React.CSSProperties}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <span className="text-2xl">{providerIcon(cluster.provider)}</span>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold tracking-tight">{cluster.cluster_name}</p>
                                  <Badge variant="outline" className="text-[10px] font-mono tracking-wider">{clusterTypeLabel(cluster.cluster_type)}</Badge>
                                  {cluster.status === "scanned" ? (
                                    <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-[10px]">
                                      <CheckCircle2 className="h-3 w-3 mr-1" /> Scanned
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-[10px]">
                                      <AlertTriangle className="h-3 w-3 mr-1" /> {cluster.status}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                                  <span className="font-mono">v{cluster.version || "?"}</span>
                                  <span>{cluster.region}</span>
                                  <span>{cluster.node_count} nodes</span>
                                  {cc > 0 && <span className="text-destructive font-semibold">{cc} critical</span>}
                                </div>
                                {cluster.last_scan_at && (
                                  <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">
                                    Last scan: {new Date(cluster.last_scan_at).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              {cluster.risk_score > 0 && (
                                <div className="text-right">
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Risk</p>
                                  <p className={`text-xl font-bold ${riskColor} tracking-tight`}>{cluster.risk_score}</p>
                                </div>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleScan(cluster)}
                                disabled={scanningId === cluster.id}
                                className="opacity-70 hover:opacity-100 transition-opacity"
                              >
                                <Search className={`h-4 w-4 mr-1.5 ${scanningId === cluster.id ? "animate-spin" : ""}`} />
                                {scanningId === cluster.id ? "Scanning..." : "Scan"}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </GlassCard>
                    );
                  })}
                </TabsContent>

                {/* ── Resources ── */}
                <TabsContent value="resources">
                  <GlassCard intensity="medium" hover={false} className="ring-1 ring-border/30 overflow-hidden">
                    {resources.length === 0 ? (
                      <div className="py-16 text-center">
                        <Layers className="h-14 w-14 mx-auto text-muted-foreground/40 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No resources discovered</h3>
                        <p className="text-muted-foreground text-sm">Scan a cluster to discover Kubernetes resources.</p>
                      </div>
                    ) : (
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-border/30 bg-muted/20">
                              <TableHead className="text-[10px] uppercase tracking-wider font-semibold">Kind</TableHead>
                              <TableHead className="text-[10px] uppercase tracking-wider font-semibold">Name</TableHead>
                              <TableHead className="text-[10px] uppercase tracking-wider font-semibold">Namespace</TableHead>
                              <TableHead className="text-[10px] uppercase tracking-wider font-semibold">Status</TableHead>
                              <TableHead className="text-[10px] uppercase tracking-wider font-semibold">Risk</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {resources.slice(0, 50).map(r => (
                              <TableRow key={r.id} className="border-border/20 hover:bg-muted/10 transition-colors">
                                <TableCell>
                                  <Badge variant="outline" className="text-[10px] font-mono tracking-wider">{r.resource_kind}</Badge>
                                </TableCell>
                                <TableCell className="font-mono text-sm">{r.resource_name}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{r.namespace}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-[10px]">{r.status}</Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Progress value={r.risk_score} className="h-1.5 w-12" />
                                    <span className={`text-xs font-mono font-semibold ${r.risk_score >= 70 ? "text-destructive" : r.risk_score >= 40 ? "text-warning" : "text-muted-foreground"}`}>
                                      {r.risk_score}
                                    </span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    )}
                  </GlassCard>
                </TabsContent>

                {/* ── Findings ── */}
                <TabsContent value="findings">
                  <GlassCard intensity="medium" hover={false} className="ring-1 ring-border/30 overflow-hidden">
                    {findings.length === 0 ? (
                      <div className="py-16 text-center">
                        <Shield className="h-14 w-14 mx-auto text-muted-foreground/40 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No security findings</h3>
                        <p className="text-muted-foreground text-sm">Scan a cluster to analyze for security risks.</p>
                      </div>
                    ) : (
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-border/30 bg-muted/20">
                              <TableHead className="text-[10px] uppercase tracking-wider font-semibold">Severity</TableHead>
                              <TableHead className="text-[10px] uppercase tracking-wider font-semibold">Title</TableHead>
                              <TableHead className="text-[10px] uppercase tracking-wider font-semibold">Resource</TableHead>
                              <TableHead className="text-[10px] uppercase tracking-wider font-semibold">Category</TableHead>
                              <TableHead className="text-[10px] uppercase tracking-wider font-semibold">Status</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {findings.map(f => {
                              const sc = severityConfig[f.severity] || severityConfig.medium;
                              return (
                                <TableRow key={f.id} className="border-border/20 hover:bg-muted/10 transition-colors cursor-pointer group" onClick={() => setSelectedFinding(f)}>
                                  <TableCell><SeverityBadge severity={f.severity} /></TableCell>
                                  <TableCell className="text-sm max-w-xs truncate">{f.title}</TableCell>
                                  <TableCell><code className="text-[11px] font-mono text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">{f.resource_kind}/{f.resource_name}</code></TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                      {categoryLabels[f.category]?.icon}
                                      <span>{categoryLabels[f.category]?.label || f.category}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {f.is_resolved ? (
                                      <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-[10px]">
                                        <CheckCircle2 className="h-3 w-3 mr-1" /> Fixed
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-[10px]">
                                        <AlertTriangle className="h-3 w-3 mr-1" /> Open
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity text-xs" onClick={(e) => { e.stopPropagation(); setSelectedFinding(f); }}>
                                      Details
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    )}
                  </GlassCard>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </main>

      {/* ═══ FINDING DETAILS DIALOG ═══ */}
      <Dialog open={!!selectedFinding} onOpenChange={(open) => !open && setSelectedFinding(null)}>
        <DialogContent className="max-w-lg bg-background/95 backdrop-blur-lg border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              Finding Details
            </DialogTitle>
            <DialogDescription className="text-sm">{selectedFinding?.title}</DialogDescription>
          </DialogHeader>
          {selectedFinding && (
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <SeverityBadge severity={selectedFinding.severity} />
                <Badge variant="outline" className="text-[10px] font-mono tracking-wider">
                  {categoryLabels[selectedFinding.category]?.label || selectedFinding.category}
                </Badge>
              </div>

              <GlassCard intensity="light" hover={false} className="p-4">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Description</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{selectedFinding.description}</p>
              </GlassCard>

              <div className="grid grid-cols-2 gap-3">
                <GlassCard intensity="light" hover={false} className="p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Resource</p>
                  <code className="text-xs font-mono">{selectedFinding.resource_kind}/{selectedFinding.resource_name}</code>
                </GlassCard>
                <GlassCard intensity="light" hover={false} className="p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Namespace</p>
                  <code className="text-xs font-mono">{selectedFinding.namespace}</code>
                </GlassCard>
              </div>

              {selectedFinding.remediation_steps && selectedFinding.remediation_steps.length > 0 && (
                <GlassCard intensity="light" hover={false} className="p-4">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-3">Remediation Steps</p>
                  <ol className="space-y-2">
                    {selectedFinding.remediation_steps.map((step, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex gap-2.5 leading-relaxed">
                        <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </GlassCard>
              )}

              <div className="flex justify-end gap-2 pt-1">
                {!selectedFinding.is_resolved && (
                  <Button onClick={() => handleResolve(selectedFinding)} className="gap-2 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary-foreground/10 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <CheckCircle2 className="h-4 w-4" /> Mark as Resolved
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
