import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { z } from "https://esm.sh/zod@3.22.4";
import { resolveOrganizationId, assertAwsAccountAccess } from "../_shared/org-guard.ts";

const RequestSchema = z.object({
  organization_id: z.string().uuid().optional(),
  aws_account_id: z.string().uuid().optional(),
});


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PolicyRule {
  id: string;
  policy_type: string;
  enforcement_mode: string;
  severity: string;
  aws_account_id: string | null;
  asset_filter: Record<string, unknown>;
  evaluation_criteria: Record<string, unknown>;
  remediation_template: Record<string, unknown>;
  organization_id: string;
}

interface Violation {
  organization_id: string;
  policy_id: string;
  aws_account_id: string | null;
  resource_id: string;
  resource_type: string;
  resource_name: string | null;
  resource_arn: string | null;
  region: string | null;
  severity: string;
  violation_details: Record<string, unknown>;
}

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

// ── Policy Evaluators ──
function evaluateNoPublicStorage(node: Record<string, unknown>): boolean {
  return node.node_type === "s3_bucket" && node.is_public === true;
}

function evaluateEncryptionRequired(node: Record<string, unknown>): boolean {
  if (node.node_type === "s3_bucket") {
    const meta = node.metadata as Record<string, unknown> | null;
    return meta?.is_encrypted === false;
  }
  if (node.node_type === "rds_instance") {
    const meta = node.metadata as Record<string, unknown> | null;
    return meta?.storage_encrypted === false;
  }
  return false;
}

function evaluateNoOpenSSH(node: Record<string, unknown>): boolean {
  if (node.node_type !== "security_group") return false;
  const meta = node.metadata as Record<string, unknown> | null;
  const rules = meta?.inbound_rules as Array<Record<string, unknown>> | undefined;
  if (!rules) return false;
  return rules.some((rule) => {
    const port = rule.FromPort as number | undefined;
    const ranges = rule.IpRanges as Array<Record<string, unknown>> | undefined;
    return port === 22 && ranges?.some((r) => r.CidrIp === "0.0.0.0/0");
  });
}

function evaluateNoPublicDatabases(node: Record<string, unknown>): boolean {
  return node.node_type === "rds_instance" && node.is_public === true;
}

function evaluateAdminMFA(node: Record<string, unknown>): boolean {
  if (node.node_type !== "iam_user") return false;
  const meta = node.metadata as Record<string, unknown> | null;
  return meta?.mfa_enabled === false;
}

function evaluatePolicy(policy: PolicyRule, node: Record<string, unknown>): boolean {
  switch (policy.policy_type) {
    case "no_public_storage": return evaluateNoPublicStorage(node);
    case "encryption_required": return evaluateEncryptionRequired(node);
    case "no_open_ssh": return evaluateNoOpenSSH(node);
    case "no_public_databases": return evaluateNoPublicDatabases(node);
    case "admin_mfa_required": return evaluateAdminMFA(node);
    default: return false;
  }
}

function getViolationDetails(policy: PolicyRule, node: Record<string, unknown>): Record<string, unknown> {
  const base = { policy_type: policy.policy_type, node_type: node.node_type };
  switch (policy.policy_type) {
    case "no_public_storage":
      return { ...base, reason: "Storage resource has public access enabled" };
    case "encryption_required":
      return { ...base, reason: "Resource does not have encryption enabled" };
    case "no_open_ssh":
      return { ...base, reason: "Security group allows SSH (port 22) from 0.0.0.0/0" };
    case "no_public_databases":
      return { ...base, reason: "Database is publicly accessible" };
    case "admin_mfa_required":
      return { ...base, reason: "IAM user does not have MFA enabled" };
    default:
      return base;
  }
}

function getRemediationAction(policy: PolicyRule): string {
  switch (policy.policy_type) {
    case "no_public_storage": return "block_public_access";
    case "encryption_required": return "enable_encryption";
    case "no_open_ssh": return "restrict_ssh_ingress";
    case "no_public_databases": return "disable_public_access";
    case "admin_mfa_required": return "enforce_mfa";
    default: return "manual_review";
  }
}

// ── Main Handler ──
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await validateAuth(req);
    const body = await req.json();
    const parsed = RequestSchema.parse(body);
    const aws_account_id = parsed.aws_account_id;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Authorization: never trust a client-supplied organization_id.
    const organization_id = await resolveOrganizationId(supabase, auth, parsed.organization_id);
    if (aws_account_id) {
      const { organizationId } = await assertAwsAccountAccess(supabase, auth, aws_account_id);
      if (organizationId !== organization_id) throw new Error("Forbidden");
    }

    // 1. Fetch enabled policies
    let policyQuery = supabase
      .from("security_policies")
      .select("*")
      .eq("organization_id", organization_id)
      .eq("is_enabled", true);

    const { data: policies, error: polErr } = await policyQuery;
    if (polErr) throw new Error(`Failed to fetch policies: ${polErr.message}`);
    if (!policies || policies.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No enabled policies", violations_found: 0, actions_taken: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch graph nodes (assets)
    let nodeQuery = supabase
      .from("security_graph_nodes")
      .select("*")
      .eq("organization_id", organization_id);

    if (aws_account_id) {
      nodeQuery = nodeQuery.eq("aws_account_id", aws_account_id);
    }

    const { data: nodes, error: nodeErr } = await nodeQuery;
    if (nodeErr) throw new Error(`Failed to fetch nodes: ${nodeErr.message}`);

    // 3. Evaluate policies against nodes
    const newViolations: Violation[] = [];
    const enforcementActions: Array<{
      violation: Violation;
      policy: PolicyRule;
      action_type: string;
    }> = [];

    for (const policy of policies as PolicyRule[]) {
      // Filter nodes by account if policy is account-scoped
      const applicableNodes = (nodes || []).filter((n: Record<string, unknown>) => {
        if (policy.scope === "account" && policy.aws_account_id) {
          return n.aws_account_id === policy.aws_account_id;
        }
        return true;
      });

      for (const node of applicableNodes) {
        const isViolating = evaluatePolicy(policy, node);
        if (!isViolating) continue;

        // Check if violation already exists (dedup)
        const { data: existing } = await supabase
          .from("policy_violations")
          .select("id")
          .eq("policy_id", policy.id)
          .eq("resource_id", node.resource_id as string)
          .in("status", ["open", "remediating"])
          .limit(1);

        if (existing && existing.length > 0) continue;

        const violation: Violation = {
          organization_id,
          policy_id: policy.id,
          aws_account_id: (node.aws_account_id as string) || null,
          resource_id: node.resource_id as string,
          resource_type: node.node_type as string,
          resource_name: (node.resource_name as string) || null,
          resource_arn: (node.resource_arn as string) || null,
          region: (node.region as string) || null,
          severity: policy.severity,
          violation_details: getViolationDetails(policy, node),
        };

        newViolations.push(violation);
        enforcementActions.push({
          violation,
          policy,
          action_type: getRemediationAction(policy),
        });
      }
    }

    // 4. Insert violations
    let violationsInserted = 0;
    if (newViolations.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < newViolations.length; i += batchSize) {
        const batch = newViolations.slice(i, i + batchSize);
        const { error } = await supabase.from("policy_violations").insert(batch);
        if (error) {
          console.error("Violation insert error:", error);
        } else {
          violationsInserted += batch.length;
        }
      }
    }

    // 5. Create enforcement actions
    let actionsCreated = 0;
    let autoRemediationsTriggered = 0;

    // Re-fetch violations with IDs for enforcement actions
    if (violationsInserted > 0) {
      const { data: insertedViolations } = await supabase
        .from("policy_violations")
        .select("id, policy_id, resource_id")
        .eq("organization_id", organization_id)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(violationsInserted);

      for (const action of enforcementActions) {
        const matchedViolation = insertedViolations?.find(
          (v: Record<string, unknown>) =>
            v.policy_id === action.policy.id && v.resource_id === action.violation.resource_id
        );
        if (!matchedViolation) continue;

        const isAutopilot = action.policy.enforcement_mode === "autopilot";

        const { error } = await supabase.from("policy_enforcement_actions").insert({
          organization_id,
          violation_id: matchedViolation.id,
          policy_id: action.policy.id,
          action_type: action.action_type,
          enforcement_mode: action.policy.enforcement_mode,
          status: isAutopilot ? "pending" : "completed",
          execution_details: {
            resource_id: action.violation.resource_id,
            resource_type: action.violation.resource_type,
            recommended_action: action.action_type,
            auto_remediation: isAutopilot,
          },
          result: isAutopilot
            ? {}
            : { recommendation: `Manual action required: ${action.action_type}` },
        });

        if (!error) {
          actionsCreated++;
          if (isAutopilot) autoRemediationsTriggered++;
        }
      }
    }

    // 6. Calculate compliance score
    const { count: totalPolicies } = await supabase
      .from("security_policies")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organization_id)
      .eq("is_enabled", true);

    const { count: openViolations } = await supabase
      .from("policy_violations")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organization_id)
      .eq("status", "open");

    const complianceScore = totalPolicies && totalPolicies > 0
      ? Math.max(0, Math.round(100 - ((openViolations || 0) / totalPolicies) * 20))
      : 100;

    return new Response(
      JSON.stringify({
        success: true,
        evaluation: {
          policies_evaluated: policies.length,
          nodes_scanned: nodes?.length || 0,
          violations_found: violationsInserted,
          actions_created: actionsCreated,
          auto_remediations_triggered: autoRemediationsTriggered,
          compliance_score: complianceScore,
          open_violations: openViolations || 0,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Autopilot engine error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
