import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Shield,
  Lock,
  HardDrive,
  Eye,
  Key,
  RefreshCw,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Settings,
} from "lucide-react";

interface AutopilotPolicy {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  category: "storage" | "identity" | "encryption" | "monitoring" | "backup";
  remediationCount: number;
  lastTriggered: string | null;
}

const DEFAULT_POLICIES: AutopilotPolicy[] = [
  {
    id: "no-public-storage",
    name: "No Public Storage",
    description: "Automatically block public access on S3 buckets, Azure Blob containers, and GCS buckets",
    icon: <HardDrive className="h-5 w-5" />,
    enabled: false,
    category: "storage",
    remediationCount: 0,
    lastTriggered: null,
  },
  {
    id: "admin-mfa-required",
    name: "Admin MFA Required",
    description: "Enforce multi-factor authentication for all admin and root accounts",
    icon: <Key className="h-5 w-5" />,
    enabled: false,
    category: "identity",
    remediationCount: 0,
    lastTriggered: null,
  },
  {
    id: "encryption-required",
    name: "Encryption Required",
    description: "Enable encryption at rest for all databases, storage, and EBS volumes",
    icon: <Lock className="h-5 w-5" />,
    enabled: false,
    category: "encryption",
    remediationCount: 0,
    lastTriggered: null,
  },
  {
    id: "backups-required",
    name: "Backups Required",
    description: "Ensure automated backups are enabled for all databases and critical storage",
    icon: <RefreshCw className="h-5 w-5" />,
    enabled: false,
    category: "backup",
    remediationCount: 0,
    lastTriggered: null,
  },
  {
    id: "logging-required",
    name: "Logging Required",
    description: "Enable CloudTrail, Azure Monitor, and GCP Audit Logs across all accounts",
    icon: <Eye className="h-5 w-5" />,
    enabled: false,
    category: "monitoring",
    remediationCount: 0,
    lastTriggered: null,
  },
  {
    id: "rotate-exposed-creds",
    name: "Auto-Rotate Exposed Credentials",
    description: "Automatically rotate access keys and secrets that are detected as exposed or stale",
    icon: <Shield className="h-5 w-5" />,
    enabled: false,
    category: "identity",
    remediationCount: 0,
    lastTriggered: null,
  },
];

export default function AutopilotPolicies() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [policies, setPolicies] = useState<AutopilotPolicy[]>(DEFAULT_POLICIES);
  const [autopilotMode, setAutopilotMode] = useState(false);

  const togglePolicy = (id: string) => {
    setPolicies(prev =>
      prev.map(p => {
        if (p.id === id) {
          const newEnabled = !p.enabled;
          toast.success(`${p.name} ${newEnabled ? "enabled" : "disabled"}`);
          return { ...p, enabled: newEnabled };
        }
        return p;
      })
    );
  };

  const toggleAutopilot = () => {
    const newState = !autopilotMode;
    setAutopilotMode(newState);
    if (newState) {
      setPolicies(prev => prev.map(p => ({ ...p, enabled: true })));
      toast.success("Autopilot Mode activated — all policies enabled");
    } else {
      setPolicies(prev => prev.map(p => ({ ...p, enabled: false })));
      toast.info("Autopilot Mode deactivated");
    }
  };

  const enabledCount = policies.filter(p => p.enabled).length;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} lastScanTime="" />
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="md:ml-64 pt-16">
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Zap className="h-6 w-6 text-primary" />
                Security Autopilot
              </h1>
              <p className="text-muted-foreground">
                Configure autonomous security policies that automatically fix violations
              </p>
            </div>
          </div>

          {/* Autopilot Master Toggle */}
          <Card className={`border-2 transition-colors ${autopilotMode ? "border-primary bg-primary/5" : ""}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                    autopilotMode ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}>
                    <Zap className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Full Autopilot Mode</h2>
                    <p className="text-sm text-muted-foreground">
                      Enable all security policies and let the system auto-remediate violations
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={autopilotMode ? "default" : "secondary"}>
                    {autopilotMode ? "Active" : "Off"}
                  </Badge>
                  <Switch checked={autopilotMode} onCheckedChange={toggleAutopilot} />
                </div>
              </div>
              {autopilotMode && (
                <div className="mt-4 p-3 rounded-lg bg-primary/10 text-sm flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <p>
                    Autopilot requires <strong>write access</strong> to your cloud accounts. 
                    Make sure write access is enabled in your account settings before violations can be auto-remediated.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{enabledCount}</p>
                <p className="text-xs text-muted-foreground">Active Policies</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{policies.length}</p>
                <p className="text-xs text-muted-foreground">Total Policies</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">Auto-Fixes Today</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-500">₹0</p>
                <p className="text-xs text-muted-foreground">Risk Prevented</p>
              </CardContent>
            </Card>
          </div>

          {/* Policy Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {policies.map((policy) => (
              <Card key={policy.id} className={`transition-all ${policy.enabled ? "border-primary/30 bg-primary/5" : ""}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                        policy.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}>
                        {policy.icon}
                      </div>
                      <div>
                        <h3 className="font-medium flex items-center gap-2">
                          {policy.name}
                          {policy.enabled && <CheckCircle2 className="h-4 w-4 text-primary" />}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">{policy.description}</p>
                        {policy.lastTriggered && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Last triggered: {policy.lastTriggered}
                          </p>
                        )}
                      </div>
                    </div>
                    <Switch checked={policy.enabled} onCheckedChange={() => togglePolicy(policy.id)} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
