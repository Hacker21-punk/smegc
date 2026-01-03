import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { RiskScoreCard } from "@/components/dashboard/RiskScoreCard";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { RiskTrendChart } from "@/components/dashboard/RiskTrendChart";
import { ServiceBreakdownChart } from "@/components/dashboard/ServiceBreakdownChart";
import { SecurityFindingsTable, SecurityFinding } from "@/components/dashboard/SecurityFindingsTable";
import { AlertsCard } from "@/components/dashboard/AlertsCard";
import { AWSAccountsCard } from "@/components/dashboard/AWSAccountsCard";
import { toast } from "sonner";

// Mock data
const mockTrendData = [
  { date: "Dec 4", score: 72 },
  { date: "Dec 7", score: 68 },
  { date: "Dec 10", score: 65 },
  { date: "Dec 13", score: 58 },
  { date: "Dec 16", score: 62 },
  { date: "Dec 19", score: 55 },
  { date: "Dec 22", score: 48 },
  { date: "Dec 25", score: 52 },
  { date: "Dec 28", score: 45 },
  { date: "Jan 1", score: 42 },
];

const mockServiceData = [
  { name: "S3", findings: 8, color: "hsl(217, 91%, 60%)" },
  { name: "IAM", findings: 12, color: "hsl(0, 84%, 60%)" },
  { name: "EC2", findings: 5, color: "hsl(38, 92%, 50%)" },
  { name: "Security Groups", findings: 7, color: "hsl(142, 76%, 36%)" },
  { name: "RDS", findings: 3, color: "hsl(199, 89%, 48%)" },
];

const mockFindings: SecurityFinding[] = [
  {
    id: "1",
    resource: "production-data-bucket",
    resourceType: "S3 Bucket",
    issue: "Bucket is publicly accessible with no encryption at rest",
    severity: "critical",
    awsAccount: "Production (123456789)",
    detectedAt: "2 hours ago",
    status: "open",
  },
  {
    id: "2",
    resource: "admin-user",
    resourceType: "IAM User",
    issue: "Access key unused for 90+ days",
    severity: "high",
    awsAccount: "Production (123456789)",
    detectedAt: "1 day ago",
    status: "open",
  },
  {
    id: "3",
    resource: "sg-0a1b2c3d4e5f",
    resourceType: "Security Group",
    issue: "Inbound rule allows 0.0.0.0/0 on port 22 (SSH)",
    severity: "high",
    awsAccount: "Staging (987654321)",
    detectedAt: "3 days ago",
    status: "open",
  },
  {
    id: "4",
    resource: "db-instance-prod",
    resourceType: "RDS Instance",
    issue: "Database instance is publicly accessible",
    severity: "critical",
    awsAccount: "Production (123456789)",
    detectedAt: "5 hours ago",
    status: "open",
  },
  {
    id: "5",
    resource: "root-account",
    resourceType: "AWS Account",
    issue: "Root account used for login in last 24 hours",
    severity: "medium",
    awsAccount: "Production (123456789)",
    detectedAt: "12 hours ago",
    status: "open",
  },
];

const mockAlerts = [
  {
    id: "1",
    title: "Critical: Public S3 Bucket Detected",
    description: "production-data-bucket is publicly accessible",
    severity: "critical" as const,
    timestamp: "2 hours ago",
    type: "security" as const,
  },
  {
    id: "2",
    title: "Cost Anomaly: Unusual EC2 Usage",
    description: "₹12,500 increase in EC2 costs detected",
    severity: "medium" as const,
    timestamp: "6 hours ago",
    type: "cost" as const,
  },
  {
    id: "3",
    title: "High: Root Account Login",
    description: "Root account login from new IP address",
    severity: "high" as const,
    timestamp: "12 hours ago",
    type: "security" as const,
  },
];

const mockAccounts = [
  {
    id: "1",
    name: "Production",
    accountId: "123456789012",
    status: "connected" as const,
    lastScan: "2 hours ago",
    riskScore: 42,
  },
  {
    id: "2",
    name: "Staging",
    accountId: "987654321098",
    status: "connected" as const,
    lastScan: "2 hours ago",
    riskScore: 28,
  },
  {
    id: "3",
    name: "Development",
    accountId: "567890123456",
    status: "syncing" as const,
    lastScan: "Syncing...",
    riskScore: 55,
  },
];

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleRefresh = () => {
    toast.info("Starting security scan...", {
      description: "This may take a few minutes.",
    });
  };

  const handleGenerateRemediation = (id: string) => {
    toast.success("CloudFormation template generated!", {
      description: "Download ready. Template will not auto-apply changes.",
    });
  };

  const handleAddAccount = () => {
    toast.info("Add AWS Account", {
      description: "IAM role setup wizard would open here.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        lastScanTime="2 hours ago" 
        onRefresh={handleRefresh}
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className="md:ml-64 p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Security Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your AWS infrastructure security across all connected accounts.
          </p>
        </div>

        <div className="space-y-6">
          {/* Risk Score Cards */}
          <div className="grid gap-6 md:grid-cols-3">
            <RiskScoreCard 
              score={42} 
              previousScore={48} 
              accountName="Overall Risk Score" 
            />
            <AWSAccountsCard 
              accounts={mockAccounts} 
              onAddAccount={handleAddAccount}
            />
            <AlertsCard alerts={mockAlerts} />
          </div>

          {/* Stats Grid */}
          <StatsGrid
            totalFindings={35}
            criticalFindings={4}
            resourcesScanned={1247}
            complianceScore={78}
            estimatedCostAnomaly={12500}
          />

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <RiskTrendChart data={mockTrendData} />
            <ServiceBreakdownChart data={mockServiceData} />
          </div>

          {/* Findings Table */}
          <SecurityFindingsTable 
            findings={mockFindings} 
            onGenerateRemediation={handleGenerateRemediation}
          />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
