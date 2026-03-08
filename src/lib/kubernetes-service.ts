import { supabase } from "@/integrations/supabase/client";

export interface KubernetesCluster {
  id: string;
  organization_id: string;
  cloud_account_id: string | null;
  aws_account_id: string | null;
  provider: string;
  cluster_name: string;
  cluster_type: string;
  region: string | null;
  version: string | null;
  node_count: number;
  network_mode: string | null;
  endpoint: string | null;
  status: string;
  risk_score: number;
  metadata: Record<string, unknown>;
  last_scan_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface KubernetesResource {
  id: string;
  organization_id: string;
  cluster_id: string;
  resource_kind: string;
  resource_name: string;
  namespace: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  spec: Record<string, unknown>;
  status: string;
  risk_score: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface KubernetesFinding {
  id: string;
  organization_id: string;
  cluster_id: string;
  resource_id: string | null;
  severity: string;
  category: string;
  title: string;
  description: string | null;
  resource_kind: string | null;
  resource_name: string | null;
  namespace: string | null;
  remediation_steps: string[];
  is_resolved: boolean;
  resolved_at: string | null;
  risk_score_contribution: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export async function fetchKubernetesClusters(): Promise<KubernetesCluster[]> {
  const { data, error } = await (supabase.from("kubernetes_clusters") as any)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as KubernetesCluster[]) || [];
}

export async function fetchKubernetesResources(clusterId?: string): Promise<KubernetesResource[]> {
  let query = (supabase.from("kubernetes_resources") as any).select("*");
  if (clusterId) query = query.eq("cluster_id", clusterId);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return (data as KubernetesResource[]) || [];
}

export async function fetchKubernetesFindings(clusterId?: string): Promise<KubernetesFinding[]> {
  let query = (supabase.from("kubernetes_findings") as any).select("*");
  if (clusterId) query = query.eq("cluster_id", clusterId);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return (data as KubernetesFinding[]) || [];
}

export async function discoverKubernetesClusters() {
  const { data, error } = await supabase.functions.invoke("kubernetes-scanner", {
    body: { action: "discover_clusters" },
  });
  if (error) throw new Error(`Discovery failed: ${error.message}`);
  if (!data?.success) throw new Error(data?.error || "Discovery failed");
  return data;
}

export async function scanKubernetesCluster(clusterId: string) {
  const { data, error } = await supabase.functions.invoke("kubernetes-scanner", {
    body: { action: "scan_cluster", cluster_id: clusterId },
  });
  if (error) throw new Error(`Scan failed: ${error.message}`);
  if (!data?.success) throw new Error(data?.error || "Scan failed");
  return data;
}

export async function resolveKubernetesFinding(findingId: string) {
  const { error } = await (supabase.from("kubernetes_findings") as any)
    .update({ is_resolved: true, resolved_at: new Date().toISOString() })
    .eq("id", findingId);
  if (error) throw error;
}
