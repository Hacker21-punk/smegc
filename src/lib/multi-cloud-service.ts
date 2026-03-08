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
  const { data, error } = await supabase
    .from("cloud_accounts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as CloudAccount[]) || [];
}

// ── Connect Azure account ──
export async function connectAzureAccount(
  organizationId: string,
  name: string,
  credentials: AzureCredentials
): Promise<CloudAccount> {
  const { data, error } = await supabase
    .from("cloud_accounts")
    .insert({
      organization_id: organizationId,
      provider: "azure" as const,
      account_name: name,
      account_identifier: credentials.subscription_id,
      credentials_encrypted: credentials,
      status: "pending" as const,
      metadata: { tenant_id: credentials.tenant_id },
    })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as CloudAccount;
}

// ── Connect GCP account ──
export async function connectGCPAccount(
  organizationId: string,
  name: string,
  credentials: GCPCredentials
): Promise<CloudAccount> {
  const { data, error } = await supabase
    .from("cloud_accounts")
    .insert({
      organization_id: organizationId,
      provider: "gcp" as const,
      account_name: name,
      account_identifier: credentials.project_id,
      credentials_encrypted: credentials,
      status: "pending" as const,
      metadata: { project_id: credentials.project_id },
    })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as CloudAccount;
}

// ── Delete cloud account ──
export async function deleteCloudAccount(accountId: string): Promise<void> {
  const { error } = await supabase
    .from("cloud_accounts")
    .delete()
    .eq("id", accountId);
  if (error) throw error;
}

// ── Run multi-cloud discovery ──
export async function runMultiCloudDiscovery(cloudAccountId: string) {
  const { data, error } = await supabase.functions.invoke("multi-cloud-discovery", {
    body: { cloud_account_id: cloudAccountId },
  });
  if (error) throw new Error(`Discovery failed: ${error.message}`);
  if (!data?.success) throw new Error(data?.error || "Discovery returned unsuccessful");
  return data;
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
