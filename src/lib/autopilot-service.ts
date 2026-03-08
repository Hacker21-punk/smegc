import { supabase } from "@/integrations/supabase/client";

// ── Types ──
export interface SecurityPolicy {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  policy_type: string;
  scope: string;
  enforcement_mode: string;
  is_enabled: boolean;
  severity: string;
  aws_account_id: string | null;
  asset_filter: Record<string, unknown>;
  evaluation_criteria: Record<string, unknown>;
  remediation_template: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PolicyViolation {
  id: string;
  organization_id: string;
  policy_id: string;
  aws_account_id: string | null;
  resource_id: string;
  resource_type: string;
  resource_name: string | null;
  resource_arn: string | null;
  region: string | null;
  status: string;
  severity: string;
  violation_details: Record<string, unknown>;
  detected_at: string;
  resolved_at: string | null;
  security_policies?: SecurityPolicy;
}

export interface PolicyEnforcementAction {
  id: string;
  organization_id: string;
  violation_id: string;
  policy_id: string;
  action_type: string;
  enforcement_mode: string;
  status: string;
  execution_details: Record<string, unknown>;
  result: Record<string, unknown>;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface AutopilotEvaluationResult {
  success: boolean;
  evaluation: {
    policies_evaluated: number;
    nodes_scanned: number;
    violations_found: number;
    actions_created: number;
    auto_remediations_triggered: number;
    compliance_score: number;
    open_violations: number;
  };
}

export interface AutopilotStats {
  activePolicies: number;
  openViolations: number;
  fixesToday: number;
  complianceScore: number;
  totalEnforcements: number;
}

// ── Run Autopilot Engine ──
export async function runAutopilotEngine(
  organizationId: string,
  awsAccountId?: string
): Promise<AutopilotEvaluationResult> {
  const { data, error } = await supabase.functions.invoke("security-autopilot-engine", {
    body: { organization_id: organizationId, ...(awsAccountId && { aws_account_id: awsAccountId }) },
  });
  if (error) throw new Error(`Autopilot engine failed: ${error.message}`);
  if (!data?.success) throw new Error(data?.error || "Autopilot engine returned unsuccessful");
  return data as AutopilotEvaluationResult;
}

// ── Fetch Policies ──
export async function fetchPolicies(organizationId: string): Promise<SecurityPolicy[]> {
  const { data, error } = await supabase
    .from("security_policies")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as SecurityPolicy[];
}

// ── Create Policy ──
export async function createPolicy(policy: {
  organization_id: string;
  name: string;
  description?: string;
  policy_type: string;
  scope?: string;
  enforcement_mode?: "advisory" | "autopilot";
  severity?: string;
  aws_account_id?: string;
}): Promise<SecurityPolicy> {
  const { data, error } = await supabase
    .from("security_policies")
    .insert([policy])
    .select()
    .single();
  if (error) throw error;
  return data as unknown as SecurityPolicy;
}

// ── Toggle Policy ──
export async function togglePolicy(policyId: string, enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from("security_policies")
    .update({ is_enabled: enabled })
    .eq("id", policyId);
  if (error) throw error;
}

// ── Update Enforcement Mode ──
export async function updateEnforcementMode(policyId: string, mode: "advisory" | "autopilot"): Promise<void> {
  const { error } = await supabase
    .from("security_policies")
    .update({ enforcement_mode: mode })
    .eq("id", policyId);
  if (error) throw error;
}

// ── Fetch Violations ──
export async function fetchViolations(organizationId: string, status?: string): Promise<PolicyViolation[]> {
  let query = supabase
    .from("policy_violations")
    .select("*, security_policies(*)")
    .eq("organization_id", organizationId)
    .order("detected_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as PolicyViolation[];
}

// ── Fetch Enforcement Actions ──
export async function fetchEnforcementActions(organizationId: string): Promise<PolicyEnforcementAction[]> {
  const { data, error } = await supabase
    .from("policy_enforcement_actions")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as PolicyEnforcementAction[];
}

// ── Fetch Stats ──
export async function fetchAutopilotStats(organizationId: string): Promise<AutopilotStats> {
  const [policiesRes, violationsRes, todayActionsRes, totalActionsRes] = await Promise.all([
    supabase
      .from("security_policies")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("is_enabled", true),
    supabase
      .from("policy_violations")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "open"),
    supabase
      .from("policy_enforcement_actions")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "completed")
      .gte("completed_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    supabase
      .from("policy_enforcement_actions")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "completed"),
  ]);

  const activePolicies = policiesRes.count || 0;
  const openViolations = violationsRes.count || 0;
  const fixesToday = todayActionsRes.count || 0;
  const totalEnforcements = totalActionsRes.count || 0;
  const complianceScore = activePolicies > 0
    ? Math.max(0, Math.round(100 - (openViolations / activePolicies) * 20))
    : 100;

  return { activePolicies, openViolations, fixesToday, complianceScore, totalEnforcements };
}
