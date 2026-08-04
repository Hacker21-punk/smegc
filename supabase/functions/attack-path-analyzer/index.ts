import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { z } from "https://esm.sh/zod@3.22.4";
import { resolveOrganizationId, assertAwsAccountAccess } from "../_shared/org-guard.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

// ── Auth ──
async function validateAuth(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing authorization");
  const token = authHeader.replace("Bearer ", "");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (token === serviceRoleKey) return { isServiceRole: true };

  const client = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data, error } = await client.auth.getClaims(token);
  if (error || !data?.claims) throw new Error("Invalid JWT");
  return { isServiceRole: false, userId: data.claims.sub as string };
}

const RequestSchema = z.object({
  organization_id: z.string().uuid(),
  aws_account_id: z.string().uuid().optional(),
});

// ── Graph Types ──
interface Node {
  id: string;
  node_type: string;
  resource_id: string;
  resource_name: string | null;
  is_public: boolean;
  is_sensitive: boolean;
  risk_score: number;
  metadata: Record<string, unknown>;
}

interface Edge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  edge_type: string;
  weight: number;
  is_risky: boolean;
  metadata: Record<string, unknown>;
}

interface AttackPath {
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  risk_score: number;
  entry_node: Node;
  target_node: Node;
  steps: { node: Node; edge: Edge | null; technique: string; description: string }[];
  blast_radius: number;
}

// ── BFS-based Attack Path Discovery ──
function findAttackPaths(nodes: Node[], edges: Edge[]): AttackPath[] {
  const paths: AttackPath[] = [];

  // Build adjacency list
  const adjacency = new Map<string, { node: Node; edge: Edge }[]>();
  const nodeMap = new Map<string, Node>();

  for (const n of nodes) nodeMap.set(n.id, n);

  for (const e of edges) {
    const list = adjacency.get(e.source_node_id) || [];
    const targetNode = nodeMap.get(e.target_node_id);
    if (targetNode) list.push({ node: targetNode, edge: e });
    adjacency.set(e.source_node_id, list);
  }

  // Find entry points: internet node or any public-facing node
  const entryNodes = nodes.filter(
    (n) => n.node_type === "external_internet" || (n.is_public && ["ec2_instance", "s3_bucket", "rds_instance"].includes(n.node_type))
  );

  // Find targets: sensitive resources
  const targetTypes = new Set(["s3_bucket", "rds_instance", "kms_key", "secrets_manager", "iam_role", "iam_user"]);
  const sensitiveTargets = new Set(
    nodes.filter((n) => n.is_sensitive && targetTypes.has(n.node_type)).map((n) => n.id)
  );

  // BFS from each entry to sensitive targets
  for (const entry of entryNodes) {
    const visited = new Set<string>();
    const queue: { nodeId: string; path: { node: Node; edge: Edge | null }[] }[] = [
      { nodeId: entry.id, path: [{ node: entry, edge: null }] },
    ];

    visited.add(entry.id);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = adjacency.get(current.nodeId) || [];

      for (const { node: neighbor, edge } of neighbors) {
        if (visited.has(neighbor.id)) continue;
        visited.add(neighbor.id);

        const newPath = [...current.path, { node: neighbor, edge }];

        // Found a path to a sensitive target
        if (sensitiveTargets.has(neighbor.id) && newPath.length >= 2) {
          const riskScore = calculatePathRisk(newPath);
          const severity = riskScore >= 80 ? "critical" : riskScore >= 60 ? "high" : riskScore >= 40 ? "medium" : "low";

          const steps = newPath.map((step, i) => ({
            node: step.node,
            edge: step.edge,
            technique: getTechnique(step.node, step.edge, i === 0),
            description: getStepDescription(step.node, step.edge, i === 0),
          }));

          // Calculate blast radius: how many other sensitive nodes are reachable from target
          let blastRadius = 0;
          const targetNeighbors = adjacency.get(neighbor.id) || [];
          for (const tn of targetNeighbors) {
            if (tn.node.is_sensitive) blastRadius++;
          }

          paths.push({
            title: `${entry.resource_name || entry.node_type} → ${neighbor.resource_name || neighbor.node_type}`,
            description: generatePathDescription(newPath),
            severity,
            risk_score: riskScore,
            entry_node: entry,
            target_node: neighbor,
            steps,
            blast_radius: blastRadius,
          });
        }

        // Continue BFS (limit depth to 6 hops)
        if (newPath.length < 6) {
          queue.push({ nodeId: neighbor.id, path: newPath });
        }
      }
    }
  }

  // Sort by risk score descending, limit to top 50
  paths.sort((a, b) => b.risk_score - a.risk_score);
  return paths.slice(0, 50);
}

function calculatePathRisk(path: { node: Node; edge: Edge | null }[]): number {
  let risk = 0;
  for (const step of path) {
    risk += step.node.risk_score * 0.3;
    if (step.edge) {
      risk += step.edge.weight * 3;
      if (step.edge.is_risky) risk += 15;
    }
  }
  // Shorter paths = more dangerous (easier to exploit)
  if (path.length <= 3) risk *= 1.3;
  return Math.min(100, Math.round(risk));
}

function getTechnique(node: Node, edge: Edge | null, isEntry: boolean): string {
  if (isEntry) return "Initial Access";
  const edgeType = edge?.edge_type || "";
  const techniques: Record<string, string> = {
    exposes: "Exploit Public Exposure",
    network_access: "Network Traversal",
    can_assume_role: "Role Assumption",
    trusts: "Trust Exploitation",
    has_permission: "Permission Escalation",
    attached_to: "Lateral Movement",
    contains: "Resource Discovery",
    member_of: "Group Privilege",
  };
  return techniques[edgeType] || "Traversal";
}

function getStepDescription(node: Node, edge: Edge | null, isEntry: boolean): string {
  if (isEntry) return `Entry via ${node.is_public ? "publicly exposed" : ""} ${node.node_type.replace(/_/g, " ")}`;
  const action = edge?.is_risky ? "exploits risky" : "traverses";
  return `${action} ${edge?.edge_type.replace(/_/g, " ")} to reach ${node.node_type.replace(/_/g, " ")} "${node.resource_name || node.resource_id}"`;
}

function generatePathDescription(path: { node: Node; edge: Edge | null }[]): string {
  const entry = path[0]?.node;
  const target = path[path.length - 1]?.node;
  const hopCount = path.length - 1;
  return `An attacker could reach ${target?.node_type.replace(/_/g, " ")} "${target?.resource_name}" from ${entry?.node_type.replace(/_/g, " ")} in ${hopCount} hop${hopCount > 1 ? "s" : ""}, potentially accessing sensitive data.`;
}

// ── Main Handler ──
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: getCorsHeaders(req) });

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

    // Fetch nodes
    let nodesQuery = supabase
      .from("security_graph_nodes")
      .select("id, node_type, resource_id, resource_name, is_public, is_sensitive, risk_score, metadata")
      .eq("organization_id", organization_id);
    if (aws_account_id) nodesQuery = nodesQuery.eq("aws_account_id", aws_account_id);

    const { data: rawNodes, error: nodesErr } = await nodesQuery;
    if (nodesErr) throw new Error(`Failed to fetch nodes: ${nodesErr.message}`);

    // Fetch edges
    let edgesQuery = supabase
      .from("security_graph_edges")
      .select("id, source_node_id, target_node_id, edge_type, weight, is_risky, metadata")
      .eq("organization_id", organization_id);

    const { data: rawEdges, error: edgesErr } = await edgesQuery;
    if (edgesErr) throw new Error(`Failed to fetch edges: ${edgesErr.message}`);

    if (!rawNodes?.length || !rawEdges?.length) {
      return new Response(
        JSON.stringify({ success: true, message: "Insufficient graph data. Run asset discovery and graph builder first.", paths_found: 0 }),
        { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const nodes: Node[] = rawNodes.map((n: any) => ({
      id: n.id,
      node_type: n.node_type,
      resource_id: n.resource_id,
      resource_name: n.resource_name,
      is_public: n.is_public,
      is_sensitive: n.is_sensitive,
      risk_score: n.risk_score || 0,
      metadata: n.metadata || {},
    }));

    const edges: Edge[] = rawEdges.map((e: any) => ({
      id: e.id,
      source_node_id: e.source_node_id,
      target_node_id: e.target_node_id,
      edge_type: e.edge_type,
      weight: e.weight || 1,
      is_risky: e.is_risky || false,
      metadata: e.metadata || {},
    }));

    // Find attack paths
    const attackPaths = findAttackPaths(nodes, edges);

    // Clear old paths for this org/account
    let deleteQuery = supabase.from("attack_paths").delete().eq("organization_id", organization_id);
    if (aws_account_id) deleteQuery = deleteQuery.eq("aws_account_id", aws_account_id);
    await deleteQuery;

    // Insert attack paths and their steps
    let pathsInserted = 0;
    for (const ap of attackPaths) {
      const entryNode = rawNodes.find((n: any) => n.id === ap.entry_node.id);
      const targetNode = rawNodes.find((n: any) => n.id === ap.target_node.id);

      const { data: insertedPath, error: pathErr } = await supabase
        .from("attack_paths")
        .insert({
          organization_id,
          aws_account_id: aws_account_id || null,
          title: ap.title,
          description: ap.description,
          severity: ap.severity,
          status: "active",
          risk_score: ap.risk_score,
          entry_point_node_id: entryNode?.id || null,
          target_node_id: targetNode?.id || null,
          path_length: ap.steps.length,
          blast_radius: ap.blast_radius,
          metadata: {
            techniques: ap.steps.map((s) => s.technique),
            node_types: ap.steps.map((s) => s.node.node_type),
          },
        })
        .select("id")
        .single();

      if (pathErr) {
        console.error("Path insert error:", pathErr);
        continue;
      }

      // Insert steps
      const steps = ap.steps.map((s, i) => ({
        attack_path_id: insertedPath.id,
        node_id: s.node.id,
        edge_id: s.edge?.id || null,
        step_order: i,
        technique: s.technique,
        description: s.description,
        metadata: {},
      }));

      const { error: stepsErr } = await supabase.from("attack_path_steps").insert(steps);
      if (stepsErr) console.error("Steps insert error:", stepsErr);

      pathsInserted++;
    }

    // Generate remediation recommendations for critical/high paths
    const criticalPaths = attackPaths.filter((p) => p.severity === "critical" || p.severity === "high");
    let remediationsCreated = 0;

    for (const cp of criticalPaths.slice(0, 20)) {
      const targetNode = cp.target_node;
      const actionType = getRemediationAction(targetNode, cp);

      const { error: remErr } = await supabase.from("remediation_actions").insert({
        organization_id,
        attack_path_id: null, // Would need the inserted path ID - simplified here
        aws_account_id: aws_account_id || null,
        title: `Mitigate: ${cp.title}`,
        description: actionType.description,
        action_type: actionType.type,
        mode: "read_only",
        status: "recommended",
        priority: cp.risk_score,
        execution_plan: actionType.plan,
        rollback_plan: actionType.rollback,
      });

      if (!remErr) remediationsCreated++;
    }

    // Summary
    const severityCounts = {
      critical: attackPaths.filter((p) => p.severity === "critical").length,
      high: attackPaths.filter((p) => p.severity === "high").length,
      medium: attackPaths.filter((p) => p.severity === "medium").length,
      low: attackPaths.filter((p) => p.severity === "low").length,
    };

    return new Response(
      JSON.stringify({
        success: true,
        analysis: {
          total_paths: pathsInserted,
          severity_breakdown: severityCounts,
          remediations_created: remediationsCreated,
          graph_stats: { nodes: nodes.length, edges: edges.length },
          max_risk_score: attackPaths[0]?.risk_score || 0,
        },
      }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Attack path analyzer error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});

function getRemediationAction(
  target: Node,
  path: AttackPath
): { type: string; description: string; plan: Record<string, unknown>; rollback: Record<string, unknown> } {
  const typeActions: Record<string, { type: string; description: string }> = {
    s3_bucket: {
      type: "restrict_s3_access",
      description: `Restrict public access to S3 bucket "${target.resource_name}". Enable bucket-level public access block and review bucket policy.`,
    },
    rds_instance: {
      type: "restrict_rds_access",
      description: `Remove public accessibility from RDS instance "${target.resource_name}". Ensure database is only accessible within VPC.`,
    },
    iam_role: {
      type: "restrict_role_trust",
      description: `Tighten trust policy for IAM role "${target.resource_name}". Remove overly permissive principal entries.`,
    },
    iam_user: {
      type: "enforce_mfa",
      description: `Enable MFA for IAM user "${target.resource_name}" and rotate access keys if exposed.`,
    },
    security_group: {
      type: "restrict_security_group",
      description: `Remove overly permissive inbound rules from security group "${target.resource_name}".`,
    },
    ec2_instance: {
      type: "harden_instance",
      description: `Reduce public exposure of EC2 instance "${target.resource_name}". Review security groups and remove public IP if unnecessary.`,
    },
  };

  const action = typeActions[target.node_type] || {
    type: "review_configuration",
    description: `Review security configuration for ${target.node_type} "${target.resource_name}".`,
  };

  return {
    ...action,
    plan: {
      steps: [
        `Identify resource: ${target.resource_id}`,
        `Review current configuration`,
        action.description,
        `Verify fix resolves the attack path`,
      ],
      estimated_impact: path.blast_radius > 3 ? "high" : "low",
      requires_downtime: false,
    },
    rollback: {
      steps: [`Document current configuration before changes`, `Revert changes if service disruption occurs`],
    },
  };
}
