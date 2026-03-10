import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Globe,
  Server,
  Users,
  Database,
  HardDrive,
  Shield,
  Lock,
  Network,
  Layers,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Zap,
  Target,
  Flame,
} from "lucide-react";
import {
  calculateBlastRadius,
  getReachableSensitiveAssets,
  type GraphNode,
  type GraphEdge,
} from "@/lib/graph-algorithms";

interface NodeDetailPanelProps {
  node: any | null;
  nodes: any[];
  edges: any[];
  open: boolean;
  onClose: () => void;
  onSelectNode?: (node: any) => void;
}

const nodeTypeIcons: Record<string, React.ReactNode> = {
  internet_gateway: <Globe className="h-5 w-5" />,
  nat_gateway: <Network className="h-5 w-5" />,
  load_balancer: <Layers className="h-5 w-5" />,
  ec2_instance: <Server className="h-5 w-5" />,
  lambda_function: <Server className="h-5 w-5" />,
  ecs_cluster: <Server className="h-5 w-5" />,
  eks_cluster: <Server className="h-5 w-5" />,
  iam_user: <Users className="h-5 w-5" />,
  iam_role: <Users className="h-5 w-5" />,
  iam_group: <Users className="h-5 w-5" />,
  iam_policy: <Lock className="h-5 w-5" />,
  s3_bucket: <HardDrive className="h-5 w-5" />,
  secrets_manager: <Lock className="h-5 w-5" />,
  rds_instance: <Database className="h-5 w-5" />,
  security_group: <Shield className="h-5 w-5" />,
  vpc: <Network className="h-5 w-5" />,
  subnet: <Network className="h-5 w-5" />,
  kms_key: <Lock className="h-5 w-5" />,
  external_internet: <Globe className="h-5 w-5" />,
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

export function NodeDetailPanel({
  node,
  nodes,
  edges,
  open,
  onClose,
  onSelectNode,
}: NodeDetailPanelProps) {
  // Compute connections
  const connections = useMemo(() => {
    if (!node) return { incoming: [], outgoing: [] };
    const outgoing = edges
      .filter((e: any) => e.source_node_id === node.id)
      .map((e: any) => ({
        ...e,
        targetNode: nodes.find((n: any) => n.id === e.target_node_id),
      }));
    const incoming = edges
      .filter((e: any) => e.target_node_id === node.id)
      .map((e: any) => ({
        ...e,
        sourceNode: nodes.find((n: any) => n.id === e.source_node_id),
      }));
    return { incoming, outgoing };
  }, [node, edges, nodes]);

  // Blast radius
  const blastRadius = useMemo(() => {
    if (!node) return null;
    return calculateBlastRadius(
      nodes as GraphNode[],
      edges as GraphEdge[],
      node.id,
      5
    );
  }, [node, nodes, edges]);

  // Reachable sensitive assets
  const reachableSensitive = useMemo(() => {
    if (!node) return [];
    return getReachableSensitiveAssets(
      nodes as GraphNode[],
      edges as GraphEdge[],
      node.id,
      6
    );
  }, [node, nodes, edges]);

  if (!node) return null;

  const totalConnections = connections.incoming.length + connections.outgoing.length;
  const riskScore = node.risk_score ?? 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${riskColor(riskScore)}`}>
              {nodeTypeIcons[node.node_type] || <Server className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-semibold truncate">
                {node.resource_name || node.resource_id}
              </p>
              <p className="text-sm text-muted-foreground capitalize">
                {(node.node_type || "").replace(/_/g, " ")}
              </p>
            </div>
            <Badge variant="outline" className={riskColor(riskScore)}>
              {riskLabel(riskScore)} ({riskScore})
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-100px)]">
          <div className="p-6 pt-4 space-y-5">
            {/* Properties Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Region</p>
                <p className="text-sm font-semibold mt-0.5">{node.region || "Global"}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Provider</p>
                <p className="text-sm font-semibold mt-0.5 uppercase">{node.provider || "aws"}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Connections</p>
                <p className="text-sm font-semibold mt-0.5">{totalConnections}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Status</p>
                <div className="flex gap-1.5 mt-1">
                  {node.is_public && <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-600 px-1.5">Public</Badge>}
                  {node.is_sensitive && <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive px-1.5">Sensitive</Badge>}
                  {!node.is_public && !node.is_sensitive && <span className="text-xs text-muted-foreground">Internal</span>}
                </div>
              </div>
            </div>

            {/* Risk Score Breakdown */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                Risk Assessment
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Risk Score</span>
                  <span className="font-semibold">{riskScore}/100</span>
                </div>
                <Progress value={riskScore} className="h-2" />
              </div>
            </div>

            {/* Blast Radius */}
            {blastRadius && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-500" />
                    Blast Radius (if compromised)
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg border bg-muted/30 text-center">
                      <p className="text-2xl font-bold">{blastRadius.affectedNodeIds.length}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Affected Assets</p>
                    </div>
                    <div className="p-3 rounded-lg border bg-destructive/5 text-center">
                      <p className="text-2xl font-bold text-destructive">{blastRadius.sensitiveCount}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sensitive Targets</p>
                    </div>
                    <div className="p-3 rounded-lg border bg-orange-500/5 text-center">
                      <p className="text-2xl font-bold text-orange-600">{blastRadius.totalRiskExposure}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Risk Exposure</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Reachable Sensitive Assets */}
            {reachableSensitive.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4 text-destructive" />
                    Reachable Sensitive Assets
                  </h4>
                  <div className="space-y-1.5">
                    {reachableSensitive.map((sn) => (
                      <div
                        key={sn.id}
                        className="flex items-center gap-2 p-2 rounded-lg bg-destructive/5 border border-destructive/10 cursor-pointer hover:bg-destructive/10 transition-colors"
                        onClick={() => {
                          const fullNode = nodes.find((n: any) => n.id === sn.id);
                          if (fullNode && onSelectNode) onSelectNode(fullNode);
                        }}
                      >
                        <div className="shrink-0">
                          {nodeTypeIcons[sn.node_type] || <Server className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{sn.resource_name || sn.resource_id}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{sn.node_type.replace(/_/g, " ")}</p>
                        </div>
                        <Badge variant="outline" className={`text-[10px] ${riskColor(sn.risk_score)}`}>
                          {sn.risk_score}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Connection Chain Explorer */}
            <Separator />
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Connection Explorer
              </h4>

              {connections.outgoing.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <ArrowRight className="h-3 w-3" /> Outgoing ({connections.outgoing.length})
                  </p>
                  <div className="space-y-1">
                    {connections.outgoing.map((conn: any) => (
                      <div
                        key={conn.id}
                        className="flex items-center gap-2 text-sm p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                        onClick={() => conn.targetNode && onSelectNode?.(conn.targetNode)}
                      >
                        <div className="shrink-0">
                          {conn.targetNode && (nodeTypeIcons[conn.targetNode.node_type] || <Server className="h-3.5 w-3.5" />)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{conn.targetNode?.resource_name || "Unknown"}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{(conn.edge_type || "").replace(/_/g, " ")}</p>
                        </div>
                        {conn.is_risky && <Badge variant="destructive" className="text-[10px]">Risky</Badge>}
                        {conn.targetNode && (
                          <Badge variant="outline" className={`text-[10px] ${riskColor(conn.targetNode.risk_score)}`}>
                            {conn.targetNode.risk_score ?? 0}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {connections.incoming.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <ArrowLeft className="h-3 w-3" /> Incoming ({connections.incoming.length})
                  </p>
                  <div className="space-y-1">
                    {connections.incoming.map((conn: any) => (
                      <div
                        key={conn.id}
                        className="flex items-center gap-2 text-sm p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                        onClick={() => conn.sourceNode && onSelectNode?.(conn.sourceNode)}
                      >
                        <div className="shrink-0">
                          {conn.sourceNode && (nodeTypeIcons[conn.sourceNode.node_type] || <Server className="h-3.5 w-3.5" />)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{conn.sourceNode?.resource_name || "Unknown"}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{(conn.edge_type || "").replace(/_/g, " ")}</p>
                        </div>
                        {conn.is_risky && <Badge variant="destructive" className="text-[10px]">Risky</Badge>}
                        {conn.sourceNode && (
                          <Badge variant="outline" className={`text-[10px] ${riskColor(conn.sourceNode.risk_score)}`}>
                            {conn.sourceNode.risk_score ?? 0}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {totalConnections === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No connections detected for this node
                </p>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
