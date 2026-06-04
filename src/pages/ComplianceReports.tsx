import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Shield, 
  Lock, 
  FileCheck, 
  Globe, 
  Download, 
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  FileText,
  Calendar
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  ComplianceFramework,
  ComplianceReport,
  generateComplianceReport,
  getFrameworkConfig,
  getCoverageStatusConfig,
  formatReportAsMarkdown,
  getAvailableFrameworks,
  FindingForCompliance
} from "@/lib/compliance-evidence-engine";

const ComplianceReports = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [findings, setFindings] = useState<FindingForCompliance[]>([]);
  const [selectedFramework, setSelectedFramework] = useState<ComplianceFramework>('ISO_27001');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [report, setReport] = useState<ComplianceReport | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (findings.length > 0) {
      generateReport();
    }
  }, [selectedFramework, selectedAccount, findings]);

  const fetchData = async () => {
    try {
      // Fetch accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from("aws_accounts")
        .select("id, account_id, account_alias")
        .order("created_at", { ascending: false });

      if (accountsError) throw accountsError;

      setAccounts((accountsData || []).map(a => ({
        id: a.id,
        name: a.account_alias || a.account_id
      })));

      // Fetch all findings
      const { data: findingsData, error: findingsError } = await supabase
        .from("security_findings")
        .select("id, title, service, severity, is_resolved, created_at, compliance_tags, remediation_steps, execution_tag, aws_account_id")
        .order("created_at", { ascending: false });

      if (findingsError) throw findingsError;

      setFindings(findingsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const generateReport = () => {
    setGenerating(true);
    
    // Filter findings by account if selected
    const filteredFindings = selectedAccount === 'all' 
      ? findings 
      : findings.filter(f => f.aws_account_id === selectedAccount);

    const accountName = selectedAccount === 'all' 
      ? 'All Accounts' 
      : accounts.find(a => a.id === selectedAccount)?.name || 'Unknown';

    const newReport = generateComplianceReport(
      selectedFramework,
      filteredFindings as FindingForCompliance[],
      accountName
    );

    setReport(newReport);
    setGenerating(false);
  };

  const handleDownload = () => {
    if (!report) return;

    const markdown = formatReportAsMarkdown(report);
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.framework}-evidence-report-${format(new Date(), "yyyy-MM-dd")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Report downloaded");
  };

  const getFrameworkIcon = (framework: ComplianceFramework) => {
    const icons = {
      ISO_27001: Shield,
      SOC_2: Lock,
      DPDP_ACT: FileCheck,
      GDPR: Globe
    };
    return icons[framework];
  };

  const getCoverageIcon = (status: string) => {
    switch (status) {
      case 'SUPPORTED':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'PARTIAL':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      default:
        return <XCircle className="h-4 w-4 text-critical" />;
    }
  };

  const frameworks = getAvailableFrameworks();

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
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <h1 className="heading-display">Compliance Reports</h1>
          </div>
          <p className="text-fluid-subtitle text-muted-foreground">
            Generate audit-ready evidence reports for compliance frameworks.
          </p>
        </div>

        {/* Framework Selection Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          {frameworks.map((fw) => {
            const config = getFrameworkConfig(fw);
            const Icon = getFrameworkIcon(fw);
            const isSelected = selectedFramework === fw;
            
            return (
              <Card 
                key={fw}
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  isSelected ? 'ring-2 ring-primary shadow-md' : 'hover:border-primary/50'
                }`}
                onClick={() => setSelectedFramework(fw)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{config.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">{config.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Report Controls */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-xl">Evidence Report</CardTitle>
                <CardDescription>
                  {report?.framework_display_name || 'Select a framework'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accounts</SelectItem>
                    {accounts.map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => generateReport()}
                  disabled={generating}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleDownload}
                  disabled={!report}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : report ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-5">
              <Card className="bg-gradient-to-br from-card to-muted/30">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Coverage Score</p>
                    <p className="text-4xl font-bold text-primary">{report.summary.coverage_percentage}%</p>
                    <Progress 
                      value={report.summary.coverage_percentage} 
                      className="mt-3 h-2"
                    />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-success/10">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{report.summary.controls_supported}</p>
                      <p className="text-xs text-muted-foreground">Supported</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-warning/10">
                      <AlertTriangle className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{report.summary.controls_partial}</p>
                      <p className="text-xs text-muted-foreground">Partial</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-critical/10">
                      <XCircle className="h-5 w-5 text-critical" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{report.summary.controls_missing}</p>
                      <p className="text-xs text-muted-foreground">Missing</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Generated</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(report.generated_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Control Mappings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Control Mapping</CardTitle>
                <CardDescription>
                  Evidence mapping for {report.summary.total_controls} controls
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={report.control_mapping[0]?.control_category || ''}>
                  <TabsList className="flex-wrap h-auto gap-1 mb-4">
                    {[...new Set(report.control_mapping.map(c => c.control_category))].map(category => (
                      <TabsTrigger key={category} value={category} className="text-xs">
                        {category}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {[...new Set(report.control_mapping.map(c => c.control_category))].map(category => (
                    <TabsContent key={category} value={category}>
                      <Accordion type="single" collapsible className="w-full">
                        {report.control_mapping
                          .filter(c => c.control_category === category)
                          .map(control => {
                            const statusConfig = getCoverageStatusConfig(control.coverage_status);
                            
                            return (
                              <AccordionItem key={control.control_id} value={control.control_id}>
                                <AccordionTrigger className="hover:no-underline">
                                  <div className="flex items-center gap-3 text-left">
                                    {getCoverageIcon(control.coverage_status)}
                                    <span className="font-mono text-sm text-muted-foreground">
                                      {control.control_id}
                                    </span>
                                    <span className="text-sm font-medium">
                                      {control.control_description}
                                    </span>
                                    <Badge 
                                      variant="outline" 
                                      className={`ml-auto ${statusConfig.color}`}
                                    >
                                      {statusConfig.label}
                                    </Badge>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                  <div className="pl-7 space-y-4">
                                    {control.gap_notes && (
                                      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                                        <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                                        <p className="text-sm text-muted-foreground">
                                          {control.gap_notes}
                                        </p>
                                      </div>
                                    )}
                                    
                                    {control.evidence.length > 0 ? (
                                      <div className="space-y-2">
                                        <p className="text-sm font-medium">Evidence Items:</p>
                                        {control.evidence.map((ev, idx) => (
                                          <div 
                                            key={idx}
                                            className="p-3 rounded-lg border bg-card"
                                          >
                                            <div className="flex items-start justify-between gap-4">
                                              <div className="space-y-1 flex-1">
                                                <p className="text-sm font-medium">{ev.finding_title}</p>
                                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                  <span>Ref: {ev.evidence_reference}</span>
                                                  <span>Detected: {format(new Date(ev.detection_timestamp), "MMM d, yyyy")}</span>
                                                </div>
                                              </div>
                                              <Badge 
                                                variant="outline"
                                                className={
                                                  ev.verification_status === 'FULLY_RESOLVED'
                                                    ? 'bg-success/10 text-success border-success/20'
                                                    : 'bg-warning/10 text-warning border-warning/20'
                                                }
                                              >
                                                {ev.verification_status.replace('_', ' ')}
                                              </Badge>
                                            </div>
                                            {ev.verification_result && (
                                              <p className="text-xs text-muted-foreground mt-2">
                                                {ev.verification_result}
                                              </p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-muted-foreground">
                                        No evidence items mapped to this control.
                                      </p>
                                    )}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            );
                          })}
                      </Accordion>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>

            {/* Disclaimer */}
            <Card className="border-warning/20 bg-warning/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Disclaimer</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {report.disclaimer}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No findings available. Run a security scan to generate compliance reports.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default ComplianceReports;
