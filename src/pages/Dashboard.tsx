import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { RiskScoreCard } from "@/components/dashboard/RiskScoreCard";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { RiskTrendChart } from "@/components/dashboard/RiskTrendChart";
import { ServiceBreakdownChart } from "@/components/dashboard/ServiceBreakdownChart";
import { SecurityFindingsTable, SecurityFinding } from "@/components/dashboard/SecurityFindingsTable";
import { AlertsCard } from "@/components/dashboard/AlertsCard";
import { AWSAccountsCard } from "@/components/dashboard/AWSAccountsCard";
import { RiskScoreBreakdown } from "@/components/dashboard/RiskScoreBreakdown";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { format, subDays } from "date-fns";

interface DashboardData {
  accounts: {
    id: string;
    name: string;
    accountId: string;
    status: "connected" | "syncing" | "pending" | "error";
    lastScan: string;
    riskScore: number;
  }[];
  findings: SecurityFinding[];
  alerts: {
    id: string;
    title: string;
    description: string;
    severity: "critical" | "high" | "medium" | "low";
    timestamp: string;
    type: "security" | "cost" | "compliance";
  }[];
  trendData: { date: string; score: number }[];
  serviceData: { name: string; findings: number; color: string }[];
  stats: {
    totalFindings: number;
    criticalFindings: number;
    highFindings: number;
    mediumFindings: number;
    lowFindings: number;
    resourcesScanned: number;
    complianceScore: number;
    overallRiskScore: number;
    previousRiskScore: number;
  };
  topIssues: Array<{ title: string; severity: string; resource_id: string }>;
}

const serviceColors: Record<string, string> = {
  security_groups: "hsl(142, 76%, 36%)",
  iam: "hsl(0, 84%, 60%)",
  s3: "hsl(217, 91%, 60%)",
  ec2: "hsl(38, 92%, 50%)",
  rds: "hsl(199, 89%, 48%)",
  vpc: "hsl(271, 91%, 65%)",
  cost: "hsl(25, 95%, 53%)",
};

const serviceNames: Record<string, string> = {
  security_groups: "Security Groups",
  iam: "IAM",
  s3: "S3",
  ec2: "EC2",
  rds: "RDS",
  vpc: "VPC",
  cost: "Cost",
};

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

      // Fetch security findings with full details (unresolved only)
      const { data: findingsData, error: findingsError } = await supabase
        .from("security_findings")
        .select("*, aws_accounts(account_id, account_alias)")
        .eq("is_resolved", false)
        .order("created_at", { ascending: false })
        .limit(100);

      if (findingsError) throw findingsError;

      // Fetch risk score history for trend
      const { data: historyData, error: historyError } = await supabase
        .from("risk_score_history")
        .select("*")
        .gte("recorded_at", format(subDays(new Date(), 30), "yyyy-MM-dd"))
        .order("recorded_at", { ascending: true });

      if (historyError) throw historyError;

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

      // Transform findings with full details for the dialog
      const findings: SecurityFinding[] = (findingsData || []).map((f) => ({
        id: f.id,
        resource: f.resource_id,
        resourceType: f.resource_type,
        issue: f.title,
        severity: f.severity as "critical" | "high" | "medium" | "low",
        awsAccount: (f.aws_accounts as any)?.account_alias || (f.aws_accounts as any)?.account_id || "Unknown",
        detectedAt: format(new Date(f.created_at), "MMM d, h:mm a"),
        status: f.is_resolved ? "remediated" : "open",
        // Extended fields
        description: f.description,
        remediation_steps: f.remediation_steps,
        cloudformation_template: f.cloudformation_template,
        service: f.service,
        is_resolved: f.is_resolved,
        created_at: f.created_at,
      }));

      // Create alerts from critical/high severity findings
      const alerts = (findingsData || [])
        .filter((f) => f.severity === "critical" || f.severity === "high")
        .slice(0, 5)
        .map((f) => ({
          id: f.id,
          title: `${f.severity === "critical" ? "Critical" : "High"}: ${f.title}`,
          description: f.description || f.resource_id,
          severity: f.severity as "critical" | "high",
          timestamp: format(new Date(f.created_at), "MMM d, h:mm a"),
          type: "security" as const,
        }));

      // Get top priority issues for risk breakdown
      const topIssues = (findingsData || [])
        .filter((f) => f.severity === "critical" || f.severity === "high")
        .slice(0, 5)
        .map((f) => ({
          title: f.title,
          severity: f.severity,
          resource_id: f.resource_id,
        }));

      // Calculate trend data (aggregate by date)
      const trendMap = new Map<string, number[]>();
      for (const h of historyData || []) {
        const date = format(new Date(h.recorded_at), "MMM d");
        if (!trendMap.has(date)) {
          trendMap.set(date, []);
        }
        trendMap.get(date)!.push(h.score);
      }
      const trendData = Array.from(trendMap.entries()).map(([date, scores]) => ({
        date,
        score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      }));

      // If no trend data, create default
      if (trendData.length === 0) {
        for (let i = 9; i >= 0; i--) {
          trendData.push({
            date: format(subDays(new Date(), i * 3), "MMM d"),
            score: 0,
          });
        }
      }

      // Calculate service breakdown
      const serviceCounts = new Map<string, number>();
      for (const f of findingsData || []) {
        const count = serviceCounts.get(f.service) || 0;
        serviceCounts.set(f.service, count + 1);
      }
      const serviceData = Array.from(serviceCounts.entries()).map(([service, count]) => ({
        name: serviceNames[service] || service,
        findings: count,
        color: serviceColors[service] || "hsl(200, 50%, 50%)",
      }));

      // Calculate stats with severity breakdown
      const totalFindings = findingsData?.length || 0;
      const criticalFindings = findingsData?.filter((f) => f.severity === "critical").length || 0;
      const highFindings = findingsData?.filter((f) => f.severity === "high").length || 0;
      const mediumFindings = findingsData?.filter((f) => f.severity === "medium").length || 0;
      const lowFindings = findingsData?.filter((f) => f.severity === "low").length || 0;
      
      const overallRiskScore =
        accounts.length > 0
          ? Math.round(accounts.reduce((sum, acc) => sum + acc.riskScore, 0) / accounts.length)
          : 0;
      const previousRiskScore = trendData.length >= 2 ? trendData[trendData.length - 2]?.score || 0 : overallRiskScore;

      setData({
        accounts,
        findings,
        alerts,
        trendData,
        serviceData,
        topIssues,
        stats: {
          totalFindings,
          criticalFindings,
          highFindings,
          mediumFindings,
          lowFindings,
          resourcesScanned: accounts.length * 500, // Estimate
          complianceScore: Math.max(0, 100 - overallRiskScore),
          overallRiskScore,
          previousRiskScore,
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
    toast.info("Refreshing dashboard data...");
    setLoading(true);
    await fetchDashboardData();
    toast.success("Dashboard updated");
  };

  const handleMarkResolved = async (findingId: string) => {
    try {
      const { error } = await supabase
        .from("security_findings")
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .eq("id", findingId);

      if (error) throw error;

      toast.success("Finding marked as resolved");
      await fetchDashboardData();
    } catch (error) {
      console.error("Error marking finding as resolved:", error);
      toast.error("Failed to update finding");
    }
  };

  const handleAddAccount = () => {
    navigate("/dashboard/accounts");
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  // Use data or defaults
  const accounts = data?.accounts || [];
  const findings = data?.findings || [];
  const alerts = data?.alerts || [];
  const trendData = data?.trendData || [];
  const serviceData = data?.serviceData || [];
  const topIssues = data?.topIssues || [];
  const stats = data?.stats || {
    totalFindings: 0,
    criticalFindings: 0,
    highFindings: 0,
    mediumFindings: 0,
    lowFindings: 0,
    resourcesScanned: 0,
    complianceScore: 100,
    overallRiskScore: 0,
    previousRiskScore: 0,
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        lastScanTime={accounts[0]?.lastScan || "Never"} 
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

        <div className="space-y-6">
          {/* Risk Score Cards */}
          <div className="grid gap-6 md:grid-cols-3">
            <RiskScoreCard 
              score={stats.overallRiskScore} 
              previousScore={stats.previousRiskScore} 
              accountName="Overall Risk Score" 
            />
            <AWSAccountsCard 
              accounts={accounts} 
              onAddAccount={handleAddAccount}
            />
            <AlertsCard alerts={alerts} />
          </div>

          {/* Stats Grid */}
          <StatsGrid
            totalFindings={stats.totalFindings}
            criticalFindings={stats.criticalFindings}
            resourcesScanned={stats.resourcesScanned}
            complianceScore={stats.complianceScore}
            estimatedCostAnomaly={0}
          />

          {/* Charts and Risk Breakdown */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RiskTrendChart data={trendData} />
            </div>
            <RiskScoreBreakdown
              score={stats.overallRiskScore}
              criticalCount={stats.criticalFindings}
              highCount={stats.highFindings}
              mediumCount={stats.mediumFindings}
              lowCount={stats.lowFindings}
              topIssues={topIssues}
            />
          </div>

          {/* Service Breakdown */}
          <ServiceBreakdownChart data={serviceData.length > 0 ? serviceData : [{ name: "No Data", findings: 0, color: "hsl(200, 10%, 50%)" }]} />

          {/* Findings Table */}
          {findings.length > 0 ? (
            <SecurityFindingsTable 
              findings={findings} 
              onGenerateRemediation={() => {}}
              onMarkResolved={handleMarkResolved}
            />
          ) : (
            <div className="text-center py-12 border rounded-lg">
              <p className="text-muted-foreground">
                {accounts.length > 0 
                  ? "No security findings detected. Your accounts look secure!"
                  : "Connect an AWS account to see security findings."}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;