
-- Runtime Events table
CREATE TABLE public.runtime_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cloud_account_id UUID REFERENCES public.cloud_accounts(id) ON DELETE SET NULL,
  aws_account_id UUID REFERENCES public.aws_accounts(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'aws',
  event_type TEXT NOT NULL,
  event_source TEXT NOT NULL DEFAULT 'cloudtrail',
  severity TEXT NOT NULL DEFAULT 'medium',
  actor TEXT,
  source_ip TEXT,
  target_resource TEXT,
  target_resource_type TEXT,
  region TEXT,
  raw_event JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_suspicious BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Threat Detections table
CREATE TABLE public.threat_detections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  runtime_event_id UUID REFERENCES public.runtime_events(id) ON DELETE SET NULL,
  threat_type TEXT NOT NULL,
  threat_category TEXT NOT NULL DEFAULT 'unknown',
  severity TEXT NOT NULL DEFAULT 'medium',
  confidence_score INTEGER DEFAULT 50,
  description TEXT,
  actor TEXT,
  source_ip TEXT,
  affected_resources JSONB DEFAULT '[]'::jsonb,
  attack_pattern JSONB DEFAULT '{}'::jsonb,
  mitre_technique TEXT,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Security Alerts table
CREATE TABLE public.security_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  threat_detection_id UUID REFERENCES public.threat_detections(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to UUID,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Incident Responses table
CREATE TABLE public.incident_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  alert_id UUID REFERENCES public.security_alerts(id) ON DELETE SET NULL,
  threat_detection_id UUID REFERENCES public.threat_detections(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  action_mode TEXT NOT NULL DEFAULT 'advisory',
  status TEXT NOT NULL DEFAULT 'pending',
  description TEXT,
  execution_details JSONB DEFAULT '{}'::jsonb,
  result JSONB DEFAULT '{}'::jsonb,
  initiated_by UUID,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.runtime_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threat_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_responses ENABLE ROW LEVEL SECURITY;

-- runtime_events policies
CREATE POLICY "Users can view their org runtime events" ON public.runtime_events FOR SELECT USING (organization_id = get_user_organization_id());
CREATE POLICY "Users can insert runtime events for their org" ON public.runtime_events FOR INSERT WITH CHECK (organization_id = get_user_organization_id());
CREATE POLICY "Users can update their org runtime events" ON public.runtime_events FOR UPDATE USING (organization_id = get_user_organization_id());
CREATE POLICY "Users can delete their org runtime events" ON public.runtime_events FOR DELETE USING (organization_id = get_user_organization_id());

-- threat_detections policies
CREATE POLICY "Users can view their org threat detections" ON public.threat_detections FOR SELECT USING (organization_id = get_user_organization_id());
CREATE POLICY "Users can insert threat detections for their org" ON public.threat_detections FOR INSERT WITH CHECK (organization_id = get_user_organization_id());
CREATE POLICY "Users can update their org threat detections" ON public.threat_detections FOR UPDATE USING (organization_id = get_user_organization_id());
CREATE POLICY "Users can delete their org threat detections" ON public.threat_detections FOR DELETE USING (organization_id = get_user_organization_id());

-- security_alerts policies
CREATE POLICY "Users can view their org security alerts" ON public.security_alerts FOR SELECT USING (organization_id = get_user_organization_id());
CREATE POLICY "Users can insert security alerts for their org" ON public.security_alerts FOR INSERT WITH CHECK (organization_id = get_user_organization_id());
CREATE POLICY "Users can update their org security alerts" ON public.security_alerts FOR UPDATE USING (organization_id = get_user_organization_id());
CREATE POLICY "Users can delete their org security alerts" ON public.security_alerts FOR DELETE USING (organization_id = get_user_organization_id());

-- incident_responses policies
CREATE POLICY "Users can view their org incident responses" ON public.incident_responses FOR SELECT USING (organization_id = get_user_organization_id());
CREATE POLICY "Users can insert incident responses for their org" ON public.incident_responses FOR INSERT WITH CHECK (organization_id = get_user_organization_id());
CREATE POLICY "Users can update their org incident responses" ON public.incident_responses FOR UPDATE USING (organization_id = get_user_organization_id());
CREATE POLICY "Users can delete their org incident responses" ON public.incident_responses FOR DELETE USING (organization_id = get_user_organization_id());

-- Enable realtime for threat_detections and security_alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.threat_detections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.security_alerts;
