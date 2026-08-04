import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { getCorsHeaders } from "../_shared/cors.ts";


interface ClusterInfo {
  cluster_name: string;
  provider: string;
  cluster_type: string;
  region: string;
  version: string;
  node_count: number;
  network_mode: string;
  endpoint: string;
  metadata: Record<string, unknown>;
}

interface K8sResource {
  resource_kind: string;
  resource_name: string;
  namespace: string;
  labels: Record<string, string>;
  spec: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

interface K8sFinding {
  severity: string;
  category: string;
  title: string;
  description: string;
  resource_kind: string;
  resource_name: string;
  namespace: string;
  remediation_steps: string[];
  risk_score_contribution: number;
}

// ─── EKS Discovery ───
async function discoverEKSClusters(credentials: any, region: string): Promise<ClusterInfo[]> {
  // In production, this would use AWS SDK to list EKS clusters
  // For now, simulate discovery based on the account
  const clusters: ClusterInfo[] = [];

  try {
    // Would call: EKS.listClusters() then EKS.describeCluster() for each
    // Simulating discovery
    const clusterData = {
      cluster_name: `eks-${region}-cluster`,
      provider: "aws",
      cluster_type: "eks",
      region: region,
      version: "1.28",
      node_count: 5,
      network_mode: "vpc-cni",
      endpoint: `https://eks.${region}.amazonaws.com`,
      metadata: { platform: "EKS", managed: true },
    };
    clusters.push(clusterData);
  } catch (err) {
    console.error("EKS discovery error:", err);
  }

  return clusters;
}

// ─── AKS Discovery ───
async function discoverAKSClusters(credentials: any): Promise<ClusterInfo[]> {
  const clusters: ClusterInfo[] = [];

  try {
    // Would use Azure Management API:
    // GET /subscriptions/{id}/providers/Microsoft.ContainerService/managedClusters
    const clusterData = {
      cluster_name: `aks-${credentials.subscription_id?.slice(0, 8) || "default"}-cluster`,
      provider: "azure",
      cluster_type: "aks",
      region: "eastus",
      version: "1.28",
      node_count: 3,
      network_mode: "azure-cni",
      endpoint: "https://aks.eastus.azmk8s.io",
      metadata: { platform: "AKS", managed: true },
    };
    clusters.push(clusterData);
  } catch (err) {
    console.error("AKS discovery error:", err);
  }

  return clusters;
}

// ─── GKE Discovery ───
async function discoverGKEClusters(credentials: any): Promise<ClusterInfo[]> {
  const clusters: ClusterInfo[] = [];

  try {
    // Would use GCP Container API:
    // GET /v1/projects/{project}/locations/-/clusters
    const clusterData = {
      cluster_name: `gke-${credentials.project_id || "default"}-cluster`,
      provider: "gcp",
      cluster_type: "gke",
      region: "us-central1",
      version: "1.28",
      node_count: 4,
      network_mode: "vpc-native",
      endpoint: "https://gke.us-central1.cloud.google.com",
      metadata: { platform: "GKE", managed: true },
    };
    clusters.push(clusterData);
  } catch (err) {
    console.error("GKE discovery error:", err);
  }

  return clusters;
}

// ─── K8s Resource Discovery (simulated via API scanning) ───
function discoverK8sResources(clusterName: string): K8sResource[] {
  return [
    { resource_kind: "Namespace", resource_name: "default", namespace: "default", labels: {}, spec: {}, metadata: {} },
    { resource_kind: "Namespace", resource_name: "kube-system", namespace: "kube-system", labels: {}, spec: {}, metadata: {} },
    { resource_kind: "Deployment", resource_name: "api-server", namespace: "default", labels: { app: "api" }, spec: { replicas: 3, privileged: true }, metadata: {} },
    { resource_kind: "Deployment", resource_name: "web-frontend", namespace: "default", labels: { app: "web" }, spec: { replicas: 2, runAsRoot: true }, metadata: {} },
    { resource_kind: "Service", resource_name: "api-lb", namespace: "default", labels: { app: "api" }, spec: { type: "LoadBalancer", external: true }, metadata: {} },
    { resource_kind: "Pod", resource_name: "worker-1", namespace: "default", labels: { app: "worker" }, spec: { privileged: false }, metadata: {} },
    { resource_kind: "Pod", resource_name: "cache-redis", namespace: "default", labels: { app: "cache" }, spec: {}, metadata: {} },
    { resource_kind: "ConfigMap", resource_name: "app-config", namespace: "default", labels: {}, spec: {}, metadata: {} },
    { resource_kind: "Secret", resource_name: "db-credentials", namespace: "default", labels: {}, spec: { encrypted: false }, metadata: {} },
    { resource_kind: "Ingress", resource_name: "main-ingress", namespace: "default", labels: {}, spec: { tls: false }, metadata: {} },
    { resource_kind: "ClusterRoleBinding", resource_name: "admin-binding", namespace: "", labels: {}, spec: { roleRef: "cluster-admin", subjects: ["default-sa"] }, metadata: {} },
    { resource_kind: "ServiceAccount", resource_name: "default", namespace: "default", labels: {}, spec: { automountToken: true }, metadata: {} },
    { resource_kind: "NetworkPolicy", resource_name: "allow-all", namespace: "default", labels: {}, spec: { ingress: "allow-all", egress: "allow-all" }, metadata: {} },
  ];
}

// ─── Security Analysis Engine ───
function analyzeK8sSecurity(resources: K8sResource[], clusterName: string): K8sFinding[] {
  const findings: K8sFinding[] = [];

  for (const r of resources) {
    // Privileged containers
    if (r.resource_kind === "Deployment" && r.spec.privileged === true) {
      findings.push({
        severity: "critical",
        category: "privileged_container",
        title: `Privileged container detected in ${r.resource_name}`,
        description: `Deployment ${r.resource_name} in namespace ${r.namespace} runs with privileged mode enabled. This grants the container full access to the host, allowing potential container escape and host compromise.`,
        resource_kind: r.resource_kind,
        resource_name: r.resource_name,
        namespace: r.namespace,
        remediation_steps: [
          "Set securityContext.privileged to false in the pod spec",
          "Use specific capabilities instead of privileged mode",
          "Apply a PodSecurityPolicy or PodSecurityStandard to prevent privileged containers",
          "Review if the workload truly requires host-level access",
        ],
        risk_score_contribution: 25,
      });
    }

    // Running as root
    if (r.resource_kind === "Deployment" && r.spec.runAsRoot === true) {
      findings.push({
        severity: "high",
        category: "root_container",
        title: `Container running as root in ${r.resource_name}`,
        description: `Deployment ${r.resource_name} runs containers as the root user. If compromised, an attacker gains root-level access inside the container.`,
        resource_kind: r.resource_kind,
        resource_name: r.resource_name,
        namespace: r.namespace,
        remediation_steps: [
          "Set securityContext.runAsNonRoot to true",
          "Specify a non-root runAsUser in the pod spec",
          "Rebuild container images to run as non-root user",
        ],
        risk_score_contribution: 18,
      });
    }

    // Overly permissive RBAC
    if (r.resource_kind === "ClusterRoleBinding" && r.spec.roleRef === "cluster-admin") {
      findings.push({
        severity: "critical",
        category: "rbac",
        title: `Overly permissive ClusterRoleBinding: ${r.resource_name}`,
        description: `ClusterRoleBinding ${r.resource_name} grants cluster-admin privileges. This allows full control over all resources in every namespace.`,
        resource_kind: r.resource_kind,
        resource_name: r.resource_name,
        namespace: r.namespace || "cluster-wide",
        remediation_steps: [
          "Replace cluster-admin with a least-privilege ClusterRole",
          "Use namespace-scoped RoleBindings instead of ClusterRoleBindings",
          "Audit all subjects bound to this ClusterRoleBinding",
          "Implement RBAC reviews on a regular schedule",
        ],
        risk_score_contribution: 22,
      });
    }

    // Publicly exposed services
    if (r.resource_kind === "Service" && r.spec.type === "LoadBalancer" && r.spec.external === true) {
      findings.push({
        severity: "high",
        category: "network_exposure",
        title: `Publicly exposed service: ${r.resource_name}`,
        description: `Service ${r.resource_name} is exposed via a public LoadBalancer. This makes it directly accessible from the internet.`,
        resource_kind: r.resource_kind,
        resource_name: r.resource_name,
        namespace: r.namespace,
        remediation_steps: [
          "Switch to ClusterIP or NodePort if external access is not required",
          "Add network policies to restrict ingress traffic",
          "Use an internal load balancer annotation",
          "Place behind an API gateway or WAF",
        ],
        risk_score_contribution: 15,
      });
    }

    // Unencrypted secrets
    if (r.resource_kind === "Secret" && r.spec.encrypted === false) {
      findings.push({
        severity: "high",
        category: "unencrypted_secrets",
        title: `Unencrypted secret: ${r.resource_name}`,
        description: `Secret ${r.resource_name} is stored without encryption at rest. Base64 encoding is not encryption.`,
        resource_kind: r.resource_kind,
        resource_name: r.resource_name,
        namespace: r.namespace,
        remediation_steps: [
          "Enable encryption at rest for etcd secrets",
          "Use external secret management (Vault, AWS Secrets Manager, etc.)",
          "Rotate all secrets after enabling encryption",
          "Use sealed-secrets or external-secrets operator",
        ],
        risk_score_contribution: 16,
      });
    }

    // Unrestricted network policies
    if (r.resource_kind === "NetworkPolicy" && r.spec.ingress === "allow-all") {
      findings.push({
        severity: "medium",
        category: "network_policy",
        title: `Unrestricted network policy: ${r.resource_name}`,
        description: `NetworkPolicy ${r.resource_name} allows all ingress and egress traffic. This provides no network segmentation.`,
        resource_kind: r.resource_kind,
        resource_name: r.resource_name,
        namespace: r.namespace,
        remediation_steps: [
          "Define specific ingress and egress rules",
          "Implement default-deny network policies per namespace",
          "Allow only required pod-to-pod and pod-to-service communication",
        ],
        risk_score_contribution: 10,
      });
    }

    // Auto-mounted service account tokens
    if (r.resource_kind === "ServiceAccount" && r.spec.automountToken === true) {
      findings.push({
        severity: "medium",
        category: "rbac",
        title: `Auto-mounted service account token: ${r.resource_name}`,
        description: `ServiceAccount ${r.resource_name} has automountServiceAccountToken enabled. If a pod is compromised, the attacker can use this token to access the Kubernetes API.`,
        resource_kind: r.resource_kind,
        resource_name: r.resource_name,
        namespace: r.namespace,
        remediation_steps: [
          "Set automountServiceAccountToken to false on the ServiceAccount",
          "Only mount tokens in pods that explicitly need API access",
          "Use projected volumes with audience-bound tokens instead",
        ],
        risk_score_contribution: 8,
      });
    }

    // Ingress without TLS
    if (r.resource_kind === "Ingress" && r.spec.tls === false) {
      findings.push({
        severity: "medium",
        category: "network_exposure",
        title: `Ingress without TLS: ${r.resource_name}`,
        description: `Ingress ${r.resource_name} does not enforce TLS. Traffic is transmitted in plaintext.`,
        resource_kind: r.resource_kind,
        resource_name: r.resource_name,
        namespace: r.namespace,
        remediation_steps: [
          "Configure TLS termination on the Ingress resource",
          "Use cert-manager to automate certificate management",
          "Add a redirect rule from HTTP to HTTPS",
        ],
        risk_score_contribution: 10,
      });
    }
  }

  return findings;
}

// ─── Security Graph Integration ───
async function integrateWithSecurityGraph(
  supabase: any,
  orgId: string,
  cluster: any,
  resources: K8sResource[],
  findings: K8sFinding[]
) {
  // Create cluster node
  const { data: clusterNode } = await supabase
    .from("security_graph_nodes")
    .upsert({
      organization_id: orgId,
      resource_id: `k8s-cluster-${cluster.id}`,
      resource_name: cluster.cluster_name,
      node_type: "eks_cluster",
      provider: cluster.provider,
      region: cluster.region,
      is_public: false,
      is_sensitive: true,
      risk_score: cluster.risk_score,
      metadata: { cluster_type: cluster.cluster_type, version: cluster.version },
    }, { onConflict: "organization_id,resource_id" })
    .select()
    .single();

  if (!clusterNode) return;

  // Create nodes for exposed services and privileged resources
  for (const r of resources) {
    if (r.resource_kind === "Service" && r.spec.type === "LoadBalancer") {
      const { data: svcNode } = await supabase
        .from("security_graph_nodes")
        .upsert({
          organization_id: orgId,
          resource_id: `k8s-svc-${cluster.id}-${r.resource_name}`,
          resource_name: r.resource_name,
          node_type: "load_balancer",
          provider: cluster.provider,
          region: cluster.region,
          is_public: true,
          is_sensitive: false,
          risk_score: 15,
          metadata: { k8s_kind: "Service", namespace: r.namespace },
        }, { onConflict: "organization_id,resource_id" })
        .select()
        .single();

      if (svcNode) {
        // Internet → LoadBalancer → Cluster
        await supabase.from("security_graph_edges").upsert({
          organization_id: orgId,
          source_node_id: svcNode.id,
          target_node_id: clusterNode.id,
          edge_type: "routes_to",
          is_risky: true,
          weight: 8,
          metadata: { path: "public_lb_to_cluster" },
        }, { onConflict: "organization_id,source_node_id,target_node_id,edge_type" });
      }
    }
  }

  // Create attack paths for critical breach paths
  const hasCriticalPath = findings.some(f => f.category === "privileged_container") &&
    findings.some(f => f.category === "rbac") &&
    resources.some(r => r.resource_kind === "Service" && r.spec.type === "LoadBalancer");

  if (hasCriticalPath) {
    await supabase.from("attack_paths").insert({
      organization_id: orgId,
      title: `Critical K8s Breach Path: ${cluster.cluster_name}`,
      description: `Internet → Public LoadBalancer → K8s Service → Privileged Pod → Cluster Admin Role. This path allows an attacker to escalate from external access to full cluster control.`,
      severity: "critical",
      status: "active",
      risk_score: 95,
      path_length: 4,
      blast_radius: 100,
      metadata: {
        cluster_id: cluster.id,
        cluster_name: cluster.cluster_name,
        provider: cluster.provider,
        breach_type: "kubernetes_privilege_escalation",
      },
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await userClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();
    if (!profile?.organization_id) throw new Error("Organization not found");
    const orgId = profile.organization_id;

    const body = await req.json();
    const { action, cloud_account_id, cluster_id } = body;

    if (action === "discover_clusters") {
      // Discover K8s clusters from all connected cloud accounts
      const allClusters: any[] = [];

      // Get cloud accounts (Azure/GCP)
      const { data: cloudAccounts } = await supabase
        .from("cloud_accounts")
        .select("*")
        .eq("organization_id", orgId);

      // Get AWS accounts
      const { data: awsAccounts } = await supabase
        .from("aws_accounts")
        .select("*")
        .eq("organization_id", orgId);

      // Discover from AWS accounts
      for (const aws of awsAccounts || []) {
        const clusters = await discoverEKSClusters(aws, "us-east-1");
        for (const c of clusters) {
          const { data: inserted } = await supabase
            .from("kubernetes_clusters")
            .upsert({
              organization_id: orgId,
              aws_account_id: aws.id,
              provider: "aws",
              cluster_name: c.cluster_name,
              cluster_type: "eks",
              region: c.region,
              version: c.version,
              node_count: c.node_count,
              network_mode: c.network_mode,
              endpoint: c.endpoint,
              status: "discovered",
              metadata: c.metadata,
            }, { onConflict: "organization_id,cluster_name" })
            .select()
            .single();
          if (inserted) allClusters.push(inserted);
        }
      }

      // Discover from Azure/GCP accounts
      for (const ca of cloudAccounts || []) {
        let clusters: ClusterInfo[] = [];

        // Decrypt credentials
        const { data: decryptedCreds, error: decryptErr } = await supabase
          .rpc("decrypt_cloud_credentials", { encrypted: ca.credentials_encrypted });
        if (decryptErr || !decryptedCreds) {
          console.error(`Failed to decrypt credentials for cloud account ${ca.id}:`, decryptErr);
          continue;
        }

        if (ca.provider === "azure") {
          clusters = await discoverAKSClusters(decryptedCreds);
        } else if (ca.provider === "gcp") {
          clusters = await discoverGKEClusters(decryptedCreds);
        }

        for (const c of clusters) {
          const { data: inserted } = await supabase
            .from("kubernetes_clusters")
            .upsert({
              organization_id: orgId,
              cloud_account_id: ca.id,
              provider: ca.provider,
              cluster_name: c.cluster_name,
              cluster_type: c.cluster_type,
              region: c.region,
              version: c.version,
              node_count: c.node_count,
              network_mode: c.network_mode,
              endpoint: c.endpoint,
              status: "discovered",
              metadata: c.metadata,
            }, { onConflict: "organization_id,cluster_name" })
            .select()
            .single();
          if (inserted) allClusters.push(inserted);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        clusters_discovered: allClusters.length,
        clusters: allClusters,
      }), {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    if (action === "scan_cluster") {
      if (!cluster_id) throw new Error("cluster_id is required");

      const { data: cluster } = await supabase
        .from("kubernetes_clusters")
        .select("*")
        .eq("id", cluster_id)
        .eq("organization_id", orgId)
        .single();

      if (!cluster) throw new Error("Cluster not found");

      // 1. Discover resources
      const resources = discoverK8sResources(cluster.cluster_name);

      // 2. Store resources
      for (const r of resources) {
        await supabase.from("kubernetes_resources").upsert({
          organization_id: orgId,
          cluster_id: cluster.id,
          resource_kind: r.resource_kind,
          resource_name: r.resource_name,
          namespace: r.namespace,
          labels: r.labels,
          spec: r.spec,
          metadata: r.metadata,
          status: "active",
        }, { onConflict: "cluster_id,resource_kind,resource_name,namespace" });
      }

      // 3. Security analysis
      const findings = analyzeK8sSecurity(resources, cluster.cluster_name);

      // 4. Store findings
      let criticalCount = 0;
      let highCount = 0;
      for (const f of findings) {
        await supabase.from("kubernetes_findings").insert({
          organization_id: orgId,
          cluster_id: cluster.id,
          severity: f.severity,
          category: f.category,
          title: f.title,
          description: f.description,
          resource_kind: f.resource_kind,
          resource_name: f.resource_name,
          namespace: f.namespace,
          remediation_steps: f.remediation_steps,
          risk_score_contribution: f.risk_score_contribution,
        });
        if (f.severity === "critical") criticalCount++;
        if (f.severity === "high") highCount++;
      }

      // 5. Update cluster risk score
      const totalRisk = Math.min(100, findings.reduce((sum, f) => sum + f.risk_score_contribution, 0));
      await supabase
        .from("kubernetes_clusters")
        .update({ risk_score: totalRisk, last_scan_at: new Date().toISOString(), status: "scanned" })
        .eq("id", cluster.id);

      // 6. Integrate with security graph
      await integrateWithSecurityGraph(supabase, orgId, cluster, resources, findings);

      return new Response(JSON.stringify({
        success: true,
        cluster: cluster.cluster_name,
        resources_discovered: resources.length,
        findings_count: findings.length,
        critical: criticalCount,
        high: highCount,
        risk_score: totalRisk,
      }), {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action. Use: discover_clusters, scan_cluster" }), {
      status: 400,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("K8s scanner error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
