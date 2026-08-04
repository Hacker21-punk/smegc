// Shared authorization helpers for edge functions that use the service role key.
// These guards prevent BOLA (broken object-level authorization): a caller must
// never be able to act on an organization or cloud account they don't belong to.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

export function createAdminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/** Resolves the organization the authenticated user belongs to. */
export async function getUserOrganizationId(
  admin: SupabaseClient,
  userId: string,
): Promise<string> {
  const { data, error } = await admin
    .from("profiles")
    .select("organization_id")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data?.organization_id) throw new Error("Forbidden");
  return data.organization_id as string;
}

/**
 * Returns the organization id that the request is allowed to operate on.
 * - Service-role callers (internal cron/jobs) may pass an explicit organization_id.
 * - User callers always get their own organization; a mismatching request is rejected.
 */
export async function resolveOrganizationId(
  admin: SupabaseClient,
  auth: { isServiceRole: boolean; userId?: string },
  requestedOrgId?: string | null,
): Promise<string> {
  if (auth.isServiceRole) {
    if (!requestedOrgId) throw new Error("organization_id required");
    return requestedOrgId;
  }
  if (!auth.userId) throw new Error("Forbidden");
  const orgId = await getUserOrganizationId(admin, auth.userId);
  if (requestedOrgId && requestedOrgId !== orgId) throw new Error("Forbidden");
  return orgId;
}

/** Verifies an aws_accounts row belongs to the caller's organization. */
export async function assertAwsAccountAccess(
  admin: SupabaseClient,
  auth: { isServiceRole: boolean; userId?: string },
  awsAccountId: string,
): Promise<{ organizationId: string }> {
  const { data, error } = await admin
    .from("aws_accounts")
    .select("id, organization_id")
    .eq("id", awsAccountId)
    .maybeSingle();
  if (error || !data) throw new Error("Account not found");
  if (!auth.isServiceRole) {
    if (!auth.userId) throw new Error("Forbidden");
    const orgId = await getUserOrganizationId(admin, auth.userId);
    if (orgId !== data.organization_id) throw new Error("Forbidden");
  }
  return { organizationId: data.organization_id as string };
}
