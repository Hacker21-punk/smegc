import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";


interface NormalizedEvent {
  provider: string;
  event_type: string;
  event_source: string;
  severity: string;
  actor: string;
  source_ip: string;
  target_resource: string;
  target_resource_type: string;
  region: string;
  raw_event: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

// Threat detection rules
const DETECTION_RULES = [
  {
    id: "credential_abuse_brute_force",
    threat_type: "credential_abuse",
    threat_category: "credential_abuse",
    pattern: (e: NormalizedEvent) => e.event_type === "login_failure",
    severity: "high",
    description: "Multiple failed login attempts detected",
    mitre: "T1110 - Brute Force",
    threshold: 3,
  },
  {
    id: "credential_abuse_unusual_location",
    threat_type: "credential_abuse",
    threat_category: "credential_abuse",
    pattern: (e: NormalizedEvent) => e.event_type === "login_success" && e.metadata?.unusual_location === true,
    severity: "high",
    description: "Login from unusual geographic location",
    mitre: "T1078 - Valid Accounts",
    threshold: 1,
  },
  {
    id: "privilege_escalation_role_assume",
    threat_type: "privilege_escalation",
    threat_category: "privilege_escalation",
    pattern: (e: NormalizedEvent) => e.event_type === "assume_role" && (e.metadata?.is_admin_role === true || e.target_resource?.includes("Admin")),
    severity: "critical",
    description: "User assumed high-privilege admin role",
    mitre: "T1548 - Abuse Elevation Control",
    threshold: 1,
  },
  {
    id: "privilege_escalation_iam_change",
    threat_type: "privilege_escalation",
    threat_category: "privilege_escalation",
    pattern: (e: NormalizedEvent) => ["attach_policy", "create_policy", "put_role_policy"].includes(e.event_type),
    severity: "high",
    description: "Unexpected IAM policy modification detected",
    mitre: "T1098 - Account Manipulation",
    threshold: 1,
  },
  {
    id: "data_exfiltration_large_download",
    threat_type: "data_exfiltration",
    threat_category: "data_exfiltration",
    pattern: (e: NormalizedEvent) => e.event_type === "data_transfer" && Number(e.metadata?.bytes_transferred || 0) > 1073741824,
    severity: "critical",
    description: "Large data transfer detected from storage",
    mitre: "T1537 - Transfer Data to Cloud Account",
    threshold: 1,
  },
  {
    id: "data_exfiltration_sensitive_db",
    threat_type: "data_exfiltration",
    threat_category: "data_exfiltration",
    pattern: (e: NormalizedEvent) => e.event_type === "database_access" && e.metadata?.is_sensitive === true,
    severity: "high",
    description: "Unusual access to sensitive database detected",
    mitre: "T1530 - Data from Cloud Storage",
    threshold: 1,
  },
  {
    id: "container_compromise_privileged",
    threat_type: "container_compromise",
    threat_category: "container_compromise",
    pattern: (e: NormalizedEvent) => e.event_type === "container_start" && e.metadata?.privileged === true,
    severity: "critical",
    description: "Privileged container started in production",
    mitre: "T1610 - Deploy Container",
    threshold: 1,
  },
  {
    id: "container_compromise_network",
    threat_type: "container_compromise",
    threat_category: "container_compromise",
    pattern: (e: NormalizedEvent) => e.event_type === "suspicious_network" && e.metadata?.from_pod === true,
    severity: "high",
    description: "Suspicious outbound network connection from pod",
    mitre: "T1071 - Application Layer Protocol",
    threshold: 1,
  },
];

// Autopilot response actions
const AUTOPILOT_ACTIONS: Record<string, { action_type: string; description: string }[]> = {
  credential_abuse: [
    { action_type: "disable_credentials", description: "Disable compromised user credentials" },
    { action_type: "block_ip", description: "Block suspicious IP address" },
  ],
  privilege_escalation: [
    { action_type: "disable_role_access", description: "Disable risky IAM role access" },
    { action_type: "revert_policy_change", description: "Revert unauthorized IAM policy change" },
  ],
  data_exfiltration: [
    { action_type: "isolate_instance", description: "Isolate affected compute instance" },
    { action_type: "block_ip", description: "Block exfiltration destination IP" },
  ],
  container_compromise: [
    { action_type: "isolate_pod", description: "Isolate compromised pod network" },
    { action_type: "kill_container", description: "Terminate privileged container" },
  ],
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify auth using getClaims
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Use service role client for data operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", userId)
      .single();

    if (!profile?.organization_id) {
      return new Response(JSON.stringify({ error: "No organization" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const orgId = profile.organization_id;
    const body = await req.json();
    const { action } = body;

    if (action === "ingest_events") {
      return await handleIngestEvents(supabase, orgId, body);
    } else if (action === "run_detection") {
      return await handleRunDetection(supabase, orgId);
    } else if (action === "simulate_events") {
      return await handleSimulateEvents(supabase, orgId);
    } else if (action === "get_summary") {
      return await handleGetSummary(supabase, orgId);
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Runtime threat detector error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});

async function handleIngestEvents(supabase: any, orgId: string, body: any) {
  const { events } = body;
  if (!events || !Array.isArray(events)) {
    return new Response(JSON.stringify({ error: "events array required" }), {
      status: 400,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }

  const normalized = events.map((e: any) => ({
    organization_id: orgId,
    provider: e.provider || "aws",
    event_type: e.event_type,
    event_source: e.event_source || "cloudtrail",
    severity: e.severity || "medium",
    actor: e.actor || e.user,
    source_ip: e.source_ip,
    target_resource: e.target_resource,
    target_resource_type: e.target_resource_type,
    region: e.region,
    raw_event: e.raw_event || e,
    metadata: e.metadata || {},
    is_suspicious: false,
    cloud_account_id: e.cloud_account_id || null,
    aws_account_id: e.aws_account_id || null,
  }));

  const { data, error } = await supabase
    .from("runtime_events")
    .insert(normalized)
    .select();

  if (error) throw error;

  return new Response(JSON.stringify({ success: true, ingested: data.length }), {
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

async function runDetectionLogic(supabase: any, orgId: string) {
  // Get unprocessed events
  const { data: events, error } = await supabase
    .from("runtime_events")
    .select("*")
    .eq("organization_id", orgId)
    .is("processed_at", null)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw error;
  if (!events || events.length === 0) {
    return { success: true, processed: 0, threats: 0, alerts: 0, responses: 0 };
  }

  let threatCount = 0;
  let alertCount = 0;
  let responseCount = 0;

  for (const rule of DETECTION_RULES) {
    const matchingEvents = events.filter((e: any) => {
      try {
        return rule.pattern({
          ...e,
          metadata: e.metadata || {},
        });
      } catch {
        return false;
      }
    });

    if (matchingEvents.length >= rule.threshold) {
      const event = matchingEvents[0];

      // Mark events as suspicious
      const eventIds = matchingEvents.map((e: any) => e.id);
      await supabase
        .from("runtime_events")
        .update({ is_suspicious: true })
        .in("id", eventIds);

      // Create threat detection
      const { data: threat, error: tErr } = await supabase
        .from("threat_detections")
        .insert({
          organization_id: orgId,
          runtime_event_id: event.id,
          threat_type: rule.threat_type,
          threat_category: rule.threat_category,
          severity: rule.severity,
          confidence_score: Math.min(50 + matchingEvents.length * 15, 99),
          description: `${rule.description}. ${matchingEvents.length} matching event(s) detected. Actor: ${event.actor || "unknown"}, Source IP: ${event.source_ip || "unknown"}`,
          actor: event.actor,
          source_ip: event.source_ip,
          affected_resources: matchingEvents.map((e: any) => ({
            resource: e.target_resource,
            type: e.target_resource_type,
          })),
          attack_pattern: { rule_id: rule.id, event_count: matchingEvents.length },
          mitre_technique: rule.mitre,
        })
        .select()
        .single();

      if (tErr) {
        console.error("Failed to insert threat:", tErr);
        continue;
      }
      threatCount++;

      // Create security alert
      const { data: alert, error: aErr } = await supabase
        .from("security_alerts")
        .insert({
          organization_id: orgId,
          threat_detection_id: threat.id,
          alert_type: rule.threat_category,
          severity: rule.severity,
          title: `${rule.threat_type.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())} Detected`,
          description: threat.description,
          status: "open",
        })
        .select()
        .single();

      if (aErr) {
        console.error("Failed to insert alert:", aErr);
        continue;
      }
      alertCount++;

      // Create autopilot incident responses
      const actions = AUTOPILOT_ACTIONS[rule.threat_category] || [];
      for (const action of actions) {
        const { error: rErr } = await supabase
          .from("incident_responses")
          .insert({
            organization_id: orgId,
            alert_id: alert.id,
            threat_detection_id: threat.id,
            action_type: action.action_type,
            action_mode: rule.severity === "critical" ? "autonomous" : "advisory",
            status: "pending",
            description: action.description,
          });

        if (!rErr) responseCount++;
      }
    }
  }

  // Mark all processed
  const processedIds = events.map((e: any) => e.id);
  await supabase
    .from("runtime_events")
    .update({ processed_at: new Date().toISOString() })
    .in("id", processedIds);

  return {
    success: true,
    processed: events.length,
    threats: threatCount,
    alerts: alertCount,
    responses: responseCount,
  };
}

async function handleRunDetection(supabase: any, orgId: string) {
  const result = await runDetectionLogic(supabase, orgId);
  return new Response(JSON.stringify(result), {
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

async function handleSimulateEvents(supabase: any, orgId: string) {
  const simulatedEvents = [
    {
      organization_id: orgId,
      provider: "aws",
      event_type: "login_failure",
      event_source: "cloudtrail",
      severity: "medium",
      actor: "developer1@company.com",
      source_ip: "203.0.113.42",
      target_resource: "AWS Console",
      target_resource_type: "auth",
      region: "us-east-1",
      metadata: {},
    },
    {
      organization_id: orgId,
      provider: "aws",
      event_type: "login_failure",
      event_source: "cloudtrail",
      severity: "medium",
      actor: "developer1@company.com",
      source_ip: "203.0.113.42",
      target_resource: "AWS Console",
      target_resource_type: "auth",
      region: "us-east-1",
      metadata: {},
    },
    {
      organization_id: orgId,
      provider: "aws",
      event_type: "login_failure",
      event_source: "cloudtrail",
      severity: "medium",
      actor: "developer1@company.com",
      source_ip: "203.0.113.42",
      target_resource: "AWS Console",
      target_resource_type: "auth",
      region: "us-east-1",
      metadata: {},
    },
    {
      organization_id: orgId,
      provider: "aws",
      event_type: "assume_role",
      event_source: "cloudtrail",
      severity: "high",
      actor: "intern-user",
      source_ip: "198.51.100.23",
      target_resource: "arn:aws:iam::role/AdminRole",
      target_resource_type: "iam_role",
      region: "us-east-1",
      metadata: { is_admin_role: true },
    },
    {
      organization_id: orgId,
      provider: "aws",
      event_type: "data_transfer",
      event_source: "vpc_flow",
      severity: "high",
      actor: "prod-app-server",
      source_ip: "10.0.1.50",
      target_resource: "s3://prod-data-bucket",
      target_resource_type: "s3_bucket",
      region: "us-east-1",
      metadata: { bytes_transferred: 5368709120 },
    },
    {
      organization_id: orgId,
      provider: "aws",
      event_type: "container_start",
      event_source: "k8s_audit",
      severity: "critical",
      actor: "kube-system",
      source_ip: "10.0.2.10",
      target_resource: "prod-namespace/debug-pod",
      target_resource_type: "pod",
      region: "us-east-1",
      metadata: { privileged: true },
    },
    {
      organization_id: orgId,
      provider: "azure",
      event_type: "attach_policy",
      event_source: "activity_log",
      severity: "high",
      actor: "compromised-service-principal",
      source_ip: "192.0.2.100",
      target_resource: "AdministratorAccess",
      target_resource_type: "iam_policy",
      region: "eastus",
      metadata: {},
    },
    {
      organization_id: orgId,
      provider: "gcp",
      event_type: "login_success",
      event_source: "audit_log",
      severity: "medium",
      actor: "finance@company.com",
      source_ip: "41.72.100.5",
      target_resource: "GCP Console",
      target_resource_type: "auth",
      region: "us-central1",
      metadata: { unusual_location: true },
    },
  ];

  const { data, error } = await supabase
    .from("runtime_events")
    .insert(simulatedEvents)
    .select();

  if (error) throw error;

  // Now run detection inline (not via Response)
  const detectionData = await runDetectionLogic(supabase, orgId);

  return new Response(JSON.stringify({
    success: true,
    events_simulated: data.length,
    ...detectionData,
  }), {
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

async function handleGetSummary(supabase: any, orgId: string) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const [eventsRes, threatsRes, alertsRes, responsesRes] = await Promise.all([
    supabase.from("runtime_events").select("*", { count: "exact", head: false }).eq("organization_id", orgId).gte("created_at", oneHourAgo),
    supabase.from("threat_detections").select("*").eq("organization_id", orgId).eq("is_resolved", false),
    supabase.from("security_alerts").select("*").eq("organization_id", orgId).eq("status", "open"),
    supabase.from("incident_responses").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50),
  ]);

  const events = eventsRes.data || [];
  const threats = threatsRes.data || [];
  const alerts = alertsRes.data || [];
  const responses = responsesRes.data || [];

  const suspiciousLogins = events.filter((e: any) => ["login_failure", "login_success"].includes(e.event_type) && e.is_suspicious).length;
  const escalationAttempts = threats.filter((t: any) => t.threat_category === "privilege_escalation").length;
  const autopilotActions = responses.filter((r: any) => r.status === "completed" || r.action_mode === "autonomous").length;

  return new Response(JSON.stringify({
    success: true,
    summary: {
      total_events: eventsRes.count || events.length,
      active_threats: threats.length,
      open_alerts: alerts.length,
      suspicious_logins: suspiciousLogins,
      escalation_attempts: escalationAttempts,
      autopilot_actions: autopilotActions,
      pending_responses: responses.filter((r: any) => r.status === "pending").length,
    },
    threats,
    alerts,
    recent_responses: responses.slice(0, 20),
    recent_events: events.slice(0, 30),
  }), {
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}
