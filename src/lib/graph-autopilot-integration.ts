import { supabase } from "@/integrations/supabase/client";

/**
 * Graph ↔ Autopilot Integration
 * When critical attack paths are detected, this service:
 * 1. Creates remediation recommendations
 * 2. Notifies the autopilot enforcement engine
 * 3. Updates risk scores on affected assets
 */

export interface AttackPathRemediation {
  attackPathId: string;
  title: string;
  description: string;
  actionType: string;
  priority: number;
}

const REMEDIATION_TEMPLATES: Record<string, { title: string; description: string; actionType: string }> = {
  public_vm: {
    title: "Restrict public access to VM instance",
    description: "Remove public IP or restrict security group ingress rules to block unauthorized access.",
    actionType: "restrict_network_access",
  },
  overpermissioned_iam: {
    title: "Reduce IAM role permissions",
    description: "Apply least-privilege principle by scoping down IAM policies to required actions only.",
    actionType: "restrict_iam_permissions",
  },
  unencrypted_storage: {
    title: "Enable encryption on storage bucket",
    description: "Enable server-side encryption (SSE-S3 or SSE-KMS) on the storage resource.",
    actionType: "enable_encryption",
  },
  exposed_database: {
    title: "Isolate database from public access",
    description: "Move database to private subnet and restrict security group rules.",
    actionType: "isolate_resource",
  },
  public_load_balancer: {
    title: "Review load balancer exposure",
    description: "Ensure WAF rules and TLS are configured on the internet-facing load balancer.",
    actionType: "configure_waf",
  },
};

/**
 * Generates remediation recommendations for a critical attack path.
 */
export function generateRemediationsForPath(
  attackPathId: string,
  nodes: Array<{ node_type: string; is_public: boolean; risk_score: number | null }>
): AttackPathRemediation[] {
  const remediations: AttackPathRemediation[] = [];

  for (const node of nodes) {
    if (node.is_public && ["ec2_instance", "s3_bucket", "rds_instance", "load_balancer"].includes(node.node_type)) {
      const templateKey =
        node.node_type === "ec2_instance" ? "public_vm" :
        node.node_type === "s3_bucket" ? "unencrypted_storage" :
        node.node_type === "rds_instance" ? "exposed_database" :
        "public_load_balancer";

      const template = REMEDIATION_TEMPLATES[templateKey];
      remediations.push({
        attackPathId,
        ...template,
        priority: Math.min(100, (node.risk_score ?? 50) + 20),
      });
    }

    if (["iam_role", "iam_user"].includes(node.node_type) && (node.risk_score ?? 0) > 60) {
      remediations.push({
        attackPathId,
        ...REMEDIATION_TEMPLATES.overpermissioned_iam,
        priority: Math.min(100, (node.risk_score ?? 50) + 10),
      });
    }
  }

  return remediations;
}

/**
 * Persists remediation recommendations to the database.
 */
export async function persistRemediations(
  organizationId: string,
  remediations: AttackPathRemediation[]
) {
  if (remediations.length === 0) return [];

  const rows = remediations.map((r) => ({
    organization_id: organizationId,
    attack_path_id: r.attackPathId,
    title: r.title,
    description: r.description,
    action_type: r.actionType,
    priority: r.priority,
    status: "recommended" as const,
    mode: "read_only" as const,
  }));

  const { data, error } = await supabase
    .from("remediation_actions")
    .insert(rows)
    .select();

  if (error) throw error;
  return data;
}

/**
 * Full integration: analyze a critical path and create remediation actions.
 */
export async function processAttackPathForAutopilot(
  organizationId: string,
  attackPathId: string
) {
  // 1. Fetch attack path steps with node details
  const { data: steps, error } = await supabase
    .from("attack_path_steps")
    .select("*, security_graph_nodes(*)")
    .eq("attack_path_id", attackPathId)
    .order("step_order", { ascending: true });

  if (error) throw error;
  if (!steps || steps.length === 0) return [];

  // 2. Extract node data from steps
  const nodes = steps
    .map((s: any) => s.security_graph_nodes)
    .filter(Boolean);

  // 3. Generate remediations
  const remediations = generateRemediationsForPath(attackPathId, nodes);

  // 4. Persist
  return persistRemediations(organizationId, remediations);
}
