import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Crosshair,
  Play,
  AlertTriangle,
  TrendingUp,
  Shield,
  Zap,
  Target,
  ArrowDown,
  Clock,
  IndianRupee,
} from "lucide-react";

interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  type: "credential_theft" | "privilege_escalation" | "ransomware" | "data_exfiltration" | "public_exploit";
  status: "idle" | "running" | "completed";
  breachProbability: number;
  financialImpact: number;
  breachPath: string[];
  lastRun: string | null;
  attackSteps: number;
  criticalAssets: number;
}

const SCENARIOS: SimulationScenario[] = [
  {
    id: "sim-1",
    name: "Credential Theft via Phishing",
    description: "Simulates attacker gaining access via compromised employee credentials and lateral movement",
    type: "credential_theft",
    status: "completed",
    breachProbability: 23,
    financialImpact: 2600000,
    breachPath: ["Internet", "Phishing Email", "Employee Workstation", "IAM Credentials", "S3 Bucket", "Customer Database"],
    lastRun: "2 hours ago",
    attackSteps: 6,
    criticalAssets: 3,
  },
  {
    id: "sim-2",
    name: "Privilege Escalation Attack",
    description: "Simulates exploiting misconfigured IAM policies to escalate from read-only to admin access",
    type: "privilege_escalation",
    status: "completed",
    breachProbability: 31,
    financialImpact: 1800000,
    breachPath: ["Compromised User", "Overprivileged Role", "Admin Access", "RDS Instance", "PII Data"],
    lastRun: "4 hours ago",
    attackSteps: 5,
    criticalAssets: 2,
  },
  {
    id: "sim-3",
    name: "Ransomware Deployment",
    description: "Simulates ransomware encrypting EBS volumes and S3 buckets after initial compromise",
    type: "ransomware",
    status: "completed",
    breachProbability: 12,
    financialImpact: 4200000,
    breachPath: ["Public EC2", "Lateral Movement", "EBS Volumes", "S3 Buckets", "Encryption Lock"],
    lastRun: "6 hours ago",
    attackSteps: 5,
    criticalAssets: 8,
  },
  {
    id: "sim-4",
    name: "Data Exfiltration via Public API",
    description: "Simulates data theft through exposed API endpoints lacking proper authentication",
    type: "data_exfiltration",
    status: "idle",
    breachProbability: 18,
    financialImpact: 3100000,
    breachPath: ["Internet", "Public API Gateway", "Lambda Function", "DynamoDB", "External Upload"],
    lastRun: null,
    attackSteps: 5,
    criticalAssets: 4,
  },
  {
    id: "sim-5",
    name: "Public Service Exploitation",
    description: "Simulates exploiting a vulnerable public-facing EC2 instance to pivot into internal network",
    type: "public_exploit",
    status: "idle",
    breachProbability: 27,
    financialImpact: 2200000,
    breachPath: ["Internet", "Vulnerable EC2", "VPC Pivot", "Internal Services", "Database"],
    lastRun: null,
    attackSteps: 5,
    criticalAssets: 5,
  },
];

const typeColors: Record<string, string> = {
  credential_theft: "text-orange-500 bg-orange-500/10",
  privilege_escalation: "text-red-500 bg-red-500/10",
  ransomware: "text-destructive bg-destructive/10",
  data_exfiltration: "text-purple-500 bg-purple-500/10",
  public_exploit: "text-yellow-500 bg-yellow-500/10",
};

const typeLabels: Record<string, string> = {
  credential_theft: "Credential Theft",
  privilege_escalation: "Privilege Escalation",
  ransomware: "Ransomware",
  data_exfiltration: "Data Exfiltration",
  public_exploit: "Public Exploit",
};

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export default function BreachSimulation() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scenarios, setScenarios] = useState(SCENARIOS);
  const [selected, setSelected] = useState<SimulationScenario>(SCENARIOS[0]);

  const runSimulation = (id: string) => {
    setScenarios(prev =>
      prev.map(s => (s.id === id ? { ...s, status: "running" as const } : s))
    );
    toast.info("Simulation started...");
    setTimeout(() => {
      setScenarios(prev =>
        prev.map(s =>
          s.id === id ? { ...s, status: "completed" as const, lastRun: "Just now" } : s
        )
      );
      toast.success("Simulation completed");
    }, 3000);
  };

  const avgProbability = Math.round(scenarios.reduce((a, s) => a + s.breachProbability, 0) / scenarios.length);
  const totalRisk = scenarios.reduce((a, s) => a + s.financialImpact, 0);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} lastScanTime="" onRefresh={() => {}} />
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="md:ml-64 pt-16">
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Crosshair className="h-6 w-6 text-destructive" />
              Continuous Breach Simulation
            </h1>
            <p className="text-muted-foreground">AI-powered red team simulating real attack scenarios against your infrastructure</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Target className="h-5 w-5 mx-auto mb-1 text-destructive" />
                <p className="text-2xl font-bold">{scenarios.length}</p>
                <p className="text-xs text-muted-foreground">Attack Scenarios</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-5 w-5 mx-auto mb-1 text-orange-500" />
                <p className="text-2xl font-bold">{avgProbability}%</p>
                <p className="text-xs text-muted-foreground">Avg Breach Probability</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <IndianRupee className="h-5 w-5 mx-auto mb-1 text-destructive" />
                <p className="text-2xl font-bold">{formatINR(totalRisk)}</p>
                <p className="text-xs text-muted-foreground">Total Risk Exposure</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Shield className="h-5 w-5 mx-auto mb-1 text-green-500" />
                <p className="text-2xl font-bold text-green-500">{formatINR(680000)}</p>
                <p className="text-xs text-muted-foreground">Risk Prevented This Month</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Scenario List */}
            <div className="space-y-3">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Scenarios</h2>
              {scenarios.map(s => (
                <Card
                  key={s.id}
                  className={`cursor-pointer transition-all hover:border-primary/40 ${selected.id === s.id ? "border-primary ring-1 ring-primary/20" : ""}`}
                  onClick={() => setSelected(s)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{s.name}</p>
                        <Badge variant="outline" className={`mt-1 text-xs ${typeColors[s.type]}`}>
                          {typeLabels[s.type]}
                        </Badge>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-destructive">{s.breachProbability}%</p>
                        <p className="text-[10px] text-muted-foreground">breach prob.</p>
                      </div>
                    </div>
                    {s.lastRun && (
                      <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Last run: {s.lastRun}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Detail Panel */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{selected.name}</CardTitle>
                    <Button
                      size="sm"
                      variant={selected.status === "running" ? "secondary" : "default"}
                      disabled={selected.status === "running"}
                      onClick={() => runSimulation(selected.id)}
                    >
                      {selected.status === "running" ? (
                        <><Zap className="h-4 w-4 mr-1 animate-pulse" /> Running...</>
                      ) : (
                        <><Play className="h-4 w-4 mr-1" /> Run Simulation</>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{selected.description}</p>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold text-destructive">{selected.breachProbability}%</p>
                      <p className="text-xs text-muted-foreground">Breach Probability</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold">{formatINR(selected.financialImpact)}</p>
                      <p className="text-xs text-muted-foreground">Financial Impact</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold">{selected.criticalAssets}</p>
                      <p className="text-xs text-muted-foreground">Critical Assets at Risk</p>
                    </div>
                  </div>

                  {/* Breach Path */}
                  <div>
                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      Most Likely Breach Path
                    </h3>
                    <div className="flex flex-col items-center gap-1">
                      {selected.breachPath.map((step, i) => (
                        <div key={i} className="flex flex-col items-center">
                          <div className={`px-4 py-2 rounded-lg text-sm font-medium border w-full max-w-xs text-center ${
                            i === 0 ? "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400" :
                            i === selected.breachPath.length - 1 ? "bg-destructive/10 border-destructive/30 text-destructive" :
                            "bg-muted border-border"
                          }`}>
                            {step}
                          </div>
                          {i < selected.breachPath.length - 1 && (
                            <ArrowDown className="h-4 w-4 text-muted-foreground my-1" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Probability bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Attack Success Likelihood</span>
                      <span className="font-semibold text-destructive">{selected.breachProbability}%</span>
                    </div>
                    <Progress value={selected.breachProbability} className="h-3" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
