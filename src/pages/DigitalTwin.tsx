import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Layers,
  Play,
  Server,
  Database,
  Globe,
  Shield,
  Key,
  HardDrive,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Cpu,
} from "lucide-react";

interface TwinNode {
  id: string;
  name: string;
  type: "compute" | "storage" | "database" | "identity" | "network" | "security";
  provider: "AWS" | "Azure" | "GCP";
  status: "secure" | "at_risk" | "critical";
  connections: string[];
}

interface WhatIfResult {
  id: string;
  scenario: string;
  impact: "positive" | "negative" | "neutral";
  riskChange: number;
  details: string;
}

const TWIN_NODES: TwinNode[] = [];
const WHAT_IF_SCENARIOS: WhatIfResult[] = [];

const iconMap: Record<string, React.ReactNode> = {
  compute: <Cpu className="h-4 w-4" />,
  storage: <HardDrive className="h-4 w-4" />,
  database: <Database className="h-4 w-4" />,
  identity: <Key className="h-4 w-4" />,
  network: <Globe className="h-4 w-4" />,
  security: <Shield className="h-4 w-4" />,
};

const statusColors: Record<string, string> = {
  secure: "border-green-500/30 bg-green-500/5",
  at_risk: "border-orange-500/30 bg-orange-500/5",
  critical: "border-destructive/30 bg-destructive/5",
};

const statusBadge: Record<string, string> = {
  secure: "bg-green-500/10 text-green-600",
  at_risk: "bg-orange-500/10 text-orange-500",
  critical: "bg-destructive/10 text-destructive",
};

export default function DigitalTwin() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [runningScenario, setRunningScenario] = useState<string | null>(null);

  const runWhatIf = (id: string) => {
    setRunningScenario(id);
    toast.info("Running what-if simulation on digital twin...");
    setTimeout(() => {
      setRunningScenario(null);
      toast.success("Simulation complete — results updated");
    }, 2000);
  };

  const secureCount = TWIN_NODES.filter(n => n.status === "secure").length;
  const atRiskCount = TWIN_NODES.filter(n => n.status === "at_risk").length;
  const criticalCount = TWIN_NODES.filter(n => n.status === "critical").length;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} lastScanTime="" onRefresh={() => {}} />
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="md:ml-64 pt-16">
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Layers className="h-6 w-6 text-primary" />
              Digital Twin — Cloud Replica
            </h1>
            <p className="text-muted-foreground">Virtual replica of your infrastructure for safe attack simulation and policy testing</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{TWIN_NODES.length}</p><p className="text-xs text-muted-foreground">Replicated Assets</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-500">{secureCount}</p><p className="text-xs text-muted-foreground">Secure</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-orange-500">{atRiskCount}</p><p className="text-xs text-muted-foreground">At Risk</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-destructive">{criticalCount}</p><p className="text-xs text-muted-foreground">Critical</p></CardContent></Card>
          </div>

          <Tabs defaultValue="topology">
            <TabsList>
              <TabsTrigger value="topology">Infrastructure Topology</TabsTrigger>
              <TabsTrigger value="whatif">What-If Simulations</TabsTrigger>
            </TabsList>

            <TabsContent value="topology" className="mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {TWIN_NODES.map(node => (
                  <Card key={node.id} className={`border ${statusColors[node.status]}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                            {iconMap[node.type]}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{node.name}</p>
                            <p className="text-[10px] text-muted-foreground">{node.id}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px]">{node.provider}</Badge>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <Badge variant="outline" className={`text-xs ${statusBadge[node.status]}`}>
                          {node.status === "secure" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {node.status === "at_risk" && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {node.status === "critical" && <XCircle className="h-3 w-3 mr-1" />}
                          {node.status.replace("_", " ")}
                        </Badge>
                        <p className="text-[10px] text-muted-foreground">{node.connections.length} connections</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="whatif" className="mt-4 space-y-4">
              {WHAT_IF_SCENARIOS.map(s => (
                <Card key={s.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium">{s.scenario}</p>
                      <p className="text-sm text-muted-foreground mt-1">{s.details}</p>
                      <Badge variant="outline" className={`mt-2 text-xs ${
                        s.impact === "positive" ? "text-green-600 bg-green-500/10" :
                        s.impact === "negative" ? "text-destructive bg-destructive/10" :
                        "text-muted-foreground"
                      }`}>
                        Risk: {s.riskChange > 0 ? "+" : ""}{s.riskChange} points
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={runningScenario === s.id}
                      onClick={() => runWhatIf(s.id)}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      {runningScenario === s.id ? "Running..." : "Simulate"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
