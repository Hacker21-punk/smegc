-- 1. Roles system (invoker-security to avoid privileged-function exposure)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin'::public.app_role FROM public.profiles p
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Organization helper no longer needs elevated privileges
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$;

-- 3. Sign-up trigger stays privileged but is no longer directly callable
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
BEGIN
  INSERT INTO public.organizations (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Organization'))
  RETURNING id INTO new_org_id;

  INSERT INTO public.profiles (id, organization_id, full_name, phone)
  VALUES (
    NEW.id,
    new_org_id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone'
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 4. Restrict every organization-data policy to signed-in users
ALTER POLICY "Users can delete their org AWS accounts" ON public.aws_accounts TO authenticated;
ALTER POLICY "Users can view their org AWS accounts" ON public.aws_accounts TO authenticated;
ALTER POLICY "Users can insert AWS accounts for their org" ON public.aws_accounts TO authenticated;
ALTER POLICY "Users can update their org AWS accounts" ON public.aws_accounts TO authenticated;
ALTER POLICY "Users can insert incident responses for their org" ON public.incident_responses TO authenticated;
ALTER POLICY "Users can view their org incident responses" ON public.incident_responses TO authenticated;
ALTER POLICY "Users can delete their org incident responses" ON public.incident_responses TO authenticated;
ALTER POLICY "Users can update their org incident responses" ON public.incident_responses TO authenticated;
ALTER POLICY "Users can view their organization" ON public.organizations TO authenticated;
ALTER POLICY "Users can update their organization" ON public.organizations TO authenticated;
ALTER POLICY "Users can manage their org enforcement actions" ON public.policy_enforcement_actions TO authenticated;
ALTER POLICY "Users can view their org enforcement actions" ON public.policy_enforcement_actions TO authenticated;
ALTER POLICY "Users can manage their org violations" ON public.policy_violations TO authenticated;
ALTER POLICY "Users can view their org violations" ON public.policy_violations TO authenticated;
ALTER POLICY "Users can update own profile" ON public.profiles TO authenticated;
ALTER POLICY "Users can insert own profile" ON public.profiles TO authenticated;
ALTER POLICY "Users can delete own profile" ON public.profiles TO authenticated;
ALTER POLICY "Users can view own profile" ON public.profiles TO authenticated;
ALTER POLICY "Users can view their org risk history" ON public.risk_score_history TO authenticated;
ALTER POLICY "Users can delete their org runtime events" ON public.runtime_events TO authenticated;
ALTER POLICY "Users can view their org runtime events" ON public.runtime_events TO authenticated;
ALTER POLICY "Users can insert runtime events for their org" ON public.runtime_events TO authenticated;
ALTER POLICY "Users can update their org runtime events" ON public.runtime_events TO authenticated;
ALTER POLICY "Users can view their org scan jobs" ON public.scan_jobs TO authenticated;
ALTER POLICY "Users can view their org security alerts" ON public.security_alerts TO authenticated;
ALTER POLICY "Users can delete their org security alerts" ON public.security_alerts TO authenticated;
ALTER POLICY "Users can update their org security alerts" ON public.security_alerts TO authenticated;
ALTER POLICY "Users can insert security alerts for their org" ON public.security_alerts TO authenticated;
ALTER POLICY "Users can update their org findings" ON public.security_findings TO authenticated;
ALTER POLICY "Users can view their org findings" ON public.security_findings TO authenticated;
ALTER POLICY "Users can manage their org policies" ON public.security_policies TO authenticated;
ALTER POLICY "Users can view their org policies" ON public.security_policies TO authenticated;
ALTER POLICY "Users can update their org threat detections" ON public.threat_detections TO authenticated;
ALTER POLICY "Users can insert threat detections for their org" ON public.threat_detections TO authenticated;
ALTER POLICY "Users can view their org threat detections" ON public.threat_detections TO authenticated;
ALTER POLICY "Users can delete their org threat detections" ON public.threat_detections TO authenticated;

-- 5. Remove anonymous grants on organization data
REVOKE ALL ON public.aws_accounts, public.cloud_accounts, public.cloud_assets,
  public.security_findings, public.scan_jobs, public.risk_score_history,
  public.security_policies, public.policy_violations, public.policy_enforcement_actions,
  public.runtime_events, public.threat_detections, public.security_alerts,
  public.incident_responses, public.organizations, public.profiles,
  public.attack_paths, public.attack_path_steps, public.security_graph_nodes,
  public.security_graph_edges, public.remediation_actions,
  public.kubernetes_clusters, public.kubernetes_resources, public.kubernetes_findings
FROM anon;

-- 6. Contact submissions: backend-only
REVOKE ALL ON public.contact_submissions FROM anon, authenticated;
GRANT ALL ON public.contact_submissions TO service_role;
DROP POLICY IF EXISTS "Contact submissions are backend-only" ON public.contact_submissions;
CREATE POLICY "Contact submissions are backend-only"
  ON public.contact_submissions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 7. Hide AWS connection secrets from client reads
ALTER TABLE public.aws_accounts
  ADD COLUMN IF NOT EXISTS role_configured boolean
  GENERATED ALWAYS AS (role_arn IS NOT NULL) STORED;

REVOKE SELECT ON public.aws_accounts FROM authenticated;
GRANT SELECT (id, organization_id, account_id, account_alias, status, last_scan_at,
              risk_score, created_at, updated_at, write_access_enabled, role_configured)
  ON public.aws_accounts TO authenticated;

-- 8. Hide cloud credential blobs from client reads
REVOKE SELECT ON public.cloud_accounts FROM authenticated;
GRANT SELECT (id, organization_id, provider, account_name, account_identifier, status,
              last_scan_at, risk_score, metadata, created_at, updated_at)
  ON public.cloud_accounts TO authenticated;

-- 9. Extension out of public schema (pg_net does not support SET SCHEMA)
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;