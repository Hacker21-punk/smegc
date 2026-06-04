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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/dashboard/EmptyState";
import {
  Radar,
  AlertTriangle,
  Globe,
  Skull,
  Key,
  Activity,
  RefreshCw,
  Shield,
  Clock,
} from "lucide-react";

interface ThreatIndicator {
  id: string;
  type: "ip" | "ransomware" | "credential" | "api";
  indicator: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  source: string;
  detectedAt: string;
  affectedResources: number;
  status: "active" | "mitigated" | "monitoring";
}

const DEMO_THREATS: ThreatIndicator[] = [];

const typeIcons: Record<string, React.ReactNode> = {
  ip: <Globe className="h-4 w-4" />,
  ransomware: <Skull className="h-4 w-4" />,
  credential: <Key className="h-4 w-4" />,
  api: <Activity className="h-4 w-4" />,
};

const severityBadge: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
  critical: "destructive",
  high: "default",
  medium: "secondary",
  low: "outline",
};

const statusColors: Record<string, string> = {
  active: "text-destructive",
  mitigated: "text-green-500",
  monitoring: "text-yellow-500",
};

export default function ThreatIntelligence() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const filtered = activeTab === "all"
    ? DEMO_THREATS
    : DEMO_THREATS.filter(t => t.type === activeTab);

  const activeThreats = DEMO_THREATS.filter(t => t.status === "active").length;
  const criticalThreats = DEMO_THREATS.filter(t => t.severity === "critical").length;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} lastScanTime="" />
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="md:ml-64 pt-16">
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="heading-display flex items-center gap-2">
                <Radar className="h-6 w-6 text-primary" />
                Threat Intelligence
              </h1>
              <p className="text-fluid-subtitle text-muted-foreground">
                Real-time threat feeds and indicators of compromise affecting your environment
              </p>
            </div>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Update Feeds
            </Button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className={activeThreats > 0 ? "border-destructive/30" : ""}>
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-2xl font-bold">{activeThreats}</p>
                  <p className="text-xs text-muted-foreground">Active Threats</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Skull className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-2xl font-bold">{criticalThreats}</p>
                  <p className="text-xs text-muted-foreground">Critical</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Shield className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {DEMO_THREATS.filter(t => t.status === "mitigated").length}
                  </p>
                  <p className="text-xs text-muted-foreground">Mitigated</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Radar className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">4</p>
                  <p className="text-xs text-muted-foreground">Intel Sources</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {DEMO_THREATS.length === 0 ? (
            <EmptyState
              icon={<Radar className="h-7 w-7" />}
              title="No threat indicators yet"
              description="Once cloud accounts are connected, CloudGuard will correlate audit logs and threat feeds (AbuseIPDB, CISA, HIBP) to surface indicators of compromise."
            />
          ) : (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="text-base">Threat Indicators</CardTitle>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="ip">IPs</TabsTrigger>
                    <TabsTrigger value="ransomware">Ransomware</TabsTrigger>
                    <TabsTrigger value="credential">Credentials</TabsTrigger>
                    <TabsTrigger value="api">API Abuse</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Indicator</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Detected</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(threat => (
                      <TableRow key={threat.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {typeIcons[threat.type]}
                            <span className="text-xs capitalize">{threat.type}</span>
                          </div>
                        </TableCell>
                        <TableCell><span className="font-mono text-sm">{threat.indicator}</span></TableCell>
                        <TableCell>
                          <p className="text-sm max-w-xs">{threat.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">{threat.affectedResources} resource{threat.affectedResources > 1 ? "s" : ""} affected</p>
                        </TableCell>
                        <TableCell><Badge variant={severityBadge[threat.severity]}>{threat.severity}</Badge></TableCell>
                        <TableCell><span className={`text-sm font-medium capitalize ${statusColors[threat.status]}`}>{threat.status}</span></TableCell>
                        <TableCell><span className="text-sm text-muted-foreground">{threat.source}</span></TableCell>
                        <TableCell><div className="flex items-center gap-1 text-sm text-muted-foreground"><Clock className="h-3.5 w-3.5" />{threat.detectedAt}</div></TableCell>
                      </TableRow>
                    ))}
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
