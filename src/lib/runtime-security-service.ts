import { supabase } from "@/integrations/supabase/client";

export interface RuntimeSummary {
  total_events: number;
  active_threats: number;
  open_alerts: number;
  suspicious_logins: number;
  escalation_attempts: number;
  autopilot_actions: number;
  pending_responses: number;
}

export interface ThreatDetection {
  id: string;
  threat_type: string;
  threat_category: string;
  severity: string;
  confidence_score: number;
  description: string;
  actor: string;
  source_ip: string;
  affected_resources: any[];
  mitre_technique: string;
  is_resolved: boolean;
  detected_at: string;
}

export interface SecurityAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
}

export interface IncidentResponse {
  id: string;
  action_type: string;
  action_mode: string;
  status: string;
  description: string;
  created_at: string;
}

async function invokeFunction(action: string, extra: Record<string, any> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const { data, error } = await supabase.functions.invoke("runtime-threat-detector", {
    body: { action, ...extra },
  });

  if (error) throw error;
  return data;
}

export async function getRuntimeSummary(): Promise<{
  summary: RuntimeSummary;
  threats: ThreatDetection[];
  alerts: SecurityAlert[];
  recent_responses: IncidentResponse[];
  recent_events: any[];
}> {
  return invokeFunction("get_summary");
}

export async function simulateRuntimeEvents(): Promise<{
  events_simulated: number;
  threats: number;
  alerts: number;
  responses: number;
}> {
  return invokeFunction("simulate_events");
}

export async function ingestRuntimeEvents(events: any[]): Promise<{ ingested: number }> {
  return invokeFunction("ingest_events", { events });
}

export async function runThreatDetection(): Promise<{
  processed: number;
  threats: number;
  alerts: number;
  responses: number;
}> {
  return invokeFunction("run_detection");
}

export async function resolveThreat(threatId: string): Promise<void> {
  const { error } = await supabase
    .from("threat_detections")
    .update({ is_resolved: true, resolved_at: new Date().toISOString() })
    .eq("id", threatId);
  if (error) throw error;
}

export async function resolveAlert(alertId: string): Promise<void> {
  const { error } = await supabase
    .from("security_alerts")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", alertId);
  if (error) throw error;
}

export async function executeIncidentResponse(responseId: string): Promise<void> {
  const { error } = await supabase
    .from("incident_responses")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", responseId);
  if (error) throw error;
}
