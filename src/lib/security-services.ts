import { supabase } from "@/integrations/supabase/client";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

async function invokeFunction<T>(functionName: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
  });

  if (error) throw new Error(`${functionName} failed: ${error.message}`);
  if (!data?.success) throw new Error(data?.error || `${functionName} returned unsuccessful`);
  return data as T;
}

// ── Asset Discovery ──
export interface AssetDiscoveryResult {
  success: boolean;
  discovered: {
    total: number;
    ec2: number;
    security_groups: number;
    vpcs: number;
    iam: number;
    s3: number;
    rds: number;
  };
  upserted: number;
}

export async function runAssetDiscovery(awsAccountId: string): Promise<AssetDiscoveryResult> {
  return invokeFunction<AssetDiscoveryResult>("asset-discovery", {
    aws_account_id: awsAccountId,
  });
}

// ── Security Graph Builder ──
export interface GraphBuildResult {
  success: boolean;
  graph_summary: {
    total_nodes: number;
    total_edges: number;
    risky_edges: number;
    public_nodes: number;
    sensitive_nodes: number;
    node_types: Record<string, number>;
  };
}

export async function buildSecurityGraph(
  organizationId: string,
  awsAccountId?: string
): Promise<GraphBuildResult> {
  return invokeFunction<GraphBuildResult>("security-graph-builder", {
    organization_id: organizationId,
    ...(awsAccountId && { aws_account_id: awsAccountId }),
  });
}

// ── Attack Path Analyzer ──
export interface AttackPathAnalysisResult {
  success: boolean;
  analysis: {
    total_paths: number;
    severity_breakdown: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    remediations_created: number;
    graph_stats: { nodes: number; edges: number };
    max_risk_score: number;
  };
}

export async function analyzeAttackPaths(
  organizationId: string,
  awsAccountId?: string
): Promise<AttackPathAnalysisResult> {
  return invokeFunction<AttackPathAnalysisResult>("attack-path-analyzer", {
    organization_id: organizationId,
    ...(awsAccountId && { aws_account_id: awsAccountId }),
  });
}

// ── Full Pipeline: Discovery → Graph → Analysis ──
export interface PipelineResult {
  discovery: AssetDiscoveryResult;
  graph: GraphBuildResult;
  analysis: AttackPathAnalysisResult;
}

export async function runFullSecurityPipeline(
  organizationId: string,
  awsAccountId: string
): Promise<PipelineResult> {
  // Step 1: Discover assets
  const discovery = await runAssetDiscovery(awsAccountId);

  // Step 2: Build security graph
  const graph = await buildSecurityGraph(organizationId, awsAccountId);

  // Step 3: Analyze attack paths
  const analysis = await analyzeAttackPaths(organizationId, awsAccountId);

  return { discovery, graph, analysis };
}

// ── Data Queries ──
export async function fetchGraphNodes(organizationId: string) {
  const { data, error } = await supabase
    .from("security_graph_nodes")
    .select("*")
    .eq("organization_id", organizationId)
    .order("risk_score", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchGraphEdges(organizationId: string) {
  const { data, error } = await supabase
    .from("security_graph_edges")
    .select("*")
    .eq("organization_id", organizationId);
  if (error) throw error;
  return data;
}

export async function fetchAttackPaths(organizationId: string) {
  const { data, error } = await supabase
    .from("attack_paths")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("risk_score", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchAttackPathSteps(attackPathId: string) {
  const { data, error } = await supabase
    .from("attack_path_steps")
    .select("*, security_graph_nodes(*)")
    .eq("attack_path_id", attackPathId)
    .order("step_order", { ascending: true });
  if (error) throw error;
  return data;
}

export async function fetchRemediationActions(organizationId: string) {
  const { data, error } = await supabase
    .from("remediation_actions")
    .select("*")
    .eq("organization_id", organizationId)
    .order("priority", { ascending: false });
  if (error) throw error;
  return data;
}
