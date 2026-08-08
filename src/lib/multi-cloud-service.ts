import { supabase } from "@/integrations/supabase/client";

export type CloudProvider = "aws" | "azure" | "gcp";

export interface CloudAccount {
  id: string;
  organization_id: string;
  provider: CloudProvider;
  account_name: string;
  account_identifier: string;
  status: "pending" | "connected" | "disconnected" | "error";
  last_scan_at: string | null;
  risk_score: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AzureCredentials {
  tenant_id: string;
  client_id: string;
  client_secret: string;
  subscription_id: string;
}

export interface GCPCredentials {
  project_id: string;
  service_account_key: string;
}

// ── Fetch all cloud accounts ──
export async function fetchCloudAccounts(): Promise<CloudAccount[]> {
  const { data, error } = await (supabase
    .from("cloud_accounts") as any)
    .select("id, organization_id, provider, account_name, account_identifier, status, last_scan_at, risk_score, metadata, created_at, updated_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as CloudAccount[]) || [];
}

// ── Connect Azure account ──
export async function connectAzureAccount(
  organizationId: string,
  name: string,
  credentials: AzureCredentials
): Promise<CloudAccount> {
  const { data: encryptedCreds, error: rpcError } = await supabase
    .rpc("encrypt_cloud_credentials", { creds: credentials });
  if (rpcError) throw rpcError;

  const { data, error } = await (supabase
    .from("cloud_accounts") as any)
    .insert({
      organization_id: organizationId,
      provider: "azure",
      account_name: name,
      account_identifier: credentials.subscription_id,
      credentials_encrypted: encryptedCreds,
      status: "pending",
      metadata: { tenant_id: credentials.tenant_id },
    })
    .select("id, organization_id, provider, account_name, account_identifier, status, last_scan_at, risk_score, metadata, created_at, updated_at")
    .single();
  if (error) throw error;
  return data as CloudAccount;
}

// ── Connect GCP account ──
export async function connectGCPAccount(
  organizationId: string,
  name: string,
  credentials: GCPCredentials
): Promise<CloudAccount> {
  const { data: encryptedCreds, error: rpcError } = await supabase
    .rpc("encrypt_cloud_credentials", { creds: credentials });
  if (rpcError) throw rpcError;

  const { data, error } = await (supabase
    .from("cloud_accounts") as any)
    .insert({
      organization_id: organizationId,
      provider: "gcp",
      account_name: name,
      account_identifier: credentials.project_id,
      credentials_encrypted: encryptedCreds,
      status: "pending",
      metadata: { project_id: credentials.project_id },
    })
    .select("id, organization_id, provider, account_name, account_identifier, status, last_scan_at, risk_score, metadata, created_at, updated_at")
    .single();
  if (error) throw error;
  return data as CloudAccount;
}

// ── Delete cloud account ──
export async function deleteCloudAccount(accountId: string): Promise<void> {
  const { error } = await (supabase
    .from("cloud_accounts") as any)
    .delete()
    .eq("id", accountId);
  if (error) throw error;
}

// ── Run multi-cloud discovery ──
export async function runMultiCloudDiscovery(cloudAccountId: string) {
  // 1. Run discovery
  const { data: discoveryData, error: discoveryError } = await supabase.functions.invoke("multi-cloud-discovery", {
    body: { cloud_account_id: cloudAccountId },
  });
  if (discoveryError) throw new Error(`Discovery failed: ${discoveryError.message}`);
  if (!discoveryData?.success) throw new Error(discoveryData?.error || "Discovery returned unsuccessful");

  // 2. Fetch the account provider to call the correct security scanner
  const { data: account, error: accError } = await (supabase
    .from("cloud_accounts") as any)
    .select("provider")
    .eq("id", cloudAccountId)
    .single();

  if (!accError && account) {
    const provider = account.provider;
    console.log(`Discovery successful. Triggering security scanner for ${provider}...`);
    const { data: scanData, error: scanError } = await supabase.functions.invoke(`${provider}-scanner`, {
      body: { cloud_account_id: cloudAccountId },
    });
    if (scanError) {
      console.error(`Security scanner failed: ${scanError.message}`);
      throw new Error(`Security scanner error: ${scanError.message}`);
    } else if (scanData && scanData.success === false) {
      console.error(`Security scanner execution failed: ${scanData.error}`);
      throw new Error(`Security scan failed: ${scanData.error || "Unknown scan failure"}`);
    } else {
      console.log(`Security scanner completed successfully for ${provider}`, scanData);
    }
  }

  return discoveryData;
}

// ── Get asset counts by provider ──
export async function getAssetCountsByProvider(): Promise<Record<CloudProvider, number>> {
  const counts: Record<CloudProvider, number> = { aws: 0, azure: 0, gcp: 0 };

  for (const provider of ["aws", "azure", "gcp"] as CloudProvider[]) {
    const { count, error } = await supabase
      .from("cloud_assets")
      .select("*", { count: "exact", head: true })
      .eq("provider", provider);
    if (!error && count !== null) counts[provider] = count;
  }
  return counts;
}
