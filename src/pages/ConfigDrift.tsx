import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/dashboard/EmptyState";
import {
  GitCompareArrows,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Shield,
  ArrowRight,
} from "lucide-react";

interface DriftEvent {
  id: string;
  resource: string;
  resourceType: string;
  provider: "aws" | "azure" | "gcp";
  change: string;
  riskLevel: "critical" | "high" | "medium" | "low";
  detectedAt: string;
  status: "open" | "remediated" | "accepted";
  previousValue: string;
  currentValue: string;
}

const DEMO_DRIFTS: DriftEvent[] = [];

const riskBadgeVariant: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
  critical: "destructive",
  high: "default",
  medium: "secondary",
  low: "outline",
};

const statusConfig: Record<string, { icon: React.ReactNode; label: string }> = {
  open: { icon: <AlertTriangle className="h-3.5 w-3.5 text-destructive" />, label: "Open" },
  remediated: { icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />, label: "Remediated" },
  accepted: { icon: <Shield className="h-3.5 w-3.5 text-muted-foreground" />, label: "Accepted" },
};

export default function ConfigDrift() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const openDrifts = DEMO_DRIFTS.filter(d => d.status === "open").length;
  const criticalDrifts = DEMO_DRIFTS.filter(d => d.riskLevel === "critical" && d.status === "open").length;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} lastScanTime="" />
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="md:ml-64 pt-16">
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <GitCompareArrows className="h-6 w-6" />
                Configuration Drift Detection
              </h1>
              <p className="text-muted-foreground">
                Monitor infrastructure changes and detect risky configuration drift
              </p>
            </div>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Scan Now
            </Button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Changes</p>
                <p className="text-2xl font-bold">{DEMO_DRIFTS.length}</p>
              </CardContent>
            </Card>
            <Card className={openDrifts > 0 ? "border-destructive/30" : ""}>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Open Drifts</p>
                <p className="text-2xl font-bold text-destructive">{openDrifts}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold">{criticalDrifts}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Auto-Remediated</p>
                <p className="text-2xl font-bold text-green-500">
                  {DEMO_DRIFTS.filter(d => d.status === "remediated").length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Drift Table */}
          {DEMO_DRIFTS.length === 0 ? (
            <EmptyState
              icon={<GitCompareArrows className="h-7 w-7" />}
              title="No configuration changes detected"
              description="CloudGuard continuously monitors your cloud infrastructure for risky configuration drift. Connect an account to start tracking changes."
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Configuration Changes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Resource</TableHead>
                        <TableHead>Change</TableHead>
                        <TableHead>Risk</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Detected</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {DEMO_DRIFTS.map(drift => {
                        const status = statusConfig[drift.status];
                        return (
                          <TableRow key={drift.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{drift.resource}</p>
                                <p className="text-xs text-muted-foreground">{drift.resourceType} · {drift.provider.toUpperCase()}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-xs">
                                <p className="text-sm">{drift.change}</p>
                                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                  <span className="line-through">{drift.previousValue}</span>
                                  <ArrowRight className="h-3 w-3" />
                                  <span className="text-foreground">{drift.currentValue}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={riskBadgeVariant[drift.riskLevel]}>{drift.riskLevel}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                {status.icon}
                                <span className="text-sm">{status.label}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Clock className="h-3.5 w-3.5" />
                                {drift.detectedAt}
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
