
-- Enum for policy types
CREATE TYPE public.policy_type AS ENUM (
  'no_public_storage',
  'admin_mfa_required',
  'encryption_required',
  'backup_required',
  'no_open_ssh',
  'no_public_databases',
  'logging_required',
  'credential_rotation',
  'custom'
);

-- Enum for policy scope
CREATE TYPE public.policy_scope AS ENUM ('global', 'account', 'asset');

-- Enum for enforcement mode
CREATE TYPE public.enforcement_mode AS ENUM ('advisory', 'autopilot');

-- Enum for violation status
CREATE TYPE public.violation_status AS ENUM ('open', 'remediating', 'resolved', 'accepted', 'suppressed');

-- Enum for enforcement action status
CREATE TYPE public.enforcement_action_status AS ENUM ('pending', 'executing', 'completed', 'failed', 'rolled_back');

-- Security Policies table
CREATE TABLE public.security_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  policy_type public.policy_type NOT NULL,
  scope public.policy_scope NOT NULL DEFAULT 'global',
  enforcement_mode public.enforcement_mode NOT NULL DEFAULT 'advisory',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  severity TEXT NOT NULL DEFAULT 'high',
  aws_account_id UUID REFERENCES public.aws_accounts(id) ON DELETE CASCADE,
  asset_filter JSONB DEFAULT '{}'::jsonb,
  evaluation_criteria JSONB DEFAULT '{}'::jsonb,
  remediation_template JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Policy Violations table
CREATE TABLE public.policy_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES public.security_policies(id) ON DELETE CASCADE,
  aws_account_id UUID REFERENCES public.aws_accounts(id) ON DELETE SET NULL,
  resource_id TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_name TEXT,
  resource_arn TEXT,
  region TEXT,
  status public.violation_status NOT NULL DEFAULT 'open',
  severity TEXT NOT NULL DEFAULT 'high',
  violation_details JSONB DEFAULT '{}'::jsonb,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Policy Enforcement Actions table
CREATE TABLE public.policy_enforcement_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  violation_id UUID NOT NULL REFERENCES public.policy_violations(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES public.security_policies(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  enforcement_mode public.enforcement_mode NOT NULL,
  status public.enforcement_action_status NOT NULL DEFAULT 'pending',
  execution_details JSONB DEFAULT '{}'::jsonb,
  result JSONB DEFAULT '{}'::jsonb,
  initiated_by UUID,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_enforcement_actions ENABLE ROW LEVEL SECURITY;

-- RLS for security_policies
CREATE POLICY "Users can view their org policies"
  ON public.security_policies FOR SELECT
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can manage their org policies"
  ON public.security_policies FOR ALL
  USING (organization_id = public.get_user_organization_id())
  WITH CHECK (organization_id = public.get_user_organization_id());

-- RLS for policy_violations
CREATE POLICY "Users can view their org violations"
  ON public.policy_violations FOR SELECT
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can manage their org violations"
  ON public.policy_violations FOR ALL
  USING (organization_id = public.get_user_organization_id())
  WITH CHECK (organization_id = public.get_user_organization_id());

-- RLS for policy_enforcement_actions
CREATE POLICY "Users can view their org enforcement actions"
  ON public.policy_enforcement_actions FOR SELECT
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can manage their org enforcement actions"
  ON public.policy_enforcement_actions FOR ALL
  USING (organization_id = public.get_user_organization_id())
  WITH CHECK (organization_id = public.get_user_organization_id());

-- Updated_at triggers
CREATE TRIGGER update_security_policies_updated_at
  BEFORE UPDATE ON public.security_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_policy_violations_updated_at
  BEFORE UPDATE ON public.policy_violations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_security_policies_org ON public.security_policies(organization_id);
CREATE INDEX idx_policy_violations_org ON public.policy_violations(organization_id);
CREATE INDEX idx_policy_violations_policy ON public.policy_violations(policy_id);
CREATE INDEX idx_policy_violations_status ON public.policy_violations(status);
CREATE INDEX idx_enforcement_actions_org ON public.policy_enforcement_actions(organization_id);
CREATE INDEX idx_enforcement_actions_violation ON public.policy_enforcement_actions(violation_id);
