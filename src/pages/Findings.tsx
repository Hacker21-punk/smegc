import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  AlertTriangle, 
  Shield, 
  Info, 
  Search, 
  FileDown,
  CheckCircle2,
  XCircle,
  Clock
} from "lucide-react";
import { FindingDetailsDialog, FindingDetails } from "@/components/dashboard/FindingDetailsDialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Finding {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  service: string;
  resource_id: string;
  resource_type: string;
  risk_score: number;
  is_resolved: boolean | null;
  created_at: string;
  description: string | null;
  remediation_steps: string[] | null;
  cloudformation_template: string | null;
  aws_account_id: string;
  aws_account_alias: string;
  // Enhanced analysis fields
  risk_score_contribution: number | null;
  impact_assessment: string | null;
  execution_tag: 'SAFE_AUTOMATABLE' | 'REQUIRES_REVIEW' | 'MANUAL_ONLY' | null;
  rollback_guidance: string | null;
  compliance_tags: string[] | null;
}

const serviceNames: Record<string, string> = {
  security_groups: "Security Groups",
  iam: "IAM",
  s3: "S3",
  ec2: "EC2",
  rds: "RDS",
  vpc: "VPC",
  cost: "Cost",
};

const Findings = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedFinding, setSelectedFinding] = useState<FindingDetails | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchFindings();
  }, []);

  const fetchFindings = async () => {
    try {
      const { data, error } = await supabase
        .from("security_findings")
        .select("*, aws_accounts(account_id, account_alias)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mappedFindings: Finding[] = (data || []).map((f: any) => ({
        id: f.id,
        severity: f.severity as "critical" | "high" | "medium" | "low" | "info",
        title: f.title,
        service: f.service,
        resource_id: f.resource_id,
        resource_type: f.resource_type,
        risk_score: f.risk_score_contribution || calculateFindingRiskScore(f.severity),
        is_resolved: f.is_resolved,
        created_at: f.created_at,
        description: f.description,
        remediation_steps: f.remediation_steps,
        cloudformation_template: f.cloudformation_template,
        aws_account_id: f.aws_account_id,
        aws_account_alias: f.aws_accounts?.account_alias || f.aws_accounts?.account_id || "Unknown",
        risk_score_contribution: f.risk_score_contribution,
        impact_assessment: f.impact_assessment,
        execution_tag: f.execution_tag,
        rollback_guidance: f.rollback_guidance,
        compliance_tags: f.compliance_tags,
      }));

      setFindings(mappedFindings);
    } catch (error) {
      console.error("Error fetching findings:", error);
      toast.error("Failed to load findings");
    } finally {
      setLoading(false);
    }
  };

  const calculateFindingRiskScore = (severity: string): number => {
    switch (severity) {
      case "critical": return 10;
      case "high": return 5;
      case "medium": return 2;
      case "low": return 1;
      default: return 0;
    }
  };

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case "critical":
        return { color: "bg-critical text-critical-foreground", icon: AlertTriangle };
      case "high":
        return { color: "bg-critical/80 text-critical-foreground", icon: AlertTriangle };
      case "medium":
        return { color: "bg-warning text-warning-foreground", icon: Shield };
      case "low":
        return { color: "bg-info text-info-foreground", icon: Info };
      default:
        return { color: "bg-muted text-muted-foreground", icon: Info };
    }
  };

  const getStatusConfig = (isResolved: boolean | null) => {
    if (isResolved) {
      return { 
        label: "FIXED", 
        color: "bg-success/10 text-success border-success/20",
        icon: CheckCircle2 
      };
    }
    return { 
      label: "OPEN", 
      color: "bg-critical/10 text-critical border-critical/20",
      icon: XCircle 
    };
  };

  // Get unique services for filter
  const uniqueServices = [...new Set(findings.map(f => f.service))];

  // Filter findings
  const filteredFindings = findings.filter((finding) => {
    const matchesSearch = 
      finding.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      finding.resource_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      finding.aws_account_alias.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSeverity = severityFilter === "all" || finding.severity === severityFilter;
    const matchesService = serviceFilter === "all" || finding.service === serviceFilter;
    const matchesStatus = 
      statusFilter === "all" || 
      (statusFilter === "open" && !finding.is_resolved) ||
      (statusFilter === "fixed" && finding.is_resolved);
    
    return matchesSearch && matchesSeverity && matchesService && matchesStatus;
  });

  // Counts for stats
  const openCount = findings.filter(f => !f.is_resolved).length;
  const fixedCount = findings.filter(f => f.is_resolved).length;
  const criticalCount = findings.filter(f => f.severity === "critical" && !f.is_resolved).length;

  const handleRowClick = (finding: Finding) => {
    const details: FindingDetails = {
      id: finding.id,
      title: finding.title,
      description: finding.description,
      severity: finding.severity,
      resource_id: finding.resource_id,
      resource_type: finding.resource_type,
      service: finding.service,
      aws_account_id: finding.aws_account_alias,
      remediation_steps: finding.remediation_steps,
      cloudformation_template: finding.cloudformation_template,
      is_resolved: finding.is_resolved,
      created_at: finding.created_at,
      risk_score_contribution: finding.risk_score_contribution,
      impact_assessment: finding.impact_assessment,
      execution_tag: finding.execution_tag,
      rollback_guidance: finding.rollback_guidance,
      compliance_tags: finding.compliance_tags,
    };
    setSelectedFinding(details);
    setDialogOpen(true);
  };

  const handleMarkResolved = async (id: string) => {
    try {
      const { error } = await supabase
        .from("security_findings")
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      toast.success("Finding marked as fixed");
      setDialogOpen(false);
      await fetchFindings();
    } catch (error) {
      console.error("Error updating finding:", error);
      toast.error("Failed to update finding");
    }
  };

  const handleExport = () => {
    const csvContent = [
      ["Severity", "Title", "Service", "Resource", "Risk Score", "Status", "Detected At", "Account"].join(","),
      ...filteredFindings.map(f => [
        f.severity,
        `"${f.title.replace(/"/g, '""')}"`,
        serviceNames[f.service] || f.service,
        f.resource_id,
        f.risk_score,
        f.is_resolved ? "FIXED" : "OPEN",
        format(new Date(f.created_at), "yyyy-MM-dd HH:mm"),
        f.aws_account_alias
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `security-findings-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Findings exported to CSV");
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        lastScanTime="--" 
        onRefresh={fetchFindings}
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className="md:ml-64 p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Security Findings</h1>
          <p className="text-muted-foreground">
            Review and remediate security issues across your AWS accounts.
          </p>
        </div>

        {/* Stats Summary */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Findings</p>
                  <p className="text-2xl font-bold">{findings.length}</p>
                </div>
                <Shield className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Open Issues</p>
                  <p className="text-2xl font-bold text-critical">{openCount}</p>
                </div>
                <XCircle className="h-8 w-8 text-critical" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Critical Open</p>
                  <p className="text-2xl font-bold text-critical">{criticalCount}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-critical" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Fixed</p>
                  <p className="text-2xl font-bold text-success">{fixedCount}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Table */}
        <Card>
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>All Findings</CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-[180px]"
                />
              </div>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  {uniqueServices.map(service => (
                    <SelectItem key={service} value={service}>
                      {serviceNames[service] || service}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="fixed">Fixed</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <FileDown className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading findings...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Severity</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead className="w-[120px]">Service</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead className="w-[100px] text-center">Risk Score</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead className="w-[140px]">Detected At</TableHead>
                      <TableHead className="w-[100px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFindings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                          {findings.length === 0 
                            ? "No security findings yet. Run a scan to detect issues."
                            : "No findings match your filters."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredFindings.map((finding) => {
                        const severityConfig = getSeverityConfig(finding.severity);
                        const statusConfig = getStatusConfig(finding.is_resolved);
                        const SeverityIcon = severityConfig.icon;
                        const StatusIcon = statusConfig.icon;

                        return (
                          <TableRow 
                            key={finding.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleRowClick(finding)}
                          >
                            <TableCell>
                              <Badge className={`${severityConfig.color} flex items-center gap-1 w-fit`}>
                                <SeverityIcon className="h-3 w-3" />
                                {finding.severity.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium line-clamp-1">{finding.title}</p>
                              {finding.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                  {finding.description}
                                </p>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">
                                {serviceNames[finding.service] || finding.service}
                              </span>
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                {finding.resource_id}
                              </code>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`font-bold ${
                                finding.risk_score >= 10 ? "text-critical" :
                                finding.risk_score >= 5 ? "text-warning" :
                                "text-info"
                              }`}>
                                {finding.risk_score}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`${statusConfig.color} flex items-center gap-1 w-fit`}>
                                <StatusIcon className="h-3 w-3" />
                                {statusConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-muted-foreground text-sm">
                                <Clock className="h-3 w-3" />
                                {format(new Date(finding.created_at), "MMM d, HH:mm")}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRowClick(finding);
                                }}
                              >
                                View details
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <FindingDetailsDialog
        finding={selectedFinding}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onMarkResolved={handleMarkResolved}
      />
    </div>
  );
};

export default Findings;