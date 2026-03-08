import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SecurityCopilot } from "@/components/dashboard/SecurityCopilot";
import { BreachCostWidget } from "@/components/dashboard/BreachCostWidget";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { RiskScoreCard } from "@/components/dashboard/RiskScoreCard";
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
  Lock
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
      // Fetch AWS accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from("aws_accounts")
        .select("*")
        .order("created_at", { ascending: false });

      if (accountsError) throw accountsError;

      // Fetch active security findings
      const { data: findingsData, error: findingsError } = await supabase
        .from("security_findings")
        .select("id, severity, is_resolved, created_at")
        .eq("is_resolved", false);

      if (findingsError) throw findingsError;

      // Fetch resolved findings count
      const { count: resolvedCount, error: resolvedError } = await supabase
        .from("security_findings")
        .select("*", { count: "exact", head: true })
        .eq("is_resolved", true);

      if (resolvedError) throw resolvedError;

      // Get last scan time
      const { data: lastScan, error: scanError } = await supabase
        .from("scan_jobs")
        .select("completed_at")
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Calculate aggregated data
      const accounts = (accountsData || []).map((acc) => ({
        id: acc.id,
        name: acc.account_alias || `Account ${acc.account_id.slice(-4)}`,
        accountId: acc.account_id,
        status: acc.status as "connected" | "syncing" | "pending" | "error",
        lastScan: acc.last_scan_at
          ? format(new Date(acc.last_scan_at), "MMM d, h:mm a")
          : "Never",
        riskScore: acc.risk_score || 0,
      }));

      const totalFindings = findingsData?.length || 0;
      const criticalFindings = findingsData?.filter((f) => f.severity === "critical").length || 0;
      const highFindings = findingsData?.filter((f) => f.severity === "high").length || 0;

      const overallRiskScore =
        accounts.length > 0
          ? Math.round(accounts.reduce((sum, acc) => sum + acc.riskScore, 0) / accounts.length)
          : 0;

      setData({
        accounts,
        stats: {
          totalFindings,
          criticalFindings,
          highFindings,
          resolvedFindings: resolvedCount || 0,
          complianceScore: Math.max(0, 100 - overallRiskScore),
          overallRiskScore,
          previousRiskScore: overallRiskScore, // Simplified
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
    totalFindings: 0,
    criticalFindings: 0,
    highFindings: 0,
    resolvedFindings: 0,
    complianceScore: 100,
    overallRiskScore: 0,
    previousRiskScore: 0,
    lastScanTime: null,
  };

  const accounts = data?.accounts || [];
  const lastScanDisplay = stats.lastScanTime 
    ? format(new Date(stats.lastScanTime), "MMM d, h:mm a")
    : "Never";

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        lastScanTime={lastScanDisplay} 
        onRefresh={handleRefresh}
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className="md:ml-64 p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Security Dashboard</h1>
          <p className="text-muted-foreground">
            {accounts.length > 0 
              ? `Monitoring ${accounts.length} AWS account${accounts.length > 1 ? "s" : ""} for security issues.`
              : "Connect your first AWS account to start monitoring."}
          </p>
        </div>

        {/* Trust Banner */}
        <div className="mb-6 p-4 rounded-lg bg-success/5 border border-success/10 flex items-center gap-3">
          <Lock className="h-5 w-5 text-success" />
          <div className="flex-1">
            <p className="text-sm font-medium text-success">Read-Only Security Monitoring</p>
            <p className="text-xs text-muted-foreground">We never modify your AWS resources. You stay in control.</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
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
            {/* High-Value Metrics Only */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* Overall Risk Score */}
              <Card className="relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${
                  stats.overallRiskScore >= 70 ? 'bg-critical' : 
                  stats.overallRiskScore >= 40 ? 'bg-warning' : 'bg-success'
                }`} />
                <CardContent className="pt-6">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-help">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-muted-foreground">Overall Risk Score</p>
                          <Shield className={`h-5 w-5 ${
                            stats.overallRiskScore >= 70 ? 'text-critical' : 
                            stats.overallRiskScore >= 40 ? 'text-warning' : 'text-success'
                          }`} />
                        </div>
                        <p className="text-3xl font-bold">{stats.overallRiskScore}/100</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {stats.overallRiskScore >= 70 ? 'High risk - needs attention' : 
                           stats.overallRiskScore >= 40 ? 'Moderate risk' : 'Low risk - good posture'}
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Combined risk score across all your AWS accounts. Lower is better.</p>
                    </TooltipContent>
                  </Tooltip>
                </CardContent>
              </Card>

              {/* Active Findings */}
              <Card className="relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${stats.totalFindings > 0 ? 'bg-warning' : 'bg-success'}`} />
                <CardContent className="pt-6">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className="cursor-pointer hover:bg-muted/50 -m-6 p-6 transition-colors"
                        onClick={() => navigate("/dashboard/findings")}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-muted-foreground">Active Findings</p>
                          <XCircle className={`h-5 w-5 ${stats.totalFindings > 0 ? 'text-warning' : 'text-success'}`} />
                        </div>
                        <p className="text-3xl font-bold">{stats.totalFindings}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {stats.totalFindings > 0 ? 'Issues needing review' : 'No open issues'}
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Security issues found in your AWS accounts that haven't been resolved yet.</p>
                    </TooltipContent>
                  </Tooltip>
                </CardContent>
              </Card>

              {/* Critical (P0) Findings */}
              <Card className="relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${stats.criticalFindings > 0 ? 'bg-critical' : 'bg-success'}`} />
                <CardContent className="pt-6">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className="cursor-pointer hover:bg-muted/50 -m-6 p-6 transition-colors"
                        onClick={() => navigate("/dashboard/findings")}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-muted-foreground">Critical (P0)</p>
                          <AlertTriangle className={`h-5 w-5 ${stats.criticalFindings > 0 ? 'text-critical' : 'text-success'}`} />
                        </div>
                        <p className="text-3xl font-bold">{stats.criticalFindings}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {stats.criticalFindings > 0 ? 'Urgent - fix immediately' : 'No critical issues'}
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Critical issues that could allow unauthorized access to your systems.</p>
                    </TooltipContent>
                  </Tooltip>
                </CardContent>
              </Card>

              {/* Compliance Coverage */}
              <Card className="relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${
                  stats.complianceScore >= 80 ? 'bg-success' : 
                  stats.complianceScore >= 50 ? 'bg-warning' : 'bg-critical'
                }`} />
                <CardContent className="pt-6">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className="cursor-pointer hover:bg-muted/50 -m-6 p-6 transition-colors"
                        onClick={() => navigate("/dashboard/reports")}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-muted-foreground">Compliance Coverage</p>
                          <FileCheck className={`h-5 w-5 ${
                            stats.complianceScore >= 80 ? 'text-success' : 
                            stats.complianceScore >= 50 ? 'text-warning' : 'text-critical'
                          }`} />
                        </div>
                        <p className="text-3xl font-bold">{stats.complianceScore}%</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {stats.complianceScore >= 80 ? 'Good coverage' : 
                           stats.complianceScore >= 50 ? 'Needs improvement' : 'Low coverage'}
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">How well your security posture aligns with compliance frameworks.</p>
                    </TooltipContent>
                  </Tooltip>
                </CardContent>
              </Card>
            </div>

            {/* Last Scan Info */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Last Security Scan</p>
                      <p className="text-xs text-muted-foreground">{lastScanDisplay}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {stats.resolvedFindings > 0 && (
                      <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {stats.resolvedFindings} Fixed
                      </Badge>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate("/dashboard/findings")}
                    >
                      View All Findings
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            {accounts.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Get Started</h3>
                  <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                    Connect your AWS account to start monitoring for security issues. 
                    We use read-only access and never modify your resources.
                  </p>
                  <Button onClick={() => navigate("/dashboard/accounts")}>
                    Connect AWS Account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Summary for accounts with findings */}
            {accounts.length > 0 && stats.totalFindings > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    Recommended Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.criticalFindings > 0 && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-critical/5 border border-critical/10">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-5 w-5 text-critical" />
                          <div>
                            <p className="font-medium text-critical">
                              {stats.criticalFindings} critical issue{stats.criticalFindings > 1 ? 's' : ''} need immediate attention
                            </p>
                            <p className="text-xs text-muted-foreground">
                              These could allow unauthorized access to your business systems
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => navigate("/dashboard/findings")}
                        >
                          Review Now
                        </Button>
                      </div>
                    )}
                    {stats.highFindings > 0 && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/10">
                        <div className="flex items-center gap-3">
                          <Shield className="h-5 w-5 text-warning" />
                          <div>
                            <p className="font-medium text-warning">
                              {stats.highFindings} high-priority issue{stats.highFindings > 1 ? 's' : ''} should be addressed soon
                            </p>
                            <p className="text-xs text-muted-foreground">
                              May expose sensitive data if not addressed
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate("/dashboard/findings")}
                        >
                          View Details
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* All secure message */}
            {accounts.length > 0 && stats.totalFindings === 0 && (
              <Card className="bg-success/5 border-success/20">
                <CardContent className="py-8 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-success mb-4" />
                  <h3 className="text-lg font-semibold text-success mb-2">All Clear!</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    No security issues detected across your AWS accounts. 
                    We'll continue monitoring and alert you if anything changes.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
