import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { useConfigDrift } from "@/hooks/use-cloud-data";
import { GitCompareArrows, AlertTriangle, Clock } from "lucide-react";

const riskBadge = (score: number) => {
  if (score >= 80) return { variant: "destructive" as const, label: "critical" };
  if (score >= 60) return { variant: "default" as const, label: "high" };
  if (score >= 30) return { variant: "secondary" as const, label: "medium" };
  return { variant: "outline" as const, label: "low" };
};

export default function ConfigDrift() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: drifts = [], isLoading } = useConfigDrift(30);

  // Drift = asset where updated_at > created_at (config actually changed since creation)
  const realDrifts = drifts.filter((d) => d.updated_at && d.created_at && new Date(d.updated_at).getTime() - new Date(d.created_at).getTime() > 60_000);
  const critical = realDrifts.filter((d) => (d.risk_score ?? 0) >= 80).length;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} lastScanTime="" />
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="md:ml-64 pt-16">
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="heading-display flex items-center gap-2">
              <GitCompareArrows className="h-6 w-6" />
              Configuration Drift Detection
            </h1>
            <p className="text-fluid-subtitle text-muted-foreground">Assets whose configuration changed since first discovery — last 30 days.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Changed Assets</p><p className="text-2xl font-bold">{realDrifts.length}</p></CardContent></Card>
            <Card className={critical > 0 ? "border-destructive/30" : ""}><CardContent className="p-4"><p className="text-sm text-muted-foreground">Critical Risk</p><p className="text-2xl font-bold text-destructive">{critical}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Tracked</p><p className="text-2xl font-bold">{drifts.length}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Window</p><p className="text-2xl font-bold">30d</p></CardContent></Card>
          </div>

          {isLoading ? (
            <Card><CardContent className="p-6 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</CardContent></Card>
          ) : realDrifts.length === 0 ? (
            <EmptyState
              icon={<GitCompareArrows className="h-7 w-7" />}
              title="No configuration drift detected"
              description="Connect a cloud account and run a scan. Once we have two or more snapshots, changed resources will appear here."
            />
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-base">Recent Configuration Changes</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Resource</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Region</TableHead>
                        <TableHead>Risk</TableHead>
                        <TableHead>Changed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {realDrifts.map((d) => {
                        const r = riskBadge(d.risk_score ?? 0);
                        return (
                          <TableRow key={d.id}>
                            <TableCell>
                              <p className="font-medium text-sm">{d.resource_name || d.resource_id}</p>
                              <p className="text-xs text-muted-foreground font-mono">{d.resource_id}</p>
                            </TableCell>
                            <TableCell className="text-sm">{d.resource_type} · {d.provider.toUpperCase()}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{d.region || "—"}</TableCell>
                            <TableCell><Badge variant={r.variant}>{r.label}</Badge></TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Clock className="h-3.5 w-3.5" />
                                {d.updated_at ? formatDistanceToNow(new Date(d.updated_at), { addSuffix: true }) : "—"}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
