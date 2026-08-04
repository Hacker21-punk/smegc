import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { z } from "https://esm.sh/zod@3.22.4";
import { assertCloudAccountAccess } from "../_shared/org-guard.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Auth ──
async function validateAuth(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing authorization");
  const token = authHeader.replace("Bearer ", "");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (token === serviceRoleKey) return { isServiceRole: true, userId: undefined };

  const client = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data, error } = await client.auth.getClaims(token);
  if (error || !data?.claims) throw new Error("Invalid JWT");
  return { isServiceRole: false, userId: data.claims.sub as string };
}

// ── Common Asset Interface ──
interface DiscoveredAsset {
  organization_id: string;
  provider: "aws" | "azure" | "gcp";
  resource_type: string;
  resource_id: string;
  resource_name: string | null;
  region: string | null;
  status: "active" | "inactive" | "unknown";
  risk_score: number;
  metadata: Record<string, unknown>;
  tags: Record<string, unknown>;
  generic_cloud_account_id: string;
}

// ── Provider Adapter Interface ──
interface ProviderAdapter {
  discoverCompute(orgId: string, accountId: string, credentials: Record<string, string>): Promise<DiscoveredAsset[]>;
  discoverStorage(orgId: string, accountId: string, credentials: Record<string, string>): Promise<DiscoveredAsset[]>;
  discoverDatabases(orgId: string, accountId: string, credentials: Record<string, string>): Promise<DiscoveredAsset[]>;
  discoverIdentity(orgId: string, accountId: string, credentials: Record<string, string>): Promise<DiscoveredAsset[]>;
  discoverNetworking(orgId: string, accountId: string, credentials: Record<string, string>): Promise<DiscoveredAsset[]>;
  discoverSecurity(orgId: string, accountId: string, credentials: Record<string, string>): Promise<DiscoveredAsset[]>;
}

// ── Azure Adapter ──
class AzureAdapter implements ProviderAdapter {
  private baseUrl = "https://management.azure.com";

  private async getAccessToken(creds: Record<string, string>): Promise<string> {
    const tokenUrl = `https://login.microsoftonline.com/${creds.tenant_id}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: creds.client_id,
      client_secret: creds.client_secret,
      scope: "https://management.azure.com/.default",
    });
    const resp = await fetch(tokenUrl, { method: "POST", body });
    const data = await resp.json();
    if (!data.access_token) throw new Error("Azure auth failed: " + (data.error_description || "unknown"));
    return data.access_token;
  }

  private async azureGet(token: string, path: string): Promise<any> {
    const resp = await fetch(`${this.baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (!resp.ok) {
      console.log(`Azure API error ${resp.status} for ${path}`);
      return { value: [] };
    }
    return resp.json();
  }

  async discoverCompute(orgId: string, accountId: string, creds: Record<string, string>): Promise<DiscoveredAsset[]> {
    const assets: DiscoveredAsset[] = [];
    try {
      const token = await this.getAccessToken(creds);
      const data = await this.azureGet(token,
        `/subscriptions/${creds.subscription_id}/providers/Microsoft.Compute/virtualMachines?api-version=2024-03-01`
      );
      for (const vm of data.value || []) {
        assets.push({
          organization_id: orgId,
          provider: "azure",
          resource_type: "compute",
          resource_id: vm.id,
          resource_name: vm.name,
          region: vm.location,
          status: "active",
          risk_score: 20,
          metadata: {
            vm_size: vm.properties?.hardwareProfile?.vmSize,
            os_type: vm.properties?.storageProfile?.osDisk?.osType,
            provisioning_state: vm.properties?.provisioningState,
          },
          tags: vm.tags || {},
          generic_cloud_account_id: accountId,
        });
      }
    } catch (e) { console.log("Azure compute discovery error:", e); }
    return assets;
  }

  async discoverStorage(orgId: string, accountId: string, creds: Record<string, string>): Promise<DiscoveredAsset[]> {
    const assets: DiscoveredAsset[] = [];
    try {
      const token = await this.getAccessToken(creds);
      const data = await this.azureGet(token,
        `/subscriptions/${creds.subscription_id}/providers/Microsoft.Storage/storageAccounts?api-version=2023-01-01`
      );
      for (const sa of data.value || []) {
        const allowBlobPublicAccess = sa.properties?.allowBlobPublicAccess ?? false;
        assets.push({
          organization_id: orgId,
          provider: "azure",
          resource_type: "storage",
          resource_id: sa.id,
          resource_name: sa.name,
          region: sa.location,
          status: "active",
          risk_score: allowBlobPublicAccess ? 55 : 10,
          metadata: {
            kind: sa.kind,
            sku: sa.sku?.name,
            allow_blob_public_access: allowBlobPublicAccess,
            https_only: sa.properties?.supportsHttpsTrafficOnly,
            encryption: sa.properties?.encryption,
          },
          tags: sa.tags || {},
          generic_cloud_account_id: accountId,
        });
      }
    } catch (e) { console.log("Azure storage discovery error:", e); }
    return assets;
  }

  async discoverDatabases(orgId: string, accountId: string, creds: Record<string, string>): Promise<DiscoveredAsset[]> {
    const assets: DiscoveredAsset[] = [];
    try {
      const token = await this.getAccessToken(creds);
      const data = await this.azureGet(token,
        `/subscriptions/${creds.subscription_id}/providers/Microsoft.Sql/servers?api-version=2023-05-01-preview`
      );
      for (const server of data.value || []) {
        assets.push({
          organization_id: orgId,
          provider: "azure",
          resource_type: "database",
          resource_id: server.id,
          resource_name: server.name,
          region: server.location,
          status: "active",
          risk_score: 25,
          metadata: {
            fqdn: server.properties?.fullyQualifiedDomainName,
            admin_login: server.properties?.administratorLogin,
            state: server.properties?.state,
            public_network_access: server.properties?.publicNetworkAccess,
          },
          tags: server.tags || {},
          generic_cloud_account_id: accountId,
        });
      }
    } catch (e) { console.log("Azure database discovery error:", e); }
    return assets;
  }

  async discoverIdentity(orgId: string, accountId: string, creds: Record<string, string>): Promise<DiscoveredAsset[]> {
    const assets: DiscoveredAsset[] = [];
    try {
      // Use Microsoft Graph API for AAD
      const tokenUrl = `https://login.microsoftonline.com/${creds.tenant_id}/oauth2/v2.0/token`;
      const body = new URLSearchParams({
        grant_type: "client_credentials",
        client_id: creds.client_id,
        client_secret: creds.client_secret,
        scope: "https://graph.microsoft.com/.default",
      });
      const resp = await fetch(tokenUrl, { method: "POST", body });
      const tokenData = await resp.json();
      if (!tokenData.access_token) return assets;

      // Get users
      const usersResp = await fetch("https://graph.microsoft.com/v1.0/users?$top=100", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const usersData = await usersResp.json();
      for (const user of usersData.value || []) {
        assets.push({
          organization_id: orgId,
          provider: "azure",
          resource_type: "identity",
          resource_id: user.id,
          resource_name: user.displayName,
          region: "global",
          status: user.accountEnabled ? "active" : "inactive",
          risk_score: 15,
          metadata: {
            user_principal_name: user.userPrincipalName,
            mail: user.mail,
            account_enabled: user.accountEnabled,
          },
          tags: {},
          generic_cloud_account_id: accountId,
        });
      }
    } catch (e) { console.log("Azure identity discovery error:", e); }
    return assets;
  }

  async discoverNetworking(orgId: string, accountId: string, creds: Record<string, string>): Promise<DiscoveredAsset[]> {
    const assets: DiscoveredAsset[] = [];
    try {
      const token = await this.getAccessToken(creds);
      // VNets
      const vnets = await this.azureGet(token,
        `/subscriptions/${creds.subscription_id}/providers/Microsoft.Network/virtualNetworks?api-version=2023-09-01`
      );
      for (const vnet of vnets.value || []) {
        assets.push({
          organization_id: orgId,
          provider: "azure",
          resource_type: "networking",
          resource_id: vnet.id,
          resource_name: vnet.name,
          region: vnet.location,
          status: "active",
          risk_score: 10,
          metadata: {
            address_space: vnet.properties?.addressSpace?.addressPrefixes,
            subnets_count: vnet.properties?.subnets?.length || 0,
          },
          tags: vnet.tags || {},
          generic_cloud_account_id: accountId,
        });
      }
      // Public IPs
      const pips = await this.azureGet(token,
        `/subscriptions/${creds.subscription_id}/providers/Microsoft.Network/publicIPAddresses?api-version=2023-09-01`
      );
      for (const pip of pips.value || []) {
        assets.push({
          organization_id: orgId,
          provider: "azure",
          resource_type: "networking",
          resource_id: pip.id,
          resource_name: pip.name,
          region: pip.location,
          status: "active",
          risk_score: 30,
          metadata: {
            ip_address: pip.properties?.ipAddress,
            allocation_method: pip.properties?.publicIPAllocationMethod,
          },
          tags: pip.tags || {},
          generic_cloud_account_id: accountId,
        });
      }
    } catch (e) { console.log("Azure networking discovery error:", e); }
    return assets;
  }

  async discoverSecurity(orgId: string, accountId: string, creds: Record<string, string>): Promise<DiscoveredAsset[]> {
    const assets: DiscoveredAsset[] = [];
    try {
      const token = await this.getAccessToken(creds);
      const nsgs = await this.azureGet(token,
        `/subscriptions/${creds.subscription_id}/providers/Microsoft.Network/networkSecurityGroups?api-version=2023-09-01`
      );
      for (const nsg of nsgs.value || []) {
        const hasOpenInbound = nsg.properties?.securityRules?.some(
          (r: any) => r.properties?.access === "Allow" && r.properties?.direction === "Inbound" &&
            (r.properties?.sourceAddressPrefix === "*" || r.properties?.sourceAddressPrefix === "0.0.0.0/0")
        );
        assets.push({
          organization_id: orgId,
          provider: "azure",
          resource_type: "security",
          resource_id: nsg.id,
          resource_name: nsg.name,
          region: nsg.location,
          status: "active",
          risk_score: hasOpenInbound ? 45 : 10,
          metadata: {
            rules_count: nsg.properties?.securityRules?.length || 0,
            has_open_inbound: hasOpenInbound,
          },
          tags: nsg.tags || {},
          generic_cloud_account_id: accountId,
        });
      }
    } catch (e) { console.log("Azure security discovery error:", e); }
    return assets;
  }
}

// ── GCP Adapter ──
class GCPAdapter implements ProviderAdapter {
  private async getAccessToken(creds: Record<string, string>): Promise<string> {
    // Use service account key to get access token via JWT
    const key = JSON.parse(creds.service_account_key);
    const now = Math.floor(Date.now() / 1000);
    const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const payload = btoa(JSON.stringify({
      iss: key.client_email,
      scope: "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/compute.readonly https://www.googleapis.com/auth/devstorage.read_only https://www.googleapis.com/auth/sqlservice.admin https://www.googleapis.com/auth/iam",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }));

    // Import private key and sign JWT
    const pemContents = key.private_key.replace(/-----BEGIN PRIVATE KEY-----\n?/, "").replace(/\n?-----END PRIVATE KEY-----\n?/, "").replace(/\n/g, "");
    const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8", binaryDer, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
    );
    const signatureInput = new TextEncoder().encode(`${header}.${payload}`);
    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, signatureInput);
    const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    const jwt = `${header}.${payload}.${sig}`;
    const resp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });
    const data = await resp.json();
    if (!data.access_token) throw new Error("GCP auth failed: " + (data.error_description || JSON.stringify(data)));
    return data.access_token;
  }

  private async gcpGet(token: string, url: string): Promise<any> {
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) {
      console.log(`GCP API error ${resp.status} for ${url}`);
      return { items: [] };
    }
    return resp.json();
  }

  async discoverCompute(orgId: string, accountId: string, creds: Record<string, string>): Promise<DiscoveredAsset[]> {
    const assets: DiscoveredAsset[] = [];
    try {
      const token = await this.getAccessToken(creds);
      const data = await this.gcpGet(token,
        `https://compute.googleapis.com/compute/v1/projects/${creds.project_id}/aggregated/instances`
      );
      for (const [zone, scopeData] of Object.entries(data.items || {})) {
        for (const inst of (scopeData as any).instances || []) {
          const hasExternalIp = inst.networkInterfaces?.some(
            (ni: any) => ni.accessConfigs?.some((ac: any) => ac.natIP)
          );
          const region = zone.replace(/.*\/zones\//, "").replace(/-[a-z]$/, "");
          assets.push({
            organization_id: orgId,
            provider: "gcp",
            resource_type: "compute",
            resource_id: `${inst.id}`,
            resource_name: inst.name,
            region,
            status: inst.status === "RUNNING" ? "active" : "inactive",
            risk_score: hasExternalIp ? 30 : 10,
            metadata: {
              machine_type: inst.machineType?.split("/").pop(),
              status: inst.status,
              zone: zone.replace(/.*\/zones\//, ""),
              has_external_ip: hasExternalIp,
              network: inst.networkInterfaces?.[0]?.network?.split("/").pop(),
            },
            tags: {},
            generic_cloud_account_id: accountId,
          });
        }
      }
    } catch (e) { console.log("GCP compute discovery error:", e); }
    return assets;
  }

  async discoverStorage(orgId: string, accountId: string, creds: Record<string, string>): Promise<DiscoveredAsset[]> {
    const assets: DiscoveredAsset[] = [];
    try {
      const token = await this.getAccessToken(creds);
      const data = await this.gcpGet(token,
        `https://storage.googleapis.com/storage/v1/b?project=${creds.project_id}`
      );
      for (const bucket of data.items || []) {
        const isPublic = bucket.iamConfiguration?.publicAccessPrevention !== "enforced";
        assets.push({
          organization_id: orgId,
          provider: "gcp",
          resource_type: "storage",
          resource_id: bucket.id,
          resource_name: bucket.name,
          region: bucket.location?.toLowerCase() || "us",
          status: "active",
          risk_score: isPublic ? 50 : 5,
          metadata: {
            storage_class: bucket.storageClass,
            location_type: bucket.locationType,
            public_access_prevention: bucket.iamConfiguration?.publicAccessPrevention,
            versioning: bucket.versioning?.enabled,
            encryption: bucket.encryption,
          },
          tags: bucket.labels || {},
          generic_cloud_account_id: accountId,
        });
      }
    } catch (e) { console.log("GCP storage discovery error:", e); }
    return assets;
  }

  async discoverDatabases(orgId: string, accountId: string, creds: Record<string, string>): Promise<DiscoveredAsset[]> {
    const assets: DiscoveredAsset[] = [];
    try {
      const token = await this.getAccessToken(creds);
      const data = await this.gcpGet(token,
        `https://sqladmin.googleapis.com/v1/projects/${creds.project_id}/instances`
      );
      for (const db of data.items || []) {
        const hasPublicIp = db.ipAddresses?.some((ip: any) => ip.type === "PRIMARY");
        assets.push({
          organization_id: orgId,
          provider: "gcp",
          resource_type: "database",
          resource_id: db.name,
          resource_name: db.name,
          region: db.region || "unknown",
          status: db.state === "RUNNABLE" ? "active" : "inactive",
          risk_score: hasPublicIp ? 45 : 10,
          metadata: {
            database_version: db.databaseVersion,
            tier: db.settings?.tier,
            has_public_ip: hasPublicIp,
            backup_enabled: db.settings?.backupConfiguration?.enabled,
            ssl_required: db.settings?.ipConfiguration?.requireSsl,
          },
          tags: db.settings?.userLabels || {},
          generic_cloud_account_id: accountId,
        });
      }
    } catch (e) { console.log("GCP database discovery error:", e); }
    return assets;
  }

  async discoverIdentity(orgId: string, accountId: string, creds: Record<string, string>): Promise<DiscoveredAsset[]> {
    const assets: DiscoveredAsset[] = [];
    try {
      const token = await this.getAccessToken(creds);
      const data = await this.gcpGet(token,
        `https://iam.googleapis.com/v1/projects/${creds.project_id}/serviceAccounts`
      );
      for (const sa of data.accounts || []) {
        assets.push({
          organization_id: orgId,
          provider: "gcp",
          resource_type: "identity",
          resource_id: sa.uniqueId,
          resource_name: sa.displayName || sa.email,
          region: "global",
          status: sa.disabled ? "inactive" : "active",
          risk_score: 15,
          metadata: {
            email: sa.email,
            disabled: sa.disabled,
          },
          tags: {},
          generic_cloud_account_id: accountId,
        });
      }
    } catch (e) { console.log("GCP identity discovery error:", e); }
    return assets;
  }

  async discoverNetworking(orgId: string, accountId: string, creds: Record<string, string>): Promise<DiscoveredAsset[]> {
    const assets: DiscoveredAsset[] = [];
    try {
      const token = await this.getAccessToken(creds);
      const data = await this.gcpGet(token,
        `https://compute.googleapis.com/compute/v1/projects/${creds.project_id}/global/networks`
      );
      for (const net of data.items || []) {
        assets.push({
          organization_id: orgId,
          provider: "gcp",
          resource_type: "networking",
          resource_id: `${net.id}`,
          resource_name: net.name,
          region: "global",
          status: "active",
          risk_score: 10,
          metadata: {
            auto_create_subnetworks: net.autoCreateSubnetworks,
            routing_mode: net.routingConfig?.routingMode,
            subnetworks_count: net.subnetworks?.length || 0,
          },
          tags: {},
          generic_cloud_account_id: accountId,
        });
      }
    } catch (e) { console.log("GCP networking discovery error:", e); }
    return assets;
  }

  async discoverSecurity(orgId: string, accountId: string, creds: Record<string, string>): Promise<DiscoveredAsset[]> {
    const assets: DiscoveredAsset[] = [];
    try {
      const token = await this.getAccessToken(creds);
      const data = await this.gcpGet(token,
        `https://compute.googleapis.com/compute/v1/projects/${creds.project_id}/global/firewalls`
      );
      for (const fw of data.items || []) {
        const allowsAll = fw.sourceRanges?.includes("0.0.0.0/0") && fw.direction === "INGRESS";
        assets.push({
          organization_id: orgId,
          provider: "gcp",
          resource_type: "security",
          resource_id: `${fw.id}`,
          resource_name: fw.name,
          region: "global",
          status: fw.disabled ? "inactive" : "active",
          risk_score: allowsAll ? 50 : 10,
          metadata: {
            direction: fw.direction,
            source_ranges: fw.sourceRanges,
            allowed: fw.allowed,
            denied: fw.denied,
            priority: fw.priority,
            network: fw.network?.split("/").pop(),
          },
          tags: {},
          generic_cloud_account_id: accountId,
        });
      }
    } catch (e) { console.log("GCP security discovery error:", e); }
    return assets;
  }
}

// ── Adapter Factory ──
function getAdapter(provider: string): ProviderAdapter {
  switch (provider) {
    case "azure": return new AzureAdapter();
    case "gcp": return new GCPAdapter();
    default: throw new Error(`Provider ${provider} not supported by multi-cloud discovery. Use asset-discovery for AWS.`);
  }
}

// ── Request Schema ──
const RequestSchema = z.object({
  cloud_account_id: z.string().uuid(),
});

// ── Main Handler ──
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authResult = await validateAuth(req);

    const body = await req.json();
    const { cloud_account_id } = RequestSchema.parse(body);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Authorization: the account must belong to the caller's organization.
    try {
      await assertCloudAccountAccess(supabase, authResult, cloud_account_id);
    } catch (authError) {
      console.error("Authorization failed:", authError);
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get cloud account
    const { data: account, error: accErr } = await supabase
      .from("cloud_accounts")
      .select("*")
      .eq("id", cloud_account_id)
      .single();
    if (accErr || !account) throw new Error("Cloud account not found");

    const adapter = getAdapter(account.provider);
    const orgId = account.organization_id;

    // Decrypt credentials
    const { data: decryptedCreds, error: decryptErr } = await supabase
      .rpc("decrypt_cloud_credentials", { encrypted: account.credentials_encrypted });
    if (decryptErr || !decryptedCreds) {
      throw new Error(`Failed to decrypt cloud credentials: ${decryptErr?.message || "unknown error"}`);
    }
    const creds = decryptedCreds as Record<string, string>;

    // Run all discovery functions in parallel
    const [compute, storage, databases, identity, networking, security] = await Promise.all([
      adapter.discoverCompute(orgId, cloud_account_id, creds),
      adapter.discoverStorage(orgId, cloud_account_id, creds),
      adapter.discoverDatabases(orgId, cloud_account_id, creds),
      adapter.discoverIdentity(orgId, cloud_account_id, creds),
      adapter.discoverNetworking(orgId, cloud_account_id, creds),
      adapter.discoverSecurity(orgId, cloud_account_id, creds),
    ]);

    const allAssets = [...compute, ...storage, ...databases, ...identity, ...networking, ...security];

    // Upsert assets into cloud_assets table
    const batchSize = 50;
    let upsertedCount = 0;
    for (let i = 0; i < allAssets.length; i += batchSize) {
      const batch = allAssets.slice(i, i + batchSize);
      const { error } = await supabase
        .from("cloud_assets")
        .upsert(
          batch.map((a) => ({
            organization_id: a.organization_id,
            provider: a.provider,
            resource_type: a.resource_type,
            resource_id: a.resource_id,
            resource_name: a.resource_name,
            region: a.region,
            status: a.status,
            risk_score: a.risk_score,
            metadata: a.metadata,
            tags: a.tags,
            generic_cloud_account_id: a.generic_cloud_account_id,
            last_seen_at: new Date().toISOString(),
          })),
          { onConflict: "organization_id,provider,resource_id" }
        );
      if (error) {
        console.error("Upsert batch error:", error);
      } else {
        upsertedCount += batch.length;
      }
    }

    // Update last scan
    await supabase
      .from("cloud_accounts")
      .update({ last_scan_at: new Date().toISOString(), status: "connected" })
      .eq("id", cloud_account_id);

    return new Response(
      JSON.stringify({
        success: true,
        provider: account.provider,
        discovered: {
          total: allAssets.length,
          compute: compute.length,
          storage: storage.length,
          databases: databases.length,
          identity: identity.length,
          networking: networking.length,
          security: security.length,
        },
        upserted: upsertedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Multi-cloud discovery error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
