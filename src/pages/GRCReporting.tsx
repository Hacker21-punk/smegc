import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ClipboardList,
  Download,
  FileSpreadsheet,
  RefreshCw,
  ShieldCheck,
  Gavel,
  AlertOctagon,
  ScrollText,
  Search,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { FindingForCompliance } from "@/lib/compliance-evidence-engine";
import {
  GRCReport,
  formatGRCReportAsMarkdown,
  formatRiskRegisterAsCSV,
  generateGRCReport,
  getRiskRatingConfig,
  getRiskStatusConfig,
} from "@/lib/grc-engine";

type RiskFilter = "all" | "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

const GRCReporting = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<GRCReport | null>(null);
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        accountsRes,
        findingsRes,
        pathsRes,
        policiesRes,
        violationsRes,
        assetsRes,
      ] = await Promise.all([
        supabase
          .from("aws_accounts")
          .select("id, account_id, account_alias")
          .order("created_at", { ascending: false }),
        supabase
          .from("security_findings")
          .select(
            "id, title, service, severity, is_resolved, created_at, compliance_tags, remediation_steps, execution_tag, aws_account_id",
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("attack_paths")
          .select(
            "id, title, severity, status, risk_score, blast_radius, detected_at, updated_at, aws_account_id",
          )
          .order("detected_at", { ascending: false }),
        supabase
          .from("security_policies")
          .select(
            "id, name, policy_type, scope, enforcement_mode, is_enabled, severity, updated_at, aws_account_id",
          )
          .order("updated_at", { ascending: false }),
        supabase
          .from("policy_violations")
          .select(
            "id, policy_id, status, severity, resource_name, resource_type, region, detected_at, aws_account_id",
          )
          .order("detected_at", { ascending: false }),
        supabase
          .from("cloud_assets")
          .select("id", { count: "exact", head: true }),
      ]);

      const firstError =
        accountsRes.error ||
        findingsRes.error ||
        pathsRes.error ||
        policiesRes.error ||
        violationsRes.error;
      if (firstError) throw firstError;

      const accountList = (accountsRes.data || []).map((a) => ({
        id: a.id,
        name: a.account_alias || a.account_id,
      }));
      setAccounts(accountList);

      const inScope = <T extends { aws_account_id?: string | null }>(rows: T[]) =>
        selectedAccount === "all"
          ? rows
          : rows.filter((r) => r.aws_account_id === selectedAccount);

      const scopeLabel =
        selectedAccount === "all"
          ? accountList.length > 0
            ? `All cloud accounts (${accountList.length})`
            : "No cloud accounts connected"
          : accountList.find((a) => a.id === selectedAccount)?.name || "Selected account";

      setReport(
        generateGRCReport({
          scopeLabel,
          accountsInScope: selectedAccount === "all" ? accountList.length : 1,
          assetsInScope: assetsRes.count ?? 0,
          findings: inScope(findingsRes.data || []) as FindingForCompliance[],
          attackPaths: inScope(pathsRes.data || []),
          policies: inScope(policiesRes.data || []),
          violations: inScope(violationsRes.data || []),
        }),
      );
    } catch (error) {
      console.error("Error building GRC report:", error);
      toast.error("Could not build the GRC report");
    } finally {
      setLoading(false);
    }
  }, [selectedAccount]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const download = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadMarkdown = () => {
    if (!report) return;
    download(
      formatGRCReportAsMarkdown(report),
      `grc-report-${format(new Date(), "yyyy-MM-dd")}.md`,
      "text/markdown",
    );
    toast.success("GRC report downloaded");
  };

  const handleDownloadCSV = () => {
    if (!report) return;
    download(
      formatRiskRegisterAsCSV(report),
      `risk-register-${format(new Date(), "yyyy-MM-dd")}.csv`,
      "text/csv",
    );
    toast.success("Risk register exported");
  };

  const filteredRisks = useMemo(() => {
    if (!report) return [];
    const q = search.trim().toLowerCase();
    return report.risk_register.filter((r) => {
      if (riskFilter !== "all" && r.rating !== riskFilter) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.risk_id.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
      );
    });
  }, [report, riskFilter, search]);

  const hasData =
    !!report &&
    (report.risk_register.length > 0 ||
      report.policy_governance.length > 0 ||
      report.summary.accounts_in_scope > 0);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        lastScanTime="--"
        onRefresh={fetchData}
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="md:ml-64 p-6">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <ClipboardList className="h-6 w-6 text-primary" />
            </div>
            <h1 className="heading-display">GRC Reporting</h1>
          </div>
          <p className="text-fluid-subtitle text-muted-foreground">
            Governance, risk and compliance pack — risk register, policy governance,
            exceptions and framework posture, all built from read-only cloud evidence.
          </p>
        </div>

        {/* Controls */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-xl">
                  {report ? `Report ${report.report_id}` : "GRC pack"}
                </CardTitle>
                <CardDescription>
                  {report
                    ? `${report.scope_label} · ${report.period_start.slice(0, 10)} → ${report.period_end.slice(0, 10)}`
                    : "Select a scope to build the report"}
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger className="w-[190px]">
                    <SelectValue placeholder="Select scope" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All accounts</SelectItem>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Rebuild
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadCSV}
                  disabled={!report || report.risk_register.length === 0}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Risk register (CSV)
                </Button>
                <Button size="sm" onClick={handleDownloadMarkdown} disabled={!report}>
                  <Download className="mr-2 h-4 w-4" />
                  Full GRC report
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !hasData ? (
          <EmptyState
            icon={<ClipboardList className="h-7 w-7" />}
            title="No GRC evidence yet"
            description="Connect a cloud account and run a scan. Findings, attack paths and policy violations are automatically turned into a risk register, governance table and framework posture you can hand to an auditor."
            ctaHref="/dashboard/accounts"
          />
        ) : report ? (
          <div className="space-y-6">
            {/* Executive KPIs */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className="bg-gradient-to-br from-card to-muted/30">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-1">GRC maturity</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-bold text-primary">
                      {report.maturity_score}
                    </p>
                    <span className="text-sm text-muted-foreground">/ 100</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tier: {report.maturity_tier}
                  </p>
                  <Progress value={report.maturity_score} className="mt-3 h-2" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <AlertOctagon className="h-4 w-4 text-critical" />
                    Risk register
                  </div>
                  <p className="text-3xl font-bold">{report.summary.total_risks}</p>
                  <p className="text-xs text-muted-foreground">
                    {report.summary.critical_risks} critical · {report.summary.high_risks} high
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Avg residual {report.summary.avg_residual_score}/25
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Gavel className="h-4 w-4 text-primary" />
                    Governance
                  </div>
                  <p className="text-3xl font-bold">
                    {report.summary.policies_enabled}
                    <span className="text-base text-muted-foreground">
                      /{report.summary.policies_total}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    policies enabled · {report.summary.open_violations} open violations
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <ScrollText className="h-4 w-4 text-warning" />
                    Lifecycle
                  </div>
                  <p className="text-3xl font-bold">{report.summary.open_risks}</p>
                  <p className="text-xs text-muted-foreground">
                    open · {report.summary.accepted_risks} accepted ·{" "}
                    {report.summary.closed_risks} closed
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {report.summary.exceptions} documented exceptions
                  </p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="risks">
              <TabsList className="flex-wrap h-auto gap-1">
                <TabsTrigger value="risks">Risk register</TabsTrigger>
                <TabsTrigger value="governance">Policy governance</TabsTrigger>
                <TabsTrigger value="compliance">Framework posture</TabsTrigger>
                <TabsTrigger value="exceptions">Exceptions</TabsTrigger>
                <TabsTrigger value="attestations">Attestations</TabsTrigger>
              </TabsList>

              {/* Risk register */}
              <TabsContent value="risks" className="mt-4">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <CardTitle className="text-lg">Risk register</CardTitle>
                        <CardDescription>
                          Likelihood × impact scoring across findings, attack paths and
                          policy violations
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search risks"
                            className="pl-8 w-[200px]"
                          />
                        </div>
                        <Select
                          value={riskFilter}
                          onValueChange={(v) => setRiskFilter(v as RiskFilter)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All ratings</SelectItem>
                            <SelectItem value="CRITICAL">Critical</SelectItem>
                            <SelectItem value="HIGH">High</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="LOW">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {filteredRisks.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-8 text-center">
                        No risks match the current filters.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Risk ID</TableHead>
                              <TableHead>Risk</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead className="text-center">L</TableHead>
                              <TableHead className="text-center">I</TableHead>
                              <TableHead className="text-center">Residual</TableHead>
                              <TableHead>Rating</TableHead>
                              <TableHead>Treatment</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Identified</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredRisks.slice(0, 100).map((r) => {
                              const rating = getRiskRatingConfig(r.rating);
                              const status = getRiskStatusConfig(r.status);
                              return (
                                <TableRow key={r.risk_id}>
                                  <TableCell className="font-mono text-xs whitespace-nowrap">
                                    {r.risk_id}
                                  </TableCell>
                                  <TableCell className="max-w-[280px]">
                                    <p className="text-sm font-medium truncate">{r.title}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {r.scope}
                                    </p>
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {r.category}
                                  </TableCell>
                                  <TableCell className="text-center text-sm">
                                    {r.likelihood}
                                  </TableCell>
                                  <TableCell className="text-center text-sm">
                                    {r.impact}
                                  </TableCell>
                                  <TableCell className="text-center text-sm font-semibold">
                                    {r.residual_score}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className={rating.color}>
                                      {rating.label}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    {r.treatment.charAt(0) + r.treatment.slice(1).toLowerCase()}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className={status.color}>
                                      {status.label}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                    {format(new Date(r.identified_at), "MMM d, yyyy")}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                        {filteredRisks.length > 100 && (
                          <p className="text-xs text-muted-foreground mt-4">
                            Showing the top 100 of {filteredRisks.length} risks by residual
                            score. Export the CSV for the complete register.
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Governance */}
              <TabsContent value="governance" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Policy governance</CardTitle>
                    <CardDescription>
                      Control ownership, enforcement mode and measured effectiveness
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {report.policy_governance.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-8 text-center">
                        No governance policies defined yet. Create policies in Autopilot to
                        populate this section.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Policy</TableHead>
                              <TableHead>Scope</TableHead>
                              <TableHead>Mode</TableHead>
                              <TableHead>State</TableHead>
                              <TableHead className="text-center">Open</TableHead>
                              <TableHead className="text-center">Resolved</TableHead>
                              <TableHead className="w-[160px]">Effectiveness</TableHead>
                              <TableHead>Updated</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {report.policy_governance.map((p) => (
                              <TableRow key={p.policy_id}>
                                <TableCell>
                                  <p className="text-sm font-medium">{p.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {p.policy_type.replace(/_/g, " ")}
                                  </p>
                                </TableCell>
                                <TableCell className="text-xs capitalize">{p.scope}</TableCell>
                                <TableCell className="text-xs capitalize">
                                  {p.enforcement_mode}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={
                                      p.is_enabled
                                        ? "bg-success/10 text-success border-success/20"
                                        : "bg-muted text-muted-foreground"
                                    }
                                  >
                                    {p.is_enabled ? "Enabled" : "Disabled"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center text-sm">
                                  {p.open_violations}
                                </TableCell>
                                <TableCell className="text-center text-sm">
                                  {p.resolved_violations}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Progress value={p.effectiveness} className="h-2" />
                                    <span className="text-xs text-muted-foreground w-9 text-right">
                                      {p.effectiveness}%
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                  {format(new Date(p.last_updated_at), "MMM d, yyyy")}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Framework posture */}
              <TabsContent value="compliance" className="mt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {report.framework_posture.map((f) => (
                    <Card key={f.framework}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                            <CardTitle className="text-base">{f.display_name}</CardTitle>
                          </div>
                          <Badge variant="outline">Read-only evidence</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Control coverage</span>
                            <span className="font-semibold">{f.coverage_percentage}%</span>
                          </div>
                          <Progress value={f.coverage_percentage} className="h-2" />
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="rounded-lg bg-success/10 py-2">
                            <p className="text-lg font-bold text-success">
                              {f.controls_supported}
                            </p>
                            <p className="text-xs text-muted-foreground">Supported</p>
                          </div>
                          <div className="rounded-lg bg-warning/10 py-2">
                            <p className="text-lg font-bold text-warning">
                              {f.controls_partial}
                            </p>
                            <p className="text-xs text-muted-foreground">Partial</p>
                          </div>
                          <div className="rounded-lg bg-muted py-2">
                            <p className="text-lg font-bold text-muted-foreground">
                              {f.controls_missing}
                            </p>
                            <p className="text-xs text-muted-foreground">No evidence</p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {f.total_controls} mapped controls in scope.
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Exceptions */}
              <TabsContent value="exceptions" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Exceptions & accepted risks</CardTitle>
                    <CardDescription>
                      Formally accepted, suppressed or dismissed risks with an audit trail
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {report.exceptions.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-8 text-center">
                        No exceptions recorded. Accepted or suppressed risks appear here
                        automatically.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Exception ID</TableHead>
                              <TableHead>Subject</TableHead>
                              <TableHead>Source</TableHead>
                              <TableHead>Severity</TableHead>
                              <TableHead>Reason</TableHead>
                              <TableHead>Raised</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {report.exceptions.map((e) => (
                              <TableRow key={e.exception_id}>
                                <TableCell className="font-mono text-xs whitespace-nowrap">
                                  {e.exception_id}
                                </TableCell>
                                <TableCell className="text-sm max-w-[260px]">
                                  <p className="truncate">{e.subject}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {e.scope}
                                  </p>
                                </TableCell>
                                <TableCell className="text-xs">
                                  {e.source.replace(/_/g, " ").toLowerCase()}
                                </TableCell>
                                <TableCell className="text-xs capitalize">
                                  {e.severity}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {e.reason}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                  {format(new Date(e.raised_at), "MMM d, yyyy")}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Attestations */}
              <TabsContent value="attestations" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Assurance statements</CardTitle>
                    <CardDescription>
                      Included verbatim in the exported GRC report
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {report.attestations.map((a) => (
                      <div
                        key={a}
                        className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3"
                      >
                        <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <p className="text-sm text-muted-foreground">{a}</p>
                      </div>
                    ))}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-xs text-muted-foreground pt-1 cursor-help">
                          Report generated {format(new Date(report.generated_at), "PPpp")}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent>
                        Reports are deterministic — the same dataset always reproduces this
                        output.
                      </TooltipContent>
                    </Tooltip>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default GRCReporting;
