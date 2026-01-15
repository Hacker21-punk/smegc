import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { generateCloudFormationTemplate, generateCloudFormationYAML } from "@/lib/cloudformation-template";
import { 
  Plus, 
  Cloud, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Download, 
  Copy, 
  ExternalLink,
  Shield,
  AlertTriangle,
  Trash2
} from "lucide-react";
import { z } from "zod";

const accountIdSchema = z.string().regex(/^\d{12}$/, "AWS Account ID must be exactly 12 digits");
const roleArnSchema = z.string().regex(/^arn:aws:iam::\d{12}:role\/[\w+=,.@-]+$/, "Invalid IAM Role ARN format");

interface AWSAccount {
  id: string;
  account_id: string;
  account_alias: string | null;
  external_id: string;
  role_arn: string | null;
  status: "pending" | "connected" | "disconnected" | "error";
  last_scan_at: string | null;
  risk_score: number;
  created_at: string;
}

export default function AWSAccounts() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accounts, setAccounts] = useState<AWSAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState<"input" | "setup" | "verify">("input");

  // New account form state
  const [newAccountId, setNewAccountId] = useState("");
  const [newAccountAlias, setNewAccountAlias] = useState("");
  const [newRoleArn, setNewRoleArn] = useState("");
  const [currentExternalId, setCurrentExternalId] = useState("");
  const [pendingAccountId, setPendingAccountId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<{ id: string; alias: string | null; accountId: string } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("aws_accounts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAccounts((data as AWSAccount[]) || []);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      toast.error("Failed to load AWS accounts");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    // Validate account ID
    const accountValidation = accountIdSchema.safeParse(newAccountId);
    if (!accountValidation.success) {
      toast.error(accountValidation.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    try {
      // Get user's organization ID
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user?.id)
        .single();

      if (profileError || !profile?.organization_id) {
        throw new Error("Could not find organization");
      }

      // Create the account with pending status
      const { data, error } = await supabase
        .from("aws_accounts")
        .insert({
          organization_id: profile.organization_id,
          account_id: newAccountId,
          account_alias: newAccountAlias || null,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          toast.error("This AWS account is already connected");
        } else {
          throw error;
        }
        return;
      }

      const account = data as AWSAccount;
      setCurrentExternalId(account.external_id);
      setPendingAccountId(account.id);
      setStep("setup");
      toast.success("Account registered! Now set up the IAM role.");
      fetchAccounts();
    } catch (error) {
      console.error("Error creating account:", error);
      toast.error("Failed to register AWS account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyRole = async () => {
    // Validate role ARN
    const roleValidation = roleArnSchema.safeParse(newRoleArn);
    if (!roleValidation.success) {
      toast.error(roleValidation.error.errors[0].message);
      return;
    }

    if (!pendingAccountId) {
      toast.error("No pending account to verify");
      return;
    }

    setIsSubmitting(true);
    try {
      // Update account with role ARN and mark as connected
      const { error } = await supabase
        .from("aws_accounts")
        .update({
          role_arn: newRoleArn,
          status: "connected",
        })
        .eq("id", pendingAccountId);

      if (error) throw error;

      toast.success("AWS account connected successfully!");
      resetDialog();
      fetchAccounts();

      // Trigger initial scan
      handleTriggerScan(pendingAccountId);
    } catch (error) {
      console.error("Error verifying role:", error);
      toast.error("Failed to verify IAM role");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTriggerScan = async (accountId: string) => {
    toast.info("Starting security scan...", {
      description: "Scanning Security Groups and IAM. This may take a few minutes.",
    });

    try {
      const { data, error } = await supabase.functions.invoke("trigger-scan", {
        body: {
          aws_account_id: accountId,
          services: ["security_groups", "iam"],
        },
      });

      // Non-2xx responses can surface here
      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error("No response from scan service");
      }

      // Graceful "already running" response (function returns 200)
      if (data.success === false && data.scan_job_id) {
        toast.warning("A scan is already in progress for this account", {
          description: `Scan job ${String(data.scan_job_id).slice(0, 8)}... is running`,
        });
        return;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success("Scan initiated!", {
        description: `Scan job ${String(data.scan_job_id).slice(0, 8)}... started`,
      });

      // Refresh accounts after a short delay to show updated status
      setTimeout(() => {
        fetchAccounts();
      }, 5000);
    } catch (error) {
      console.error("Error triggering scan:", error);
      toast.error("Failed to start scan", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleDeleteAccount = (account: { id: string; account_alias: string | null; account_id: string }) => {
    setAccountToDelete({ id: account.id, alias: account.account_alias, accountId: account.account_id });
    setDeleteConfirmText("");
    setDeleteDialogOpen(true);
  };

  const handleConfirmedDelete = async () => {
    if (!accountToDelete || deleteConfirmText !== "DELETE") return;

    try {
      const { error } = await supabase
        .from("aws_accounts")
        .delete()
        .eq("id", accountToDelete.id);

      if (error) throw error;
      toast.success("AWS account disconnected");
      fetchAccounts();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error deleting account:", error);
      }
      toast.error("Failed to disconnect account");
    } finally {
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
      setDeleteConfirmText("");
    }
  };

  const downloadTemplate = (format: "json" | "yaml") => {
    const content = format === "json" 
      ? generateCloudFormationTemplate(currentExternalId)
      : generateCloudFormationYAML(currentExternalId);
    
    const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sme-cloud-guard-role.${format === "json" ? "json" : "yaml"}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`CloudFormation template downloaded (${format.toUpperCase()})`);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const resetDialog = () => {
    setDialogOpen(false);
    setStep("input");
    setNewAccountId("");
    setNewAccountAlias("");
    setNewRoleArn("");
    setCurrentExternalId("");
    setPendingAccountId(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return <Badge className="bg-success/10 text-success border-success/20"><CheckCircle2 className="h-3 w-3 mr-1" /> Connected</Badge>;
      case "pending":
        return <Badge className="bg-warning/10 text-warning border-warning/20"><AlertTriangle className="h-3 w-3 mr-1" /> Pending Setup</Badge>;
      case "error":
        return <Badge className="bg-critical/10 text-critical border-critical/20"><XCircle className="h-3 w-3 mr-1" /> Error</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRiskBadge = (score: number) => {
    if (score >= 70) return <Badge className="bg-critical/10 text-critical">High Risk: {score}</Badge>;
    if (score >= 40) return <Badge className="bg-warning/10 text-warning">Medium Risk: {score}</Badge>;
    return <Badge className="bg-success/10 text-success">Low Risk: {score}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        lastScanTime="2 hours ago"
        onRefresh={() => fetchAccounts()}
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="md:ml-64 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">AWS Accounts</h1>
            <p className="text-muted-foreground">
              Connect and manage your AWS accounts for security monitoring.
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => open ? setDialogOpen(true) : resetDialog()}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Connect AWS Account
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5 text-primary" />
                  Connect AWS Account
                </DialogTitle>
                <DialogDescription>
                  {step === "input" && "Enter your AWS Account ID to get started."}
                  {step === "setup" && "Deploy the CloudFormation template to create a read-only IAM role."}
                  {step === "verify" && "Enter the Role ARN to complete the connection."}
                </DialogDescription>
              </DialogHeader>

              {step === "input" && (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="account-id">AWS Account ID</Label>
                    <Input
                      id="account-id"
                      placeholder="123456789012"
                      value={newAccountId}
                      onChange={(e) => setNewAccountId(e.target.value.replace(/\D/g, "").slice(0, 12))}
                      maxLength={12}
                    />
                    <p className="text-xs text-muted-foreground">
                      Your 12-digit AWS account ID. Find it in your AWS Console → Account Settings.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account-alias">Account Alias (Optional)</Label>
                    <Input
                      id="account-alias"
                      placeholder="e.g., Production, Staging, Development"
                      value={newAccountAlias}
                      onChange={(e) => setNewAccountAlias(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-2 p-4 rounded-lg bg-info/10 border border-info/20">
                    <Shield className="h-5 w-5 text-info flex-shrink-0" />
                    <p className="text-sm text-info">
                      SME Cloud Guard uses read-only IAM role assumption. We never store your AWS credentials.
                    </p>
                  </div>

                  <Button 
                    onClick={handleCreateAccount} 
                    className="w-full"
                    disabled={newAccountId.length !== 12 || isSubmitting}
                  >
                    {isSubmitting ? "Registering..." : "Continue"}
                  </Button>
                </div>
              )}

              {step === "setup" && (
                <div className="space-y-4 py-4">
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="font-medium mb-2">Your External ID (keep this secure):</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-background rounded text-sm font-mono break-all">
                        {currentExternalId}
                      </code>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(currentExternalId, "External ID")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="font-medium">Download CloudFormation Template:</p>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 gap-2" onClick={() => downloadTemplate("yaml")}>
                        <Download className="h-4 w-4" />
                        Download YAML
                      </Button>
                      <Button variant="outline" className="flex-1 gap-2" onClick={() => downloadTemplate("json")}>
                        <Download className="h-4 w-4" />
                        Download JSON
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 p-4 rounded-lg border">
                    <p className="font-medium">Deployment Steps:</p>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      <li>Go to AWS CloudFormation Console</li>
                      <li>Click "Create Stack" → "With new resources"</li>
                      <li>Upload the downloaded template</li>
                      <li>Click through and create the stack</li>
                      <li>Copy the RoleArn from the Outputs tab</li>
                    </ol>
                    <Button variant="link" className="p-0 h-auto gap-1" asChild>
                      <a href="https://console.aws.amazon.com/cloudformation" target="_blank" rel="noopener noreferrer">
                        Open AWS CloudFormation
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>

                  <Button onClick={() => setStep("verify")} className="w-full">
                    I've Deployed the Stack
                  </Button>
                </div>
              )}

              {step === "verify" && (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="role-arn">IAM Role ARN</Label>
                    <Input
                      id="role-arn"
                      placeholder="arn:aws:iam::123456789012:role/SMECloudGuardSecurityAuditRole"
                      value={newRoleArn}
                      onChange={(e) => setNewRoleArn(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Copy this from the CloudFormation stack Outputs tab.
                    </p>
                  </div>

                  <Button 
                    onClick={handleVerifyRole} 
                    className="w-full"
                    disabled={!newRoleArn || isSubmitting}
                  >
                    {isSubmitting ? "Verifying..." : "Connect Account"}
                  </Button>

                  <Button variant="ghost" className="w-full" onClick={() => setStep("setup")}>
                    Back to Setup Instructions
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : accounts.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Cloud className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No AWS Accounts Connected</h3>
              <p className="text-muted-foreground mb-4">
                Connect your first AWS account to start monitoring security.
              </p>
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Connect AWS Account
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <Card key={account.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {account.account_alias || `AWS Account`}
                      </CardTitle>
                      <CardDescription className="font-mono">
                        {account.account_id}
                      </CardDescription>
                    </div>
                    {getStatusBadge(account.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {account.status === "connected" && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Risk Score</span>
                        {getRiskBadge(account.risk_score)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Last Scan</span>
                        <span className="text-sm">
                          {account.last_scan_at 
                            ? new Date(account.last_scan_at).toLocaleDateString()
                            : "Never"
                          }
                        </span>
                      </div>
                    </>
                  )}

                  {account.status === "pending" && (
                    <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                      <p className="text-sm text-warning">
                        Complete the IAM role setup to start scanning.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {account.status === "connected" && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 gap-1"
                        onClick={() => handleTriggerScan(account.id)}
                      >
                        <RefreshCw className="h-3 w-3" />
                        Scan Now
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteAccount(account)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete AWS Account?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You are about to disconnect <strong>{accountToDelete?.alias || accountToDelete?.accountId}</strong>.
                This will permanently delete all scan history and security findings associated with this account.
              </p>
              <p className="text-destructive font-medium">
                This action cannot be undone.
              </p>
              <div className="pt-2">
                <Label htmlFor="delete-confirm" className="text-sm font-medium">
                  Type <code className="bg-muted px-1 py-0.5 rounded">DELETE</code> to confirm:
                </Label>
                <Input
                  id="delete-confirm"
                  className="mt-2"
                  placeholder="Type DELETE"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                  autoComplete="off"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setAccountToDelete(null);
              setDeleteConfirmText("");
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteConfirmText !== "DELETE"}
              onClick={handleConfirmedDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
