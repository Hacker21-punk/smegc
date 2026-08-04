import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { z } from "https://esm.sh/zod@3.22.4";
import { createAdminClient } from "../_shared/org-guard.ts";
import { getCorsHeaders } from "../_shared/cors.ts";


const RequestSchema = z.object({
  aws_account_id: z.string().uuid(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: getCorsHeaders(req) });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });

  try {
    // 1. Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    const userId = claimsData?.claims?.sub as string | undefined;
    if (claimsErr || !userId) return json({ error: "Unauthorized" }, 401);

    // 2. Validate input
    const parsed = RequestSchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Invalid request" }, 400);

    const admin = createAdminClient();

    // 3. Authorize: must be an admin of the organization owning the account
    const [{ data: profile }, { data: roles }, { data: account }] = await Promise.all([
      admin.from("profiles").select("organization_id").eq("id", userId).maybeSingle(),
      admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin"),
      admin
        .from("aws_accounts")
        .select("id, organization_id, external_id, role_arn")
        .eq("id", parsed.data.aws_account_id)
        .maybeSingle(),
    ]);

    if (!account) return json({ error: "Account not found" }, 404);
    if (!profile?.organization_id || profile.organization_id !== account.organization_id) {
      return json({ error: "Forbidden" }, 403);
    }
    if (!roles || roles.length === 0) {
      return json({ error: "Only organization admins can view connection secrets" }, 403);
    }

    return json({ external_id: account.external_id, role_arn: account.role_arn });
  } catch (err) {
    console.error("aws-account-secrets error:", err);
    return json({ error: "Unexpected error" }, 500);
  }
});
