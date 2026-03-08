import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  type CloudAccount, fetchCloudAccounts, connectAzureAccount,
  deleteCloudAccount, runMultiCloudDiscovery,
} from "@/lib/multi-cloud-service";
import { Plus, CheckCircle2, XCircle, AlertTriangle, Trash2, Search as SearchIcon, Cloud, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AzureAccounts() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accounts, setAccounts] = useState<CloudAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [azureName, setAzureName] = useState("");
  const [azureTenantId, setAzureTenantId] = useState("");
  const [azureClientId, setAzureClientId] = useState("");
  const [azureClientSecret, setAzureClientSecret] = useState("");
  const [azureSubscriptionId, setAzureSubscriptionId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<CloudAccount | null>(null);

  useEffect(() => { loadAccounts(); }, []);

  const loadAccounts = async () => {
    try {
      const data = await fetchCloudAccounts();
      setAccounts(data.filter((a) => a.provider === "azure"));
    } catch {
      toast.error("Failed to load Azure accounts");
    } finally {
      setLoading(false);
    }
  };

  const getOrgId = async (): Promise<string> => {
    const { data: profile, error } = await supabase
      .from("profiles").select("organization_id").eq("id", user?.id).single();
    if (error || !profile?.organization_id) throw new Error("Organization not found");
    return profile.organization_id;
  };

  const handleConnect = async () => {
    if (!azureTenantId || !azureClientId || !azureClientSecret || !azureSubscriptionId) {
      toast.error("All Azure credential fields are required");
      return;
    }
    setIsSubmitting(true);
    try {
      const orgId = await getOrgId();
      await connectAzureAccount(orgId, azureName || "Azure Subscription", {
        tenant_id: azureTenantId, client_id: azureClientId,
        client_secret: azureClientSecret, subscription_id: azureSubscriptionId,
      });
      toast.success("Azure account connected!");
      resetDialog();
      loadAccounts();
    } catch (error: any) {
      toast.error(error?.code === "23505" ? "This Azure subscription is already connected" : "Failed to connect Azure account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScan = async (account: CloudAccount) => {
    setScanningId(account.id);
    toast.info("Starting Azure discovery...");
    try {
      const result = await runMultiCloudDiscovery(account.id);
      toast.success(`Discovered ${result.discovered.total} Azure resources!`);
      loadAccounts();
    } catch (error) {
      toast.error("Discovery failed", { description: error instanceof Error ? error.message : "Unknown error" });
    } finally {
      setScanningId(null);
    }
  };

  const handleDelete = async () => {
    if (!accountToDelete) return;
    try {
      await deleteCloudAccount(accountToDelete.id);
      toast.success("Azure account disconnected");
      loadAccounts();
    } catch {
      toast.error("Failed to disconnect account");
    } finally {
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
    }
  };

  const resetDialog = () => {
    setDialogOpen(false);
    setAzureName(""); setAzureTenantId(""); setAzureClientId("");
    setAzureClientSecret(""); setAzureSubscriptionId("");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected": return <Badge className="bg-success/10 text-success border-success/20"><CheckCircle2 className="h-3 w-3 mr-1" /> Connected</Badge>;
      case "pending": return <Badge className="bg-warning/10 text-warning border-warning/20"><AlertTriangle className="h-3 w-3 mr-1" /> Pending</Badge>;
      case "error": return <Badge className="bg-destructive/10 text-destructive border-destructive/20"><XCircle className="h-3 w-3 mr-1" /> Error</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader lastScanTime="" onRefresh={loadAccounts} onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="md:ml-64 pt-16">
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">🔷 Azure Accounts</h1>
              <p className="text-muted-foreground">Connect and manage Microsoft Azure subscriptions.</p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => open ? setDialogOpen(true) : resetDialog()}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> Connect Azure</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">🔷 Connect Azure Account</DialogTitle>
                  <DialogDescription>Enter your Azure Service Principal credentials for asset discovery.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Account Name</Label>
                    <Input placeholder="e.g., Production Subscription" value={azureName} onChange={(e) => setAzureName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tenant ID *</Label>
                    <Input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={azureTenantId} onChange={(e) => setAzureTenantId(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Client ID *</Label>
                    <Input placeholder="Application (client) ID" value={azureClientId} onChange={(e) => setAzureClientId(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Client Secret *</Label>
                    <Input type="password" placeholder="Client secret value" value={azureClientSecret} onChange={(e) => setAzureClientSecret(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Subscription ID *</Label>
                    <Input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={azureSubscriptionId} onChange={(e) => setAzureSubscriptionId(e.target.value)} />
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-info/10 border border-info/20">
                    <Shield className="h-4 w-4 text-info flex-shrink-0" />
                    <p className="text-xs text-info">Create a Service Principal with Reader role for read-only discovery.</p>
                  </div>
                  <Button className="w-full" onClick={handleConnect} disabled={isSubmitting}>
                    {isSubmitting ? "Connecting..." : "Connect Azure"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Azure Subscriptions</p>
                <p className="text-2xl font-bold">{accounts.length}</p>
              </div>
              <span className="text-3xl">🔷</span>
            </CardContent>
          </Card>

          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
          ) : accounts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Cloud className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Azure accounts connected</h3>
                <p className="text-muted-foreground max-w-md mx-auto">Connect your Azure subscriptions to start discovering and securing your cloud infrastructure.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <Card key={account.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">🔷</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{account.account_name}</p>
                            {getStatusBadge(account.status)}
                          </div>
                          <p className="text-sm text-muted-foreground font-mono">{account.account_identifier}</p>
                          {account.last_scan_at && (
                            <p className="text-xs text-muted-foreground mt-1">Last scan: {new Date(account.last_scan_at).toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleScan(account)} disabled={scanningId === account.id}>
                          <SearchIcon className={`h-4 w-4 mr-1 ${scanningId === account.id ? "animate-spin" : ""}`} />
                          {scanningId === account.id ? "Scanning..." : "Discover Assets"}
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => { setAccountToDelete(account); setDeleteDialogOpen(true); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Azure Account</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to disconnect "{accountToDelete?.account_name}"? This will remove the account and its credentials.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Disconnect</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
