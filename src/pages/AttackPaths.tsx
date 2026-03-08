import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  ArrowDown,
  Shield,
  Globe,
  Server,
  Users,
  Database,
  HardDrive,
  RefreshCw,
  ChevronRight,
} from "lucide-react";

interface AttackPathNode {
  id: string;
  label: string;
  type: "entry" | "compute" | "identity" | "storage" | "database" | "network";
  risk: "critical" | "high" | "medium" | "low";
}

interface AttackPath {
  id: string;
  name: string;
  severity: "critical" | "high" | "medium";
  probability: number;
  estimatedLoss: number;
  nodes: AttackPathNode[];
  description: string;
}

// Demo attack paths — will be replaced by real graph engine data
const DEMO_PATHS: AttackPath[] = [
  {
    id: "ap-1",
    name: "Public VM → Customer Database",
    severity: "critical",
    probability: 23,
    estimatedLoss: 2600000,
    description: "An attacker could exploit a publicly accessible EC2 instance, escalate privileges through an over-permissioned IAM role, access an S3 bucket, and reach the customer database.",
    nodes: [
      { id: "n1", label: "Internet (Entry Point)", type: "entry", risk: "critical" },
      { id: "n2", label: "Public EC2 Instance", type: "compute", risk: "critical" },
      { id: "n3", label: "IAM Role (Over-Permissioned)", type: "identity", risk: "high" },
      { id: "n4", label: "S3 Bucket (Unencrypted)", type: "storage", risk: "high" },
      { id: "n5", label: "Customer Database (RDS)", type: "database", risk: "critical" },
    ],
  },
  {
    id: "ap-2",
    name: "Exposed API → Data Exfiltration",
    severity: "high",
    probability: 15,
    estimatedLoss: 1800000,
    description: "A publicly exposed API gateway without proper authentication could allow access to internal services and eventually exfiltrate sensitive data from storage.",
    nodes: [
      { id: "n1", label: "Internet (Entry Point)", type: "entry", risk: "high" },
      { id: "n2", label: "API Gateway (No Auth)", type: "network", risk: "high" },
      { id: "n3", label: "Lambda Function", type: "compute", risk: "medium" },
      { id: "n4", label: "S3 Bucket (Public)", type: "storage", risk: "high" },
    ],
  },
  {
    id: "ap-3",
    name: "Weak IAM → Privilege Escalation",
    severity: "medium",
    probability: 8,
    estimatedLoss: 900000,
    description: "A service account with overly broad permissions could be used to escalate privileges and gain admin-level access across the cloud environment.",
    nodes: [
      { id: "n1", label: "Compromised Credentials", type: "entry", risk: "medium" },
      { id: "n2", label: "Service Account", type: "identity", risk: "medium" },
      { id: "n3", label: "Admin IAM Role", type: "identity", risk: "high" },
      { id: "n4", label: "All Resources", type: "compute", risk: "high" },
    ],
  },
];

const nodeIconMap: Record<AttackPathNode["type"], React.ReactNode> = {
  entry: <Globe className="h-5 w-5" />,
  compute: <Server className="h-5 w-5" />,
  identity: <Users className="h-5 w-5" />,
  storage: <HardDrive className="h-5 w-5" />,
  database: <Database className="h-5 w-5" />,
  network: <Shield className="h-5 w-5" />,
};

const riskColors: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/20",
  high: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  low: "bg-green-500/10 text-green-600 border-green-500/20",
};

const severityBadge: Record<string, "destructive" | "default" | "secondary"> = {
  critical: "destructive",
  high: "default",
  medium: "secondary",
};

function AttackPathVisualization({ path }: { path: AttackPath }) {
  return (
    <div className="flex flex-col items-center gap-1 py-4">
      {path.nodes.map((node, i) => (
        <div key={node.id} className="flex flex-col items-center">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${riskColors[node.risk]} min-w-[280px]`}>
            <div className="shrink-0">{nodeIconMap[node.type]}</div>
            <div className="flex-1">
              <p className="text-sm font-medium">{node.label}</p>
              <p className="text-xs opacity-70 capitalize">{node.type}</p>
            </div>
            <Badge variant="outline" className={riskColors[node.risk]}>
              {node.risk}
            </Badge>
          </div>
          {i < path.nodes.length - 1 && (
            <ArrowDown className="h-5 w-5 text-muted-foreground my-1" />
          )}
        </div>
      ))}
    </div>
  );
}

export default function AttackPaths() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPath, setSelectedPath] = useState<AttackPath>(DEMO_PATHS[0]);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} lastScanTime="" onRefresh={() => {}} />
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
            <Button variant="outline" size="sm">
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
                  <p className="text-2xl font-bold">{DEMO_PATHS.filter(p => p.severity === "critical").length}</p>
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
                  <p className="text-2xl font-bold">{Math.max(...DEMO_PATHS.map(p => p.probability))}%</p>
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
                  <p className="text-2xl font-bold">₹{(Math.max(...DEMO_PATHS.map(p => p.estimatedLoss)) / 100000).toFixed(1)}L</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Path List */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base">Detected Paths</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {DEMO_PATHS.map((path) => (
                  <div
                    key={path.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedPath.id === path.id ? "bg-muted border-primary/30" : "hover:bg-muted/50"
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
                <div className="mt-4 p-3 rounded-lg bg-muted text-sm">
                  <p className="font-medium mb-1">Estimated Financial Impact</p>
                  <p className="text-2xl font-bold">₹{selectedPath.estimatedLoss.toLocaleString("en-IN")}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Based on data sensitivity, regulatory fines, and recovery costs
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
