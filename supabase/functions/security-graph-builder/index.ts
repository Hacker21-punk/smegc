import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { z } from "https://esm.sh/zod@3.22.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

// ── Edge Inference Rules ──
interface GraphNode {
  id: string;
  node_type: string;
  resource_id: string;
  is_public: boolean;
  is_sensitive: boolean;
  metadata: Record<string, unknown>;
  region: string | null;
}

interface GraphEdge {
  organization_id: string;
  source_node_id: string;
  target_node_id: string;
  edge_type: string;
  weight: number;
  is_risky: boolean;
  metadata: Record<string, unknown>;
}

function buildEdges(nodes: GraphNode[], orgId: string): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const nodeMap = new Map<string, GraphNode>();
  const nodesByType = new Map<string, GraphNode[]>();

  for (const n of nodes) {
    nodeMap.set(n.id, n);
    nodeMap.set(n.resource_id, n);
    const list = nodesByType.get(n.node_type) || [];
    list.push(n);
    nodesByType.set(n.node_type, list);
  }

  const internetNode = nodes.find((n) => n.node_type === "external_internet");

  // 1. Internet → public resources (exposes)
  if (internetNode) {
    for (const n of nodes) {
      if (n.is_public && n.id !== internetNode.id) {
        edges.push({
          organization_id: orgId,
          source_node_id: internetNode.id,
          target_node_id: n.id,
          edge_type: "exposes",
          weight: 10,
          is_risky: true,
          metadata: { reason: "Resource is publicly accessible" },
        });
      }
    }
  }

  // 2. EC2 → Security Groups (attached_to)
  for (const ec2 of nodesByType.get("ec2_instance") || []) {
    const sgIds = (ec2.metadata?.security_groups as string[]) || [];
    for (const sgId of sgIds) {
      const sgNode = nodeMap.get(sgId);
      if (sgNode) {
        edges.push({
          organization_id: orgId,
          source_node_id: ec2.id,
          target_node_id: sgNode.id,
          edge_type: "attached_to",
          weight: 1,
          is_risky: sgNode.is_public,
          metadata: {},
        });
      }
    }
  }

  // 3. EC2 → VPC (contains)
  for (const ec2 of nodesByType.get("ec2_instance") || []) {
    const vpcId = ec2.metadata?.vpc_id as string;
    if (vpcId) {
      const vpcNode = nodeMap.get(vpcId);
      if (vpcNode) {
        edges.push({
          organization_id: orgId,
          source_node_id: vpcNode.id,
          target_node_id: ec2.id,
          edge_type: "contains",
          weight: 1,
          is_risky: false,
          metadata: {},
        });
      }
    }
  }

  // 4. EC2 → IAM Role (can_assume_role) via instance profile
  for (const ec2 of nodesByType.get("ec2_instance") || []) {
    const profileArn = ec2.metadata?.iam_profile as string;
    if (profileArn) {
      // Match role by ARN pattern
      for (const role of nodesByType.get("iam_role") || []) {
        if (profileArn.includes(role.resource_id) || profileArn.includes(role.metadata?.path as string || "__none__")) {
          edges.push({
            organization_id: orgId,
            source_node_id: ec2.id,
            target_node_id: role.id,
            edge_type: "can_assume_role",
            weight: 5,
            is_risky: ec2.is_public,
            metadata: { via: "instance_profile" },
          });
        }
      }
    }
  }

  // 5. RDS → Security Groups (attached_to)
  for (const rds of nodesByType.get("rds_instance") || []) {
    const sgIds = (rds.metadata?.security_groups as string[]) || [];
    for (const sgId of sgIds) {
      const sgNode = nodeMap.get(sgId);
      if (sgNode) {
        edges.push({
          organization_id: orgId,
          source_node_id: rds.id,
          target_node_id: sgNode.id,
          edge_type: "attached_to",
          weight: 1,
          is_risky: sgNode.is_public,
          metadata: {},
        });
      }
    }
  }

  // 6. RDS → VPC (contains)
  for (const rds of nodesByType.get("rds_instance") || []) {
    const vpcId = rds.metadata?.vpc_id as string;
    if (vpcId) {
      const vpcNode = nodeMap.get(vpcId);
      if (vpcNode) {
        edges.push({
          organization_id: orgId,
          source_node_id: vpcNode.id,
          target_node_id: rds.id,
          edge_type: "contains",
          weight: 1,
          is_risky: false,
          metadata: {},
        });
      }
    }
  }

  // 7. IAM Role trust relationships (trusts)
  for (const role of nodesByType.get("iam_role") || []) {
    const trustPolicy = role.metadata?.trust_policy as Record<string, unknown>;
    if (trustPolicy) {
      const statements = (trustPolicy.Statement as Array<Record<string, unknown>>) || [];
      for (const stmt of statements) {
        const principal = stmt.Principal as Record<string, unknown>;
        if (!principal) continue;
        const awsPrincipal = principal.AWS || principal.Service;
        if (typeof awsPrincipal === "string" && awsPrincipal === "*") {
          // Any entity can assume this role → risky
          if (internetNode) {
            edges.push({
              organization_id: orgId,
              source_node_id: internetNode.id,
              target_node_id: role.id,
              edge_type: "trusts",
              weight: 10,
              is_risky: true,
              metadata: { reason: "Role trusts any principal (*)" },
            });
          }
        }
      }
    }
  }

  // 8. Public SG → Internet (network_access)
  for (const sg of nodesByType.get("security_group") || []) {
    if (sg.is_public && internetNode) {
      edges.push({
        organization_id: orgId,
        source_node_id: internetNode.id,
        target_node_id: sg.id,
        edge_type: "network_access",
        weight: 8,
        is_risky: true,
        metadata: { reason: "Security group allows public ingress" },
      });
    }
  }

  return edges;
}

// ── Main ──
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    await validateAuth(req);
    const body = await req.json();
    const { organization_id, aws_account_id } = RequestSchema.parse(body);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all graph nodes for this org (or specific account)
    let query = supabase
      .from("security_graph_nodes")
      .select("id, node_type, resource_id, is_public, is_sensitive, metadata, region")
      .eq("organization_id", organization_id);
    if (aws_account_id) query = query.eq("aws_account_id", aws_account_id);

    const { data: rawNodes, error: nodesErr } = await query;
    if (nodesErr) throw new Error(`Failed to fetch nodes: ${nodesErr.message}`);
    if (!rawNodes || rawNodes.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No graph nodes found. Run asset discovery first.", edges_created: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const nodes: GraphNode[] = rawNodes.map((n: any) => ({
      id: n.id,
      node_type: n.node_type,
      resource_id: n.resource_id,
      is_public: n.is_public,
      is_sensitive: n.is_sensitive,
      metadata: n.metadata || {},
      region: n.region,
    }));

    // Build edges
    const edges = buildEdges(nodes, organization_id);

    // Clear old edges for this org and upsert new ones
    if (aws_account_id) {
      // Delete edges where source or target belongs to this account
      const accountNodeIds = rawNodes.map((n: any) => n.id);
      if (accountNodeIds.length > 0) {
        await supabase
          .from("security_graph_edges")
          .delete()
          .eq("organization_id", organization_id)
          .or(`source_node_id.in.(${accountNodeIds.join(",")}),target_node_id.in.(${accountNodeIds.join(",")})`);
      }
    } else {
      await supabase
        .from("security_graph_edges")
        .delete()
        .eq("organization_id", organization_id);
    }

    // Insert edges in batches
    let insertedCount = 0;
    const batchSize = 50;
    for (let i = 0; i < edges.length; i += batchSize) {
      const batch = edges.slice(i, i + batchSize);
      const { error } = await supabase.from("security_graph_edges").insert(batch);
      if (error) {
        console.error("Edge insert error:", error);
      } else {
        insertedCount += batch.length;
      }
    }

    // Summary stats
    const riskyEdges = edges.filter((e) => e.is_risky).length;
    const publicNodes = nodes.filter((n) => n.is_public).length;
    const sensitiveNodes = nodes.filter((n) => n.is_sensitive).length;

    return new Response(
      JSON.stringify({
        success: true,
        graph_summary: {
          total_nodes: nodes.length,
          total_edges: insertedCount,
          risky_edges: riskyEdges,
          public_nodes: publicNodes,
          sensitive_nodes: sensitiveNodes,
          node_types: Object.fromEntries(
            [...nodesByType(nodes)].map(([type, list]) => [type, list.length])
          ),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Security graph error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function nodesByType(nodes: GraphNode[]): Map<string, GraphNode[]> {
  const map = new Map<string, GraphNode[]>();
  for (const n of nodes) {
    const list = map.get(n.node_type) || [];
    list.push(n);
    map.set(n.node_type, list);
  }
  return map;
}
