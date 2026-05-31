import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Recent cloud asset changes — used as Config Drift signal.
 * Returns assets whose `updated_at` moved within the lookback window.
 */
export function useConfigDrift(lookbackDays = 30) {
  return useQuery({
    queryKey: ["config-drift", lookbackDays],
    queryFn: async () => {
      const since = new Date(Date.now() - lookbackDays * 86400_000).toISOString();
      const { data, error } = await supabase
        .from("cloud_assets")
        .select("id, resource_id, resource_name, resource_type, provider, region, risk_score, status, metadata, updated_at, created_at")
        .gte("updated_at", since)
        .order("updated_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

/** Identity assets (IAM users/roles/policies) discovered in the org. */
export function useIdentityAssets() {
  return useQuery({
    queryKey: ["identity-assets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cloud_assets")
        .select("id, resource_id, resource_name, resource_type, provider, region, risk_score, metadata, updated_at")
        .eq("resource_type", "identity")
        .order("risk_score", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

/** Risky edges in the security graph (privilege escalation, public exposure, etc). */
export function useRiskyEdges() {
  return useQuery({
    queryKey: ["risky-edges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_graph_edges")
        .select("id, edge_type, weight, is_risky, metadata, source_node_id, target_node_id, created_at")
        .eq("is_risky", true)
        .order("weight", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}
