import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SecurityCopilot } from "@/components/dashboard/SecurityCopilot";
import { BreachCostWidget } from "@/components/dashboard/BreachCostWidget";
import { UnifiedSecurityScore } from "@/components/dashboard/UnifiedSecurityScore";
import { AutopilotEnforcementPanel } from "@/components/dashboard/AutopilotEnforcementPanel";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Shield, 
  AlertTriangle, 
  Clock, 
  FileCheck, 
  ArrowRight,
  CheckCircle2,
  XCircle,
  Lock,
  Crosshair,
  Layers,
  Container,
  Fingerprint,
  Globe2,
  Activity,
  Route,
  Radar,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface DashboardData {
  accounts: {
    id: string;
    name: string;
    accountId: string;
    status: "connected" | "syncing" | "pending" | "error";
    lastScan: string;
    riskScore: number;
  }[];
  stats: {
    totalFindings: number;
    criticalFindings: number;
    highFindings: number;
    resolvedFindings: number;
    complianceScore: number;
    overallRiskScore: number;
    previousRiskScore: number;
    lastScanTime: string | null;
  };
}

const securityModules = [
  { icon: Route, label: "Attack Paths", href: "/dashboard/attack-paths", color: "text-critical", bg: "bg-critical/10", desc: "Breach chain analysis" },
  { icon: Crosshair, label: "Breach Sim", href: "/dashboard/simulations", color: "text-warning", bg: "bg-warning/10", desc: "AI red-team engine" },
  { icon: Layers, label: "Digital Twin", href: "/dashboard/digital-twin", color: "text-info", bg: "bg-info/10", desc: "Virtual cloud replica" },
  { icon: Container, label: "Kubernetes", href: "/dashboard/kubernetes", color: "text-primary", bg: "bg-primary/10", desc: "Container security" },
  { icon: Fingerprint, label: "Zero Trust", href: "/dashboard/zero-trust", color: "text-success", bg: "bg-success/10", desc: "Identity verification" },
  { icon: Globe2, label: "SaaS Security", href: "/dashboard/saas-security", color: "text-warning", bg: "bg-warning/10", desc: "App monitoring" },
  { icon: Activity, label: "Events", href: "/dashboard/events", color: "text-info", bg: "bg-info/10", desc: "Real-time stream" },
  { icon: Radar, label: "Threat Intel", href: "/dashboard/threats", color: "text-critical", bg: "bg-critical/10", desc: "Threat feeds" },
  { icon: Zap, label: "Autopilot", href: "/dashboard/autopilot", color: "text-primary", bg: "bg-primary/10", desc: "Policy enforcement" },
];

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: accountsData, error: accountsError } = await supabase
        .from("aws_accounts").select("*").order("created_at", { ascending: false });
      if (accountsError) throw accountsError;

      const { data: findingsData, error: findingsError } = await supabase
        .from("security_findings").select("id, severity, is_resolved, created_at").eq("is_resolved", false);
      if (findingsError) throw findingsError;

      const { count: resolvedCount, error: resolvedError } = await supabase
        .from("security_findings").select("*", { count: "exact", head: true }).eq("is_resolved", true);
      if (resolvedError) throw resolvedError;

      const { data: lastScan } = await supabase
        .from("scan_jobs").select("completed_at").eq("status", "completed")
        .order("completed_at", { ascending: false }).limit(1).maybeSingle();

      const accounts = (accountsData || []).map((acc) => ({
        id: acc.id,
        name: acc.account_alias || `Account ${acc.account_id.slice(-4)}`,
        accountId: acc.account_id,
        status: acc.status as "connected" | "syncing" | "pending" | "error",
        lastScan: acc.last_scan_at ? format(new Date(acc.last_scan_at), "MMM d, h:mm a") : "Never",
        riskScore: acc.risk_score || 0,
      }));

      const totalFindings = findingsData?.length || 0;
      const criticalFindings = findingsData?.filter((f) => f.severity === "critical").length || 0;
      const highFindings = findingsData?.filter((f) => f.severity === "high").length || 0;
      const overallRiskScore = accounts.length > 0
        ? Math.round(accounts.reduce((sum, acc) => sum + acc.riskScore, 0) / accounts.length) : 0;

      setData({
        accounts,
        stats: {
          totalFindings, criticalFindings, highFindings,
          resolvedFindings: resolvedCount || 0,
          complianceScore: Math.max(0, 100 - overallRiskScore),
          overallRiskScore, previousRiskScore: overallRiskScore,
          lastScanTime: lastScan?.completed_at || null,
        },
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    toast.info("Refreshing dashboard...");
    setLoading(true);
    await fetchDashboardData();
    toast.success("Dashboard updated");
  };

  const stats = data?.stats || {
    totalFindings: 0, criticalFindings: 0, highFindings: 0, resolvedFindings: 0,
    complianceScore: 100, overallRiskScore: 0, previousRiskScore: 0, lastScanTime: null,
  };
  const accounts = data?.accounts || [];
  const lastScanDisplay = stats.lastScanTime
    ? format(new Date(stats.lastScanTime), "MMM d, h:mm a") : "Never";

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader lastScanTime={lastScanDisplay} onRefresh={handleRefresh} onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className="md:ml-64 p-6 max-w-7xl">
        {/* Page Header */}
        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Security Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {accounts.length > 0
              ? `Monitoring ${accounts.length} AWS account${accounts.length > 1 ? "s" : ""} for security issues.`
              : "Connect your first AWS account to start monitoring."}
          </p>
        </div>

        {/* Trust Banner */}
        <div className="mb-6 p-3 rounded-xl bg-success/5 border border-success/10 flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
            <Lock className="h-4 w-4 text-success" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-success">Read-Only Security Monitoring</p>
            <p className="text-[11px] text-muted-foreground">We never modify your AWS resources. You stay in control.</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="pt-6">
                    <Skeleton className="h-4 w-24 mb-3" />
                    <Skeleton className="h-8 w-16 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Unified Security Score */}
            <UnifiedSecurityScore
              securityScore={stats.overallRiskScore}
              totalFindings={stats.totalFindings}
              criticalFindings={stats.criticalFindings}
              highFindings={stats.highFindings}
              accountCount={accounts.length}
              complianceScore={stats.complianceScore}
            />

            {/* Metrics Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Risk Score */}
              <MetricCard
                index={0}
                label="Overall Risk Score"
                value={`${stats.overallRiskScore}/100`}
                description={stats.overallRiskScore >= 70 ? 'High risk — needs attention' : stats.overallRiskScore >= 40 ? 'Moderate risk' : 'Low risk — good posture'}
                icon={Shield}
                accentColor={stats.overallRiskScore >= 70 ? 'critical' : stats.overallRiskScore >= 40 ? 'warning' : 'success'}
                tooltip="Combined risk score across all your AWS accounts. Lower is better."
              />

              {/* Active Findings */}
              <MetricCard
                index={1}
                label="Active Findings"
                value={stats.totalFindings.toString()}
                description={stats.totalFindings > 0 ? 'Issues needing review' : 'No open issues'}
                icon={XCircle}
                accentColor={stats.totalFindings > 0 ? 'warning' : 'success'}
                tooltip="Security issues found that haven't been resolved yet."
                onClick={() => navigate("/dashboard/findings")}
              />

              {/* Critical */}
              <MetricCard
                index={2}
                label="Critical (P0)"
                value={stats.criticalFindings.toString()}
                description={stats.criticalFindings > 0 ? 'Urgent — fix immediately' : 'No critical issues'}
                icon={AlertTriangle}
                accentColor={stats.criticalFindings > 0 ? 'critical' : 'success'}
                tooltip="Critical issues that could allow unauthorized access."
                onClick={() => navigate("/dashboard/findings")}
              />

              {/* Compliance */}
              <MetricCard
                index={3}
                label="Compliance"
                value={`${stats.complianceScore}%`}
                description={stats.complianceScore >= 80 ? 'Good coverage' : stats.complianceScore >= 50 ? 'Needs improvement' : 'Low coverage'}
                icon={FileCheck}
                accentColor={stats.complianceScore >= 80 ? 'success' : stats.complianceScore >= 50 ? 'warning' : 'critical'}
                tooltip="How well your security aligns with compliance frameworks."
                onClick={() => navigate("/dashboard/reports")}
              />
            </div>

            {/* Last Scan */}
            <Card className="animate-fade-in-up overflow-hidden" style={{ animationDelay: "0.3s" }}>
              <CardContent className="py-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Last Security Scan</p>
                      <p className="text-xs text-muted-foreground">{lastScanDisplay}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {stats.resolvedFindings > 0 && (
                      <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {stats.resolvedFindings} Fixed
                      </Badge>
                    )}
                    <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/findings")} className="text-xs gap-1.5">
                      View Findings <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Modules Grid */}
            <div className="animate-fade-in-up" style={{ animationDelay: "0.35s" }}>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Security Modules</h2>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {securityModules.map((mod, i) => {
                  const Icon = mod.icon;
                  return (
                    <Link key={mod.href} to={mod.href}>
                      <Card className={cn(
                        "card-premium group cursor-pointer border hover:border-primary/20 transition-all duration-300",
                        "animate-fade-in-up"
                      )} style={{ animationDelay: `${0.35 + i * 0.04}s` }}>
                        <CardContent className="p-4 flex flex-col items-center text-center gap-2.5">
                          <div className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                            mod.bg, mod.color
                          )}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold group-hover:text-primary transition-colors">{mod.label}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{mod.desc}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Empty State */}
            {accounts.length === 0 && (
              <Card className="border-dashed animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
                <CardContent className="py-12 text-center">
                  <div className="relative inline-flex mb-6">
                    <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Shield className="h-8 w-8 text-primary" />
                    </div>
                    <div className="absolute -inset-2 bg-primary/5 rounded-3xl animate-pulse" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Get Started</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm">
                    Connect your AWS account to start monitoring for security issues.
                    We use read-only access and never modify your resources.
                  </p>
                  <Button onClick={() => navigate("/dashboard/accounts")} className="gap-2 group">
                    Connect AWS Account
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Recommended Actions */}
            {accounts.length > 0 && stats.totalFindings > 0 && (
              <Card className="animate-fade-in-up" style={{ animationDelay: "0.45s" }}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    Recommended Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {stats.criticalFindings > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-critical/5 border border-critical/10 hover:bg-critical/8 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-critical/10 flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="h-4 w-4 text-critical" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-critical">
                            {stats.criticalFindings} critical issue{stats.criticalFindings > 1 ? 's' : ''} need immediate attention
                          </p>
                          <p className="text-xs text-muted-foreground">Could allow unauthorized access to your systems</p>
                        </div>
                      </div>
                      <Button variant="destructive" size="sm" onClick={() => navigate("/dashboard/findings")} className="text-xs flex-shrink-0">
                        Review Now
                      </Button>
                    </div>
                  )}
                  {stats.highFindings > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-warning/5 border border-warning/10 hover:bg-warning/8 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                          <Shield className="h-4 w-4 text-warning" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-warning">
                            {stats.highFindings} high-priority issue{stats.highFindings > 1 ? 's' : ''} should be addressed soon
                          </p>
                          <p className="text-xs text-muted-foreground">May expose sensitive data if not addressed</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/findings")} className="text-xs flex-shrink-0">
                        View Details
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* All Clear */}
            {accounts.length > 0 && stats.totalFindings === 0 && (
              <Card className="bg-success/5 border-success/20 animate-fade-in-up" style={{ animationDelay: "0.45s" }}>
                <CardContent className="py-8 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-success mb-4" />
                  <h3 className="text-lg font-semibold text-success mb-2">All Clear!</h3>
                  <p className="text-muted-foreground max-w-md mx-auto text-sm">
                    No security issues detected. We'll continue monitoring and alert you if anything changes.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Breach Cost */}
            {accounts.length > 0 && (
              <div className="animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
                <BreachCostWidget
                  securityScore={stats.complianceScore}
                  totalFindings={stats.totalFindings}
                  criticalFindings={stats.criticalFindings}
                />
              </div>
            )}
          </div>
        )}

        <SecurityCopilot context={{
          securityScore: stats.complianceScore,
          totalFindings: stats.totalFindings,
          criticalFindings: stats.criticalFindings,
          accountCount: accounts.length,
        }} />
      </main>
    </div>
  );
};

// ── Metric Card Component ──
interface MetricCardProps {
  index: number;
  label: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: 'success' | 'warning' | 'critical' | 'info' | 'primary';
  tooltip: string;
  onClick?: () => void;
}

function MetricCard({ index, label, value, description, icon: Icon, accentColor, tooltip, onClick }: MetricCardProps) {
  const colorMap = {
    success: { bar: 'bg-success', icon: 'text-success', bg: 'bg-success/10' },
    warning: { bar: 'bg-warning', icon: 'text-warning', bg: 'bg-warning/10' },
    critical: { bar: 'bg-critical', icon: 'text-critical', bg: 'bg-critical/10' },
    info: { bar: 'bg-info', icon: 'text-info', bg: 'bg-info/10' },
    primary: { bar: 'bg-primary', icon: 'text-primary', bg: 'bg-primary/10' },
  };
  const colors = colorMap[accentColor];

  return (
    <Card
      className={cn(
        "relative overflow-hidden card-interactive animate-fade-in-up",
        onClick && "cursor-pointer"
      )}
      style={{ animationDelay: `${0.15 + index * 0.05}s` }}
      onClick={onClick}
    >
      {/* Top accent line */}
      <div className={cn("absolute top-0 left-0 right-0 h-0.5", colors.bar)} />
      
      <CardContent className="pt-5 pb-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", colors.bg)}>
                  <Icon className={cn("h-4 w-4", colors.icon)} />
                </div>
              </div>
              <p className="text-2xl font-bold tabular-nums tracking-tight">{value}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{description}</p>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs text-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </CardContent>
    </Card>
  );
}

export default Dashboard;