import { useState, useMemo } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Globe,
  Server,
  Users,
  Database,
  HardDrive,
  Shield,
  Search,
  RefreshCw,
  AlertTriangle,
  Lock,
  Network,
  Layers,
  
} from "lucide-react";
import { useGraphNodes, useGraphEdges } from "@/hooks/use-attack-paths";
import { NodeDetailPanel } from "@/components/dashboard/NodeDetailPanel";
import { findCriticalAttackPaths, type CriticalPathScore } from "@/lib/graph-algorithms";
import { EmptyState } from "@/components/dashboard/EmptyState";

const nodeTypeIcons: Record<string, React.ReactNode> = {
  internet_gateway: <Globe className="h-4 w-4" />,
  nat_gateway: <Network className="h-4 w-4" />,
  load_balancer: <Layers className="h-4 w-4" />,
  ec2_instance: <Server className="h-4 w-4" />,
  lambda_function: <Server className="h-4 w-4" />,
  ecs_cluster: <Server className="h-4 w-4" />,
  eks_cluster: <Server className="h-4 w-4" />,
  iam_user: <Users className="h-4 w-4" />,
  iam_role: <Users className="h-4 w-4" />,
  iam_group: <Users className="h-4 w-4" />,
  iam_policy: <Lock className="h-4 w-4" />,
  s3_bucket: <HardDrive className="h-4 w-4" />,
  secrets_manager: <Lock className="h-4 w-4" />,
  rds_instance: <Database className="h-4 w-4" />,
  security_group: <Shield className="h-4 w-4" />,
  vpc: <Network className="h-4 w-4" />,
  subnet: <Network className="h-4 w-4" />,
  kms_key: <Lock className="h-4 w-4" />,
  external_internet: <Globe className="h-4 w-4" />,
};

function riskColor(score: number | null) {
  if (!score) return "bg-muted text-muted-foreground";
  if (score >= 80) return "bg-destructive/10 text-destructive border-destructive/20";
  if (score >= 60) return "bg-orange-500/10 text-orange-600 border-orange-500/20";
  if (score >= 30) return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
  return "bg-green-500/10 text-green-600 border-green-500/20";
}

function riskLabel(score: number | null) {
  if (!score) return "unknown";
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  return "low";
}

const NODE_TYPE_CATEGORIES: Record<string, string> = {
  internet_gateway: "Network",
  nat_gateway: "Network",
  load_balancer: "Network",
  vpc: "Network",
  subnet: "Network",
  security_group: "Network",
  ec2_instance: "Compute",
  lambda_function: "Compute",
  ecs_cluster: "Compute",
  eks_cluster: "Compute",
  iam_user: "Identity",
  iam_role: "Identity",
  iam_group: "Identity",
  iam_policy: "Identity",
  s3_bucket: "Storage",
  secrets_manager: "Storage",
  kms_key: "Storage",
  rds_instance: "Database",
  external_internet: "External",
};

export default function SecurityGraph() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: dbNodes, isLoading: loadingNodes, refetch: refetchNodes } = useGraphNodes();
  const { data: dbEdges, isLoading: loadingEdges, refetch: refetchEdges } = useGraphEdges();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  const isLoading = loadingNodes || loadingEdges;
  const nodes = dbNodes ?? [];
  const edges = dbEdges ?? [];
  const isEmpty = !isLoading && nodes.length === 0;

  const categories = useMemo(() => {
    const cats = new Set<string>();
    nodes.forEach((n: any) => {
      const cat = NODE_TYPE_CATEGORIES[n.node_type] || "Other";
      cats.add(cat);
    });
    return Array.from(cats).sort();
  }, [nodes]);

  const filteredNodes = useMemo(() => {
    return nodes.filter((n: any) => {
      const matchesSearch =
        !search ||
        (n.resource_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (n.node_type || "").toLowerCase().includes(search.toLowerCase());
      const cat = NODE_TYPE_CATEGORIES[n.node_type] || "Other";
      const matchesType = typeFilter === "all" || cat === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [nodes, search, typeFilter]);

  const publicNodes = nodes.filter((n: any) => n.is_public).length;
  const sensitiveNodes = nodes.filter((n: any) => n.is_sensitive).length;
  const riskyEdges = edges.filter((e: any) => e.is_risky).length;
  const highRiskNodes = nodes.filter((n: any) => (n.risk_score ?? 0) >= 70).length;

  // Critical attack paths analysis
  const criticalPaths = useMemo(() => {
    return findCriticalAttackPaths(nodes as any[], edges as any[], 6).slice(0, 5);
  }, [nodes, edges]);

  // Find connections for selected node
  const nodeConnections = useMemo(() => {
    if (!selectedNode) return { incoming: [], outgoing: [] };
    const outgoing = edges
      .filter((e: any) => e.source_node_id === selectedNode.id)
      .map((e: any) => ({
        ...e,
        targetNode: nodes.find((n: any) => n.id === e.target_node_id),
      }));
    const incoming = edges
      .filter((e: any) => e.target_node_id === selectedNode.id)
      .map((e: any) => ({
        ...e,
        sourceNode: nodes.find((n: any) => n.id === e.source_node_id),
      }));
    return { incoming, outgoing };
  }, [selectedNode, edges, nodes]);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        lastScanTime=""
        onRefresh={() => { refetchNodes(); refetchEdges(); }}
      />
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="md:ml-64 pt-16">
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="heading-display">Cloud Security Graph</h1>
              <p className="text-muted-foreground">
                Interactive map of your cloud infrastructure relationships and risk exposure
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => { refetchNodes(); refetchEdges(); }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Rebuild Graph
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <Layers className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Nodes</p>
                  {isLoading ? <Skeleton className="h-6 w-8" /> : <p className="text-xl font-bold">{nodes.length}</p>}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">High Risk</p>
                  {isLoading ? <Skeleton className="h-6 w-8" /> : <p className="text-xl font-bold">{highRiskNodes}</p>}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Globe className="h-4 w-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Public Exposed</p>
                  {isLoading ? <Skeleton className="h-6 w-8" /> : <p className="text-xl font-bold">{publicNodes}</p>}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Risky Edges</p>
                  {isLoading ? <Skeleton className="h-6 w-8" /> : <p className="text-xl font-bold">{riskyEdges}</p>}
                </div>
              </CardContent>
            </Card>
          </div>

          {isEmpty ? (
            <EmptyState
              icon={<Layers className="h-7 w-7" />}
              title="No security graph data yet"
              description="Connect a cloud account so CloudGuard can discover assets and build a relationship graph showing exposure paths to your sensitive resources."
            />
          ) : (
            <>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search nodes..."
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Node Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {isLoading
                  ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)
                  : filteredNodes.map((node: any) => {
                      const connectionCount = edges.filter(
                        (e: any) => e.source_node_id === node.id || e.target_node_id === node.id
                      ).length;
                      return (
                        <Card
                          key={node.id}
                          className={`cursor-pointer transition-all hover:shadow-md border ${riskColor(node.risk_score)}`}
                          onClick={() => setSelectedNode(node)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {nodeTypeIcons[node.node_type] || <Server className="h-4 w-4" />}
                                <span className="text-xs font-medium capitalize">
                                  {(node.node_type || "").replace(/_/g, " ")}
                                </span>
                              </div>
                              <Badge variant="outline" className={`text-[10px] ${riskColor(node.risk_score)}`}>
                                {riskLabel(node.risk_score)}
                              </Badge>
                            </div>
                            <p className="text-sm font-semibold truncate">{node.resource_name || node.resource_id}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              {node.is_public && (
                                <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-600">Public</Badge>
                              )}
                              {node.is_sensitive && (
                                <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive">Sensitive</Badge>
                              )}
                              <span className="ml-auto">{connectionCount} connections</span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
              </div>

              {!isLoading && filteredNodes.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No nodes match your search criteria
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Critical Paths Section */}
          {criticalPaths.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Algorithmically Detected Critical Paths
                </CardTitle>
                <CardDescription>
                  DFS-based traversal from public entry points to sensitive targets
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {criticalPaths.map((cp, i) => {
                  const pathNodeNames = cp.pathResult.path.map((id) => {
                    const n = nodes.find((nd: any) => nd.id === id) as any;
                    return n?.resource_name || n?.resource_id || "Unknown";
                  });
                  return (
                    <div key={i} className="p-3 rounded-lg border bg-muted/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {pathNodeNames.map((name, j) => (
                            <span key={j} className="flex items-center gap-1 text-xs">
                              {j > 0 && <span className="text-muted-foreground">→</span>}
                              <span className="font-medium">{name}</span>
                            </span>
                          ))}
                        </div>
                        <Badge variant={cp.compositeScore >= 70 ? "destructive" : cp.compositeScore >= 40 ? "default" : "secondary"}>
                          Score: {cp.compositeScore}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-[10px] text-muted-foreground">
                        <span>Sensitivity: {cp.dataSensitivityScore}</span>
                        <span>Priv Esc: {cp.privilegeEscalationScore}</span>
                        <span>Exposure: {cp.networkExposureScore}</span>
                        <span>Criticality: {cp.assetCriticalityScore}</span>
                      </div>
                      {cp.pathResult.hasPrivilegeEscalation && (
                        <Badge variant="outline" className="mt-2 text-[10px] bg-orange-500/10 text-orange-600">
                          ⚡ Privilege Escalation Detected
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Enhanced Node Detail Panel */}
      <NodeDetailPanel
        node={selectedNode}
        nodes={nodes}
        edges={edges}
        open={!!selectedNode}
        onClose={() => setSelectedNode(null)}
        onSelectNode={(n) => setSelectedNode(n)}
      />
    </div>
  );
}
