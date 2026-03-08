import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Container, Shield, AlertTriangle, CheckCircle2, XCircle, Lock, Eye, Users,
  RefreshCw, Search, Server, Box, Activity, Layers, Network,
} from "lucide-react";
import {
  type KubernetesCluster, type KubernetesResource, type KubernetesFinding,
  fetchKubernetesClusters, fetchKubernetesResources, fetchKubernetesFindings,
  discoverKubernetesClusters, scanKubernetesCluster, resolveKubernetesFinding,
} from "@/lib/kubernetes-service";

const severityColors: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
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

const providerIcon = (provider: string) => {
  switch (provider) {
    case "aws": return "🟠";
    case "azure": return "🔷";
    case "gcp": return "🔶";
    default: return "☁️";
  }
};

const clusterTypeLabel = (type: string) => {
  switch (type) {
    case "eks": return "EKS";
    case "aks": return "AKS";
    case "gke": return "GKE";
    default: return type.toUpperCase();
  }
};

export default function KubernetesSecurity() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clusters, setClusters] = useState<KubernetesCluster[]>([]);
  const [resources, setResources] = useState<KubernetesResource[]>([]);
  const [findings, setFindings] = useState<KubernetesFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<KubernetesCluster | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<KubernetesFinding | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [c, r, f] = await Promise.all([
        fetchKubernetesClusters(),
        fetchKubernetesResources(),
        fetchKubernetesFindings(),
      ]);
      setClusters(c);
      setResources(r);
      setFindings(f);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscover = async () => {
    setDiscovering(true);
    toast.info("Discovering Kubernetes clusters across all cloud accounts...");
    try {
      const result = await discoverKubernetesClusters();
      toast.success(`Discovered ${result.clusters_discovered} Kubernetes clusters!`);
      loadData();
    } catch (err) {
      toast.error("Discovery failed", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setDiscovering(false);
    }
  };

  const handleScan = async (cluster: KubernetesCluster) => {
    setScanningId(cluster.id);
    toast.info(`Scanning ${cluster.cluster_name}...`);
    try {
      const result = await scanKubernetesCluster(cluster.id);
      toast.success(`Scan complete: ${result.findings_count} findings, ${result.resources_discovered} resources discovered`);
      loadData();
    } catch (err) {
      toast.error("Scan failed", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setScanningId(null);
    }
  };

  const handleResolve = async (finding: KubernetesFinding) => {
    try {
      await resolveKubernetesFinding(finding.id);
      toast.success("Finding marked as resolved");
      loadData();
      setSelectedFinding(null);
    } catch {
      toast.error("Failed to resolve finding");
    }
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
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Container className="h-6 w-6 text-primary" />
                Kubernetes Security Scanner
              </h1>
              <p className="text-muted-foreground">Detect misconfigurations across EKS, AKS, and GKE clusters</p>
            </div>
            <Button onClick={handleDiscover} disabled={discovering} className="gap-2">
              <Search className={`h-4 w-4 ${discovering ? "animate-spin" : ""}`} />
              {discovering ? "Discovering..." : "Discover Clusters"}
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Server className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold">{clusters.length}</p>
                <p className="text-xs text-muted-foreground">Clusters</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Box className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold">{totalPods}</p>
                <p className="text-xs text-muted-foreground">Pods Running</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-destructive" />
                <p className="text-2xl font-bold text-destructive">{criticalFindings.length}</p>
                <p className="text-xs text-muted-foreground">Critical Risks</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Shield className="h-5 w-5 mx-auto mb-1 text-orange-500" />
                <p className="text-2xl font-bold text-orange-500">{privilegedCount}</p>
                <p className="text-xs text-muted-foreground">Privileged Containers</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Activity className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-bold">{resources.length}</p>
                <p className="text-xs text-muted-foreground">Resources</p>
              </CardContent>
            </Card>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : (
            <Tabs defaultValue="clusters">
              <TabsList>
                <TabsTrigger value="clusters">Clusters ({clusters.length})</TabsTrigger>
                <TabsTrigger value="resources">Resources ({resources.length})</TabsTrigger>
                <TabsTrigger value="findings">
                  Findings ({openFindings.length})
                </TabsTrigger>
              </TabsList>

              {/* Clusters Tab */}
              <TabsContent value="clusters" className="space-y-3 mt-4">
                {clusters.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Container className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Kubernetes clusters discovered</h3>
                      <p className="text-muted-foreground max-w-md mx-auto mb-4">
                        Connect cloud accounts first, then click "Discover Clusters" to find EKS, AKS, and GKE clusters.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  clusters.map(cluster => {
                    const clusterFindings = findings.filter(f => f.cluster_id === cluster.id && !f.is_resolved);
                    const clusterCritical = clusterFindings.filter(f => f.severity === "critical").length;
                    return (
                      <Card key={cluster.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <span className="text-2xl">{providerIcon(cluster.provider)}</span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold">{cluster.cluster_name}</p>
                                  <Badge variant="outline" className="text-xs">{clusterTypeLabel(cluster.cluster_type)}</Badge>
                                  {cluster.status === "scanned" ? (
                                    <Badge className="bg-success/10 text-success border-success/20">
                                      <CheckCircle2 className="h-3 w-3 mr-1" /> Scanned
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-warning/10 text-warning border-warning/20">
                                      <AlertTriangle className="h-3 w-3 mr-1" /> {cluster.status}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                  <span>v{cluster.version || "?"}</span>
                                  <span>{cluster.region}</span>
                                  <span>{cluster.node_count} nodes</span>
                                  {clusterCritical > 0 && (
                                    <span className="text-destructive font-medium">{clusterCritical} critical</span>
                                  )}
                                </div>
                                {cluster.last_scan_at && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Last scan: {new Date(cluster.last_scan_at).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {cluster.risk_score > 0 && (
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground">Risk Score</p>
                                  <p className={`text-lg font-bold ${cluster.risk_score >= 70 ? "text-destructive" : cluster.risk_score >= 40 ? "text-orange-500" : "text-success"}`}>
                                    {cluster.risk_score}
                                  </p>
                                </div>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleScan(cluster)}
                                disabled={scanningId === cluster.id}
                              >
                                <Search className={`h-4 w-4 mr-1 ${scanningId === cluster.id ? "animate-spin" : ""}`} />
                                {scanningId === cluster.id ? "Scanning..." : "Scan Cluster"}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </TabsContent>

              {/* Resources Tab */}
              <TabsContent value="resources" className="mt-4">
                <Card>
                  <CardContent className="p-0">
                    {resources.length === 0 ? (
                      <div className="py-12 text-center">
                        <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No resources discovered</h3>
                        <p className="text-muted-foreground">Scan a cluster to discover Kubernetes resources.</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Kind</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Namespace</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Risk</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {resources.slice(0, 50).map(r => (
                            <TableRow key={r.id}>
                              <TableCell>
                                <Badge variant="outline" className="text-xs font-mono">{r.resource_kind}</Badge>
                              </TableCell>
                              <TableCell className="font-mono text-sm">{r.resource_name}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{r.namespace}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-success/10 text-success text-xs">{r.status}</Badge>
                              </TableCell>
                              <TableCell>
                                <span className={`text-sm font-medium ${r.risk_score >= 70 ? "text-destructive" : r.risk_score >= 40 ? "text-orange-500" : "text-muted-foreground"}`}>
                                  {r.risk_score}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Findings Tab */}
              <TabsContent value="findings" className="mt-4">
                <Card>
                  <CardContent className="p-0">
                    {findings.length === 0 ? (
                      <div className="py-12 text-center">
                        <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No security findings</h3>
                        <p className="text-muted-foreground">Scan a cluster to analyze for security risks.</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Severity</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Resource</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {findings.map(f => (
                            <TableRow key={f.id} className="cursor-pointer" onClick={() => setSelectedFinding(f)}>
                              <TableCell>
                                <Badge variant="outline" className={severityColors[f.severity]}>{f.severity}</Badge>
                              </TableCell>
                              <TableCell className="text-sm max-w-xs truncate">{f.title}</TableCell>
                              <TableCell className="font-mono text-xs">{f.resource_kind}/{f.resource_name}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  {categoryLabels[f.category]?.icon}
                                  <span>{categoryLabels[f.category]?.label || f.category}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {f.is_resolved ? (
                                  <Badge variant="outline" className="bg-success/10 text-success">
                                    <CheckCircle2 className="h-3 w-3 mr-1" /> Fixed
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-orange-500/10 text-orange-500">
                                    <AlertTriangle className="h-3 w-3 mr-1" /> Open
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedFinding(f); }}>
                                  Details
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>

      {/* Finding Details Dialog */}
      <Dialog open={!!selectedFinding} onOpenChange={(open) => !open && setSelectedFinding(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Finding Details
            </DialogTitle>
            <DialogDescription>{selectedFinding?.title}</DialogDescription>
          </DialogHeader>
          {selectedFinding && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={severityColors[selectedFinding.severity]}>
                  {selectedFinding.severity}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {categoryLabels[selectedFinding.category]?.label || selectedFinding.category}
                </Badge>
              </div>

              <div>
                <p className="text-sm font-medium mb-1">Description</p>
                <p className="text-sm text-muted-foreground">{selectedFinding.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Resource</p>
                  <p className="font-mono">{selectedFinding.resource_kind}/{selectedFinding.resource_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Namespace</p>
                  <p className="font-mono">{selectedFinding.namespace}</p>
                </div>
              </div>

              {selectedFinding.remediation_steps?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Remediation Steps</p>
                  <ol className="space-y-1.5">
                    {selectedFinding.remediation_steps.map((step, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex gap-2">
                        <span className="text-primary font-bold">{i + 1}.</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div className="flex justify-end gap-2">
                {!selectedFinding.is_resolved && (
                  <Button onClick={() => handleResolve(selectedFinding)} className="gap-2">
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
