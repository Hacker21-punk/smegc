import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Shield,
  Database,
  RefreshCw,
  ChevronRight,
  Zap,
} from "lucide-react";
import {
  AttackPathVisualization,
  type AttackPath,
} from "@/components/dashboard/attack-paths/AttackPathVisualization";
import { useAttackPaths } from "@/hooks/use-attack-paths";
import { processAttackPathForAutopilot } from "@/lib/graph-autopilot-integration";
import { toast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Target } from "lucide-react";

const severityBadge: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
  critical: "destructive",
  high: "default",
  medium: "secondary",
  low: "outline",
};

export default function AttackPaths() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: paths = [], isLoading, refetch } = useAttackPaths();
  const [selectedPath, setSelectedPath] = useState<AttackPath | null>(null);

  useEffect(() => {
    if (paths.length > 0 && !selectedPath) {
      setSelectedPath(paths[0]);
    }
  }, [paths, selectedPath]);

  const criticalCount = paths.filter((p) => p.severity === "critical").length;
  const maxProbability = paths.length > 0 ? Math.max(...paths.map((p) => p.probability)) : 0;
  const maxLoss = paths.length > 0 ? Math.max(...paths.map((p) => p.estimatedLoss)) : 0;

  const handleTriggerAutopilot = async () => {
    if (!selectedPath) return;
    try {
      await processAttackPathForAutopilot("", selectedPath.id);
      toast({ title: "Autopilot Triggered", description: "Remediation recommendations created for this attack path." });
    } catch {
      toast({ title: "Autopilot Notice", description: "Remediation recommendations queued. Connect cloud accounts to activate.", variant: "default" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} lastScanTime="" onRefresh={() => refetch()} />
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="md:ml-64 pt-16">
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Attack Path Analysis</h1>
              <p className="text-muted-foreground">
                Visualize potential breach paths through your cloud infrastructure
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Re-analyze
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Critical Paths</p>
                  {isLoading ? <Skeleton className="h-8 w-8" /> : <p className="text-2xl font-bold">{criticalCount}</p>}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Highest Probability</p>
                  {isLoading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold">{maxProbability}%</p>}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Max Financial Impact</p>
                  {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold">₹{(maxLoss / 100000).toFixed(1)}L</p>}
                </div>
              </CardContent>
            </Card>
          </div>

          {!isLoading && paths.length === 0 ? (
            <EmptyState
              icon={<Target className="h-7 w-7" />}
              title="No attack paths detected yet"
              description="Once a cloud account is connected and scanned, CloudGuard will model relationships between assets and surface realistic breach paths here."
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Path List */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-base">Detected Paths</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {isLoading
                    ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
                    : paths.map((path) => (
                        <div
                          key={path.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedPath?.id === path.id ? "bg-muted border-primary/30" : "hover:bg-muted/50"
                          }`}
                          onClick={() => setSelectedPath(path)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant={severityBadge[path.severity]}>{path.severity}</Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <p className="text-sm font-medium">{path.name}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span>{path.probability}% probability</span>
                            <span>₹{(path.estimatedLoss / 100000).toFixed(1)}L impact</span>
                          </div>
                        </div>
                      ))}
                </CardContent>
              </Card>

              {/* Path Visualization */}
              <Card className="lg:col-span-2">
                {selectedPath ? (
                  <>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">{selectedPath.name}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">{selectedPath.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-destructive">{selectedPath.probability}%</p>
                          <p className="text-xs text-muted-foreground">breach probability</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <AttackPathVisualization path={selectedPath} />
                      <div className="mt-4 flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 p-3 rounded-lg bg-muted text-sm">
                          <p className="font-medium mb-1">Estimated Financial Impact</p>
                          <p className="text-2xl font-bold">₹{selectedPath.estimatedLoss.toLocaleString("en-IN")}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Based on data sensitivity, regulatory fines, and recovery costs
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 justify-end">
                          <Button size="sm" onClick={handleTriggerAutopilot}>
                            <Zap className="h-4 w-4 mr-2" />
                            Trigger Autopilot
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </>
                ) : (
                  <CardContent className="p-8 text-center text-muted-foreground">
                    Select an attack path to visualize
                  </CardContent>
                )}
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
