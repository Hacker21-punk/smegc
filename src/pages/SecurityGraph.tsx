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
  Eye,
} from "lucide-react";
import { useGraphNodes, useGraphEdges } from "@/hooks/use-attack-paths";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Demo graph data for when no real data exists
const DEMO_NODES = [
  { id: "d1", resource_name: "Internet Gateway", node_type: "internet_gateway", is_public: true, is_sensitive: false, risk_score: 30, region: "global", provider: "aws", resource_id: "igw-demo-1" },
  { id: "d2", resource_name: "Web Server (EC2)", node_type: "ec2_instance", is_public: true, is_sensitive: false, risk_score: 75, region: "ap-south-1", provider: "aws", resource_id: "i-demo-1" },
  { id: "d3", resource_name: "App Load Balancer", node_type: "load_balancer", is_public: true, is_sensitive: false, risk_score: 45, region: "ap-south-1", provider: "aws", resource_id: "alb-demo-1" },
  { id: "d4", resource_name: "Lambda Auth Handler", node_type: "lambda_function", is_public: false, is_sensitive: false, risk_score: 20, region: "ap-south-1", provider: "aws", resource_id: "fn-demo-1" },
  { id: "d5", resource_name: "Admin IAM Role", node_type: "iam_role", is_public: false, is_sensitive: true, risk_score: 85, region: "global", provider: "aws", resource_id: "role-demo-1" },
  { id: "d6", resource_name: "DevOps IAM User", node_type: "iam_user", is_public: false, is_sensitive: false, risk_score: 60, region: "global", provider: "aws", resource_id: "user-demo-1" },
  { id: "d7", resource_name: "Customer DB (RDS)", node_type: "rds_instance", is_public: false, is_sensitive: true, risk_score: 90, region: "ap-south-1", provider: "aws", resource_id: "rds-demo-1" },
  { id: "d8", resource_name: "Backup S3 Bucket", node_type: "s3_bucket", is_public: false, is_sensitive: true, risk_score: 70, region: "ap-south-1", provider: "aws", resource_id: "s3-demo-1" },
  { id: "d9", resource_name: "Public S3 Bucket", node_type: "s3_bucket", is_public: true, is_sensitive: false, risk_score: 80, region: "ap-south-1", provider: "aws", resource_id: "s3-demo-2" },
  { id: "d10", resource_name: "KMS Master Key", node_type: "kms_key", is_public: false, is_sensitive: true, risk_score: 15, region: "ap-south-1", provider: "aws", resource_id: "kms-demo-1" },
  { id: "d11", resource_name: "EKS Production Cluster", node_type: "eks_cluster", is_public: false, is_sensitive: true, risk_score: 55, region: "ap-south-1", provider: "aws", resource_id: "eks-demo-1" },
  { id: "d12", resource_name: "VPC (Production)", node_type: "vpc", is_public: false, is_sensitive: false, risk_score: 25, region: "ap-south-1", provider: "aws", resource_id: "vpc-demo-1" },
];

const DEMO_EDGES = [
  { id: "e1", source_node_id: "d1", target_node_id: "d3", edge_type: "network_access", is_risky: false },
  { id: "e2", source_node_id: "d3", target_node_id: "d2", edge_type: "routes_to", is_risky: false },
  { id: "e3", source_node_id: "d2", target_node_id: "d5", edge_type: "can_assume_role", is_risky: true },
  { id: "e4", source_node_id: "d5", target_node_id: "d7", edge_type: "has_permission", is_risky: true },
  { id: "e5", source_node_id: "d5", target_node_id: "d8", edge_type: "has_permission", is_risky: true },
  { id: "e6", source_node_id: "d6", target_node_id: "d5", edge_type: "can_assume_role", is_risky: true },
  { id: "e7", source_node_id: "d1", target_node_id: "d9", edge_type: "network_access", is_risky: true },
  { id: "e8", source_node_id: "d10", target_node_id: "d7", edge_type: "encrypts", is_risky: false },
  { id: "e9", source_node_id: "d12", target_node_id: "d2", edge_type: "contains", is_risky: false },
  { id: "e10", source_node_id: "d12", target_node_id: "d7", edge_type: "contains", is_risky: false },
  { id: "e11", source_node_id: "d12", target_node_id: "d11", edge_type: "contains", is_risky: false },
  { id: "e12", source_node_id: "d4", target_node_id: "d7", edge_type: "has_permission", is_risky: false },
];

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

  const nodes = (dbNodes && dbNodes.length > 0) ? dbNodes : DEMO_NODES;
  const edges = (dbEdges && dbEdges.length > 0) ? dbEdges : DEMO_EDGES;
  const isDemo = !dbNodes || dbNodes.length === 0;
  const isLoading = loadingNodes || loadingEdges;

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

  // Compute stats
  const publicNodes = nodes.filter((n: any) => n.is_public).length;
  const sensitiveNodes = nodes.filter((n: any) => n.is_sensitive).length;
  const riskyEdges = edges.filter((e: any) => e.is_risky).length;
  const highRiskNodes = nodes.filter((n: any) => (n.risk_score ?? 0) >= 70).length;

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
              <h1 className="text-2xl font-bold">Cloud Security Graph</h1>
              <p className="text-muted-foreground">
                Interactive map of your cloud infrastructure relationships and risk exposure
              </p>
              {isDemo && (
                <Badge variant="secondary" className="mt-1">Demo Data — Connect cloud accounts to see real graph</Badge>
              )}
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
        </div>
      </main>

      {/* Node Detail Dialog */}
      <Dialog open={!!selectedNode} onOpenChange={(open) => !open && setSelectedNode(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedNode && (nodeTypeIcons[selectedNode.node_type] || <Server className="h-5 w-5" />)}
              {selectedNode?.resource_name || selectedNode?.resource_id}
            </DialogTitle>
          </DialogHeader>
          {selectedNode && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Type</p>
                  <p className="font-medium capitalize">{(selectedNode.node_type || "").replace(/_/g, " ")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Risk Score</p>
                  <p className="font-medium">{selectedNode.risk_score ?? "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Region</p>
                  <p className="font-medium">{selectedNode.region || "Global"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Provider</p>
                  <p className="font-medium uppercase">{selectedNode.provider || "aws"}</p>
                </div>
              </div>

              <div className="flex gap-2">
                {selectedNode.is_public && <Badge variant="outline" className="bg-orange-500/10 text-orange-600">Public</Badge>}
                {selectedNode.is_sensitive && <Badge variant="outline" className="bg-destructive/10 text-destructive">Sensitive</Badge>}
              </div>

              {/* Connections */}
              {nodeConnections.outgoing.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Outgoing Connections</p>
                  <div className="space-y-1">
                    {nodeConnections.outgoing.map((conn: any) => (
                      <div key={conn.id} className="flex items-center gap-2 text-sm p-2 rounded bg-muted">
                        <span className="text-xs capitalize text-muted-foreground">{(conn.edge_type || "").replace(/_/g, " ")}</span>
                        <span className="text-xs">→</span>
                        <span className="font-medium text-xs">{conn.targetNode?.resource_name || "Unknown"}</span>
                        {conn.is_risky && <Badge variant="destructive" className="text-[10px] ml-auto">Risky</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {nodeConnections.incoming.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Incoming Connections</p>
                  <div className="space-y-1">
                    {nodeConnections.incoming.map((conn: any) => (
                      <div key={conn.id} className="flex items-center gap-2 text-sm p-2 rounded bg-muted">
                        <span className="font-medium text-xs">{conn.sourceNode?.resource_name || "Unknown"}</span>
                        <span className="text-xs">→</span>
                        <span className="text-xs capitalize text-muted-foreground">{(conn.edge_type || "").replace(/_/g, " ")}</span>
                        {conn.is_risky && <Badge variant="destructive" className="text-[10px] ml-auto">Risky</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
