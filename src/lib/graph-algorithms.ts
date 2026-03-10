/**
 * Enhanced Graph Algorithms for Cloud Security Graph Engine
 * 
 * Provides: shortest-path (BFS), depth-limited DFS, blast radius calculation,
 * privilege escalation detection, and critical path scoring.
 */

export interface GraphNode {
  id: string;
  node_type: string;
  is_public: boolean;
  is_sensitive: boolean;
  risk_score: number | null;
  resource_name?: string | null;
  resource_id: string;
}

export interface GraphEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  edge_type: string;
  is_risky: boolean;
  weight?: number | null;
}

export interface PathResult {
  path: string[]; // node IDs in order
  edges: string[]; // edge IDs in order
  totalRisk: number;
  hasPrivilegeEscalation: boolean;
  length: number;
}

export interface BlastRadiusResult {
  affectedNodeIds: string[];
  maxDepth: number;
  sensitiveCount: number;
  totalRiskExposure: number;
}

// ── Adjacency List Builder ──

function buildAdjacencyList(edges: GraphEdge[]): Map<string, { nodeId: string; edgeId: string; edgeType: string }[]> {
  const adj = new Map<string, { nodeId: string; edgeId: string; edgeType: string }[]>();
  for (const e of edges) {
    if (!adj.has(e.source_node_id)) adj.set(e.source_node_id, []);
    adj.get(e.source_node_id)!.push({
      nodeId: e.target_node_id,
      edgeId: e.id,
      edgeType: e.edge_type,
    });
  }
  return adj;
}

// ── BFS Shortest Path ──

export function findShortestPath(
  nodes: GraphNode[],
  edges: GraphEdge[],
  startId: string,
  endId: string
): PathResult | null {
  const adj = buildAdjacencyList(edges);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const visited = new Set<string>();
  const queue: { nodeId: string; path: string[]; edgePath: string[] }[] = [
    { nodeId: startId, path: [startId], edgePath: [] },
  ];
  visited.add(startId);

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.nodeId === endId) {
      const totalRisk = current.path.reduce(
        (sum, nid) => sum + (nodeMap.get(nid)?.risk_score ?? 0),
        0
      );
      const hasPrivilegeEscalation = detectPrivilegeEscalationInPath(
        current.path,
        current.edgePath,
        nodeMap,
        edges
      );
      return {
        path: current.path,
        edges: current.edgePath,
        totalRisk,
        hasPrivilegeEscalation,
        length: current.path.length,
      };
    }

    const neighbors = adj.get(current.nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.nodeId)) {
        visited.add(neighbor.nodeId);
        queue.push({
          nodeId: neighbor.nodeId,
          path: [...current.path, neighbor.nodeId],
          edgePath: [...current.edgePath, neighbor.edgeId],
        });
      }
    }
  }

  return null;
}

// ── Depth-Limited DFS: All Paths ──

export function findAllPaths(
  nodes: GraphNode[],
  edges: GraphEdge[],
  startId: string,
  endId: string,
  maxDepth = 8
): PathResult[] {
  const adj = buildAdjacencyList(edges);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const results: PathResult[] = [];

  function dfs(
    current: string,
    path: string[],
    edgePath: string[],
    visited: Set<string>,
    depth: number
  ) {
    if (depth > maxDepth) return;

    if (current === endId && path.length > 1) {
      const totalRisk = path.reduce(
        (sum, nid) => sum + (nodeMap.get(nid)?.risk_score ?? 0),
        0
      );
      const hasPrivilegeEscalation = detectPrivilegeEscalationInPath(
        path,
        edgePath,
        nodeMap,
        edges
      );
      results.push({
        path: [...path],
        edges: [...edgePath],
        totalRisk,
        hasPrivilegeEscalation,
        length: path.length,
      });
      return;
    }

    const neighbors = adj.get(current) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.nodeId)) {
        visited.add(neighbor.nodeId);
        path.push(neighbor.nodeId);
        edgePath.push(neighbor.edgeId);
        dfs(neighbor.nodeId, path, edgePath, visited, depth + 1);
        path.pop();
        edgePath.pop();
        visited.delete(neighbor.nodeId);
      }
    }
  }

  const visited = new Set<string>([startId]);
  dfs(startId, [startId], [], visited, 0);

  // Sort by total risk descending
  return results.sort((a, b) => b.totalRisk - a.totalRisk);
}

// ── Blast Radius Calculation ──

export function calculateBlastRadius(
  nodes: GraphNode[],
  edges: GraphEdge[],
  compromisedNodeId: string,
  maxDepth = 5
): BlastRadiusResult {
  const adj = buildAdjacencyList(edges);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const visited = new Set<string>();
  const queue: { nodeId: string; depth: number }[] = [
    { nodeId: compromisedNodeId, depth: 0 },
  ];
  visited.add(compromisedNodeId);
  let maxReachedDepth = 0;

  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift()!;
    maxReachedDepth = Math.max(maxReachedDepth, depth);

    if (depth >= maxDepth) continue;

    const neighbors = adj.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.nodeId)) {
        visited.add(neighbor.nodeId);
        queue.push({ nodeId: neighbor.nodeId, depth: depth + 1 });
      }
    }
  }

  // Remove the compromised node itself from the count
  visited.delete(compromisedNodeId);
  const affectedNodeIds = Array.from(visited);

  const sensitiveCount = affectedNodeIds.filter(
    (id) => nodeMap.get(id)?.is_sensitive
  ).length;

  const totalRiskExposure = affectedNodeIds.reduce(
    (sum, id) => sum + (nodeMap.get(id)?.risk_score ?? 0),
    0
  );

  return {
    affectedNodeIds,
    maxDepth: maxReachedDepth,
    sensitiveCount,
    totalRiskExposure,
  };
}

// ── Privilege Escalation Detection ──

const PRIVILEGE_ESCALATION_EDGES = new Set([
  "can_assume_role",
  "has_permission",
  "trusts",
]);

const IDENTITY_TYPES = new Set([
  "iam_user",
  "iam_role",
  "iam_group",
  "iam_policy",
]);

const HIGH_VALUE_TYPES = new Set([
  "rds_instance",
  "s3_bucket",
  "secrets_manager",
  "kms_key",
]);

function detectPrivilegeEscalationInPath(
  path: string[],
  edgePath: string[],
  nodeMap: Map<string, GraphNode>,
  edges: GraphEdge[]
): boolean {
  const edgeMap = new Map(edges.map((e) => [e.id, e]));

  // Check: does the path go through identity nodes via escalation edges?
  let passedIdentity = false;
  let reachedHighValue = false;

  for (let i = 0; i < path.length; i++) {
    const node = nodeMap.get(path[i]);
    if (!node) continue;

    if (IDENTITY_TYPES.has(node.node_type)) passedIdentity = true;
    if (HIGH_VALUE_TYPES.has(node.node_type)) reachedHighValue = true;
  }

  // Check for escalation edge types
  let hasEscalationEdge = false;
  for (const eid of edgePath) {
    const edge = edgeMap.get(eid);
    if (edge && PRIVILEGE_ESCALATION_EDGES.has(edge.edge_type)) {
      hasEscalationEdge = true;
      break;
    }
  }

  return passedIdentity && reachedHighValue && hasEscalationEdge;
}

// ── Critical Path Scoring ──

export interface CriticalPathScore {
  pathResult: PathResult;
  dataSensitivityScore: number;
  privilegeEscalationScore: number;
  networkExposureScore: number;
  assetCriticalityScore: number;
  compositeScore: number; // 0-100
}

export function scoreCriticalPath(
  pathResult: PathResult,
  nodes: GraphNode[]
): CriticalPathScore {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const pathNodes = pathResult.path
    .map((id) => nodeMap.get(id))
    .filter(Boolean) as GraphNode[];

  // Data Sensitivity: % of sensitive nodes in path
  const sensitiveCount = pathNodes.filter((n) => n.is_sensitive).length;
  const dataSensitivityScore = Math.min(
    100,
    Math.round((sensitiveCount / Math.max(pathNodes.length, 1)) * 100) + (sensitiveCount > 0 ? 20 : 0)
  );

  // Privilege Escalation
  const privilegeEscalationScore = pathResult.hasPrivilegeEscalation ? 85 : 10;

  // Network Exposure: does it start from a public node?
  const startsPublic = pathNodes[0]?.is_public ?? false;
  const publicCount = pathNodes.filter((n) => n.is_public).length;
  const networkExposureScore = Math.min(
    100,
    (startsPublic ? 50 : 0) + publicCount * 15
  );

  // Asset Criticality: average risk score
  const avgRisk =
    pathNodes.reduce((sum, n) => sum + (n.risk_score ?? 0), 0) /
    Math.max(pathNodes.length, 1);
  const assetCriticalityScore = Math.min(100, Math.round(avgRisk));

  // Weighted composite
  const compositeScore = Math.min(
    100,
    Math.round(
      dataSensitivityScore * 0.3 +
        privilegeEscalationScore * 0.25 +
        networkExposureScore * 0.25 +
        assetCriticalityScore * 0.2
    )
  );

  return {
    pathResult,
    dataSensitivityScore,
    privilegeEscalationScore,
    networkExposureScore,
    assetCriticalityScore,
    compositeScore,
  };
}

// ── Find All Critical Attack Paths (entry → sensitive target) ──

export function findCriticalAttackPaths(
  nodes: GraphNode[],
  edges: GraphEdge[],
  maxDepth = 8
): CriticalPathScore[] {
  const entryPoints = nodes.filter((n) => n.is_public);
  const sensitiveTargets = nodes.filter((n) => n.is_sensitive);

  const allScored: CriticalPathScore[] = [];

  for (const entry of entryPoints) {
    for (const target of sensitiveTargets) {
      if (entry.id === target.id) continue;
      const paths = findAllPaths(nodes, edges, entry.id, target.id, maxDepth);
      for (const p of paths) {
        allScored.push(scoreCriticalPath(p, nodes));
      }
    }
  }

  return allScored.sort((a, b) => b.compositeScore - a.compositeScore);
}

// ── Get Node Reachability (which sensitive assets can a node reach) ──

export function getReachableSensitiveAssets(
  nodes: GraphNode[],
  edges: GraphEdge[],
  nodeId: string,
  maxDepth = 6
): GraphNode[] {
  const blastRadius = calculateBlastRadius(nodes, edges, nodeId, maxDepth);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return blastRadius.affectedNodeIds
    .map((id) => nodeMap.get(id))
    .filter((n): n is GraphNode => !!n && n.is_sensitive);
}
