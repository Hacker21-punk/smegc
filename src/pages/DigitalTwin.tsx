import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { useGraphNodes, useGraphEdges } from "@/hooks/use-attack-paths";
import {
  Layers, Server, Database, Globe, Shield, Key, HardDrive,
  CheckCircle2, XCircle, AlertTriangle, Cpu, Network,
} from "lucide-react";

const iconFor = (nodeType: string) => {
  if (nodeType.includes("ec2") || nodeType.includes("lambda") || nodeType.includes("ecs") || nodeType.includes("eks")) return <Cpu className="h-4 w-4" />;
  if (nodeType.includes("s3") || nodeType.includes("secrets") || nodeType.includes("kms")) return <HardDrive className="h-4 w-4" />;
  if (nodeType.includes("rds") || nodeType.includes("dynamo")) return <Database className="h-4 w-4" />;
  if (nodeType.includes("iam")) return <Key className="h-4 w-4" />;
  if (nodeType.includes("vpc") || nodeType.includes("subnet") || nodeType.includes("gateway") || nodeType.includes("load_balancer")) return <Network className="h-4 w-4" />;
  if (nodeType.includes("security_group")) return <Shield className="h-4 w-4" />;
  return <Server className="h-4 w-4" />;
};

const statusFor = (score: number) => {
  if (score >= 80) return { label: "critical", cls: "border-destructive/30 bg-destructive/5", badge: "bg-destructive/10 text-destructive", icon: <XCircle className="h-3 w-3 mr-1" /> };
  if (score >= 50) return { label: "at risk", cls: "border-orange-500/30 bg-orange-500/5", badge: "bg-orange-500/10 text-orange-500", icon: <AlertTriangle className="h-3 w-3 mr-1" /> };
  return { label: "secure", cls: "border-green-500/30 bg-green-500/5", badge: "bg-green-500/10 text-green-600", icon: <CheckCircle2 className="h-3 w-3 mr-1" /> };
};

export default function DigitalTwin() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: nodes = [], isLoading: nLoading } = useGraphNodes();
  const { data: edges = [] } = useGraphEdges();

  const isLoading = nLoading;
  const secure = nodes.filter((n) => (n.risk_score ?? 0) < 50).length;
  const atRisk = nodes.filter((n) => (n.risk_score ?? 0) >= 50 && (n.risk_score ?? 0) < 80).length;
  const critical = nodes.filter((n) => (n.risk_score ?? 0) >= 80).length;

  // edges per node for connection counts
  const edgeCounts = edges.reduce<Record<string, number>>((acc, e) => {
    acc[e.source_node_id] = (acc[e.source_node_id] ?? 0) + 1;
    acc[e.target_node_id] = (acc[e.target_node_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} lastScanTime="" />
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="md:ml-64 pt-16">
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="heading-display flex items-center gap-2">
              <Layers className="h-6 w-6 text-primary" />
              Digital Twin — Cloud Replica
            </h1>
            <p className="text-fluid-subtitle text-muted-foreground">A live mirror of your cloud infrastructure built from the security graph.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{nodes.length}</p><p className="text-xs text-muted-foreground">Replicated Assets</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-500">{secure}</p><p className="text-xs text-muted-foreground">Secure</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-orange-500">{atRisk}</p><p className="text-xs text-muted-foreground">At Risk</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-destructive">{critical}</p><p className="text-xs text-muted-foreground">Critical</p></CardContent></Card>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
            </div>
          ) : nodes.length === 0 ? (
            <EmptyState
              icon={<Layers className="h-7 w-7" />}
              title="Digital twin not built yet"
              description="Connect a cloud account and run a scan. We'll build a live replica of your infrastructure here for safe simulation."
            />
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">Infrastructure Topology</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {nodes.slice(0, 60).map((n) => {
                      const s = statusFor(n.risk_score ?? 0);
                      return (
                        <Card key={n.id} className={`border ${s.cls}`}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                  {iconFor(n.node_type)}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate">{n.resource_name || n.resource_id}</p>
                                  <p className="text-[10px] text-muted-foreground truncate font-mono">{n.node_type}</p>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-[10px] shrink-0">{n.provider.toUpperCase()}</Badge>
                            </div>
                            <div className="flex items-center justify-between mt-3">
                              <Badge variant="outline" className={`text-xs ${s.badge}`}>{s.icon}{s.label}</Badge>
                              <p className="text-[10px] text-muted-foreground">{edgeCounts[n.id] ?? 0} edges</p>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                  {nodes.length > 60 && (
                    <p className="text-xs text-muted-foreground text-center mt-4">Showing top 60 of {nodes.length} replicated assets</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
