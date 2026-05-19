import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AttackPath, AttackPathNode } from "@/components/dashboard/attack-paths/AttackPathVisualization";

// Map DB node_type to UI type
function mapNodeType(nodeType: string): AttackPathNode["type"] {
  const map: Record<string, AttackPathNode["type"]> = {
    external_internet: "entry",
    internet_gateway: "entry",
    load_balancer: "network",
    ec2_instance: "compute",
    lambda_function: "compute",
    ecs_cluster: "compute",
    eks_cluster: "compute",
    iam_user: "identity",
    iam_role: "identity",
    iam_group: "identity",
    iam_policy: "identity",
    s3_bucket: "storage",
    secrets_manager: "storage",
    rds_instance: "database",
    security_group: "network",
    vpc: "network",
    subnet: "network",
    nat_gateway: "network",
    kms_key: "storage",
  };
  return map[nodeType] ?? "compute";
}

function riskFromScore(score: number | null): "critical" | "high" | "medium" | "low" {
  if (!score) return "low";
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  return "low";
}

// No demo fallback — production-grade. UI renders an empty state when no real data exists.

export function useAttackPaths() {
  return useQuery({
    queryKey: ["attack-paths"],
    queryFn: async (): Promise<AttackPath[]> => {
      // Try fetching real data
      const { data: dbPaths, error } = await supabase
        .from("attack_paths")
        .select("*")
        .eq("status", "active")
        .order("risk_score", { ascending: false });

      if (error || !dbPaths || dbPaths.length === 0) {
        return [];
      }

      // For each path, fetch its steps with node details
      const paths: AttackPath[] = await Promise.all(
        dbPaths.map(async (ap) => {
          const { data: steps } = await supabase
            .from("attack_path_steps")
            .select("*, security_graph_nodes(*)")
            .eq("attack_path_id", ap.id)
            .order("step_order", { ascending: true });

          const nodes: AttackPathNode[] =
            steps?.map((s: any) => {
              const node = s.security_graph_nodes;
              return {
                id: s.id,
                label: node?.resource_name || node?.resource_id || "Unknown",
                type: mapNodeType(node?.node_type || ""),
                risk: riskFromScore(node?.risk_score ?? null),
              };
            }) ?? [];

          // Estimate probability from risk score
          const probability = Math.round(ap.risk_score * 0.25);
          // Estimated loss based on blast radius and risk
          const estimatedLoss = ap.blast_radius * ap.risk_score * 1000;

          return {
            id: ap.id,
            name: ap.title,
            severity: ap.severity as AttackPath["severity"],
            probability,
            estimatedLoss,
            riskScore: ap.risk_score,
            blastRadius: ap.blast_radius,
            pathLength: ap.path_length,
            status: ap.status,
            nodes,
            description: ap.description || "",
          };
        })
      );

      return paths;
    },
    staleTime: 30000,
  });
}

export function useGraphNodes() {
  return useQuery({
    queryKey: ["security-graph-nodes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_graph_nodes")
        .select("*")
        .order("risk_score", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30000,
  });
}

export function useGraphEdges() {
  return useQuery({
    queryKey: ["security-graph-edges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_graph_edges")
        .select("*");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30000,
  });
}
