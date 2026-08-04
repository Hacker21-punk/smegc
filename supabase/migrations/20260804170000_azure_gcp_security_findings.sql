-- 1. Modify public.security_findings table
ALTER TABLE public.security_findings ALTER COLUMN service TYPE TEXT;
ALTER TABLE public.security_findings ALTER COLUMN aws_account_id DROP NOT NULL;
ALTER TABLE public.security_findings ALTER COLUMN scan_job_id DROP NOT NULL;
ALTER TABLE public.security_findings ADD COLUMN IF NOT EXISTS cloud_account_id UUID REFERENCES public.cloud_accounts(id) ON DELETE CASCADE;

ALTER TABLE public.security_findings ADD CONSTRAINT check_only_one_account 
  CHECK ((aws_account_id IS NULL AND cloud_account_id IS NOT NULL) OR (aws_account_id IS NOT NULL AND cloud_account_id IS NULL));

-- Update RLS Policies for security_findings
DROP POLICY IF EXISTS "Users can view their org findings" ON public.security_findings;
DROP POLICY IF EXISTS "Users can update their org findings" ON public.security_findings;

CREATE POLICY "Users can view their org findings" ON public.security_findings
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.aws_accounts 
      WHERE aws_accounts.id = security_findings.aws_account_id 
      AND aws_accounts.organization_id = public.get_user_organization_id()
    ) OR EXISTS (
      SELECT 1 FROM public.cloud_accounts
      WHERE cloud_accounts.id = security_findings.cloud_account_id
      AND cloud_accounts.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "Users can update their org findings" ON public.security_findings
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.aws_accounts 
      WHERE aws_accounts.id = security_findings.aws_account_id 
      AND aws_accounts.organization_id = public.get_user_organization_id()
    ) OR EXISTS (
      SELECT 1 FROM public.cloud_accounts
      WHERE cloud_accounts.id = security_findings.cloud_account_id
      AND cloud_accounts.organization_id = public.get_user_organization_id()
    )
  );

-- 2. Modify public.risk_score_history table
ALTER TABLE public.risk_score_history ALTER COLUMN aws_account_id DROP NOT NULL;
ALTER TABLE public.risk_score_history ADD COLUMN IF NOT EXISTS cloud_account_id UUID REFERENCES public.cloud_accounts(id) ON DELETE CASCADE;

ALTER TABLE public.risk_score_history ADD CONSTRAINT check_only_one_account_history 
  CHECK ((aws_account_id IS NULL AND cloud_account_id IS NOT NULL) OR (aws_account_id IS NOT NULL AND cloud_account_id IS NULL));

ALTER TABLE public.risk_score_history DROP CONSTRAINT IF EXISTS risk_score_history_aws_account_id_recorded_at_key;

CREATE UNIQUE INDEX IF NOT EXISTS risk_score_history_aws_account_idx 
  ON public.risk_score_history (aws_account_id, recorded_at) WHERE aws_account_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS risk_score_history_cloud_account_idx 
  ON public.risk_score_history (cloud_account_id, recorded_at) WHERE cloud_account_id IS NOT NULL;

-- Update RLS Policies for risk_score_history
DROP POLICY IF EXISTS "Users can view their org risk history" ON public.risk_score_history;

CREATE POLICY "Users can view their org risk history" ON public.risk_score_history
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.aws_accounts 
      WHERE aws_accounts.id = risk_score_history.aws_account_id 
      AND aws_accounts.organization_id = public.get_user_organization_id()
    ) OR EXISTS (
      SELECT 1 FROM public.cloud_accounts
      WHERE cloud_accounts.id = risk_score_history.cloud_account_id
      AND cloud_accounts.organization_id = public.get_user_organization_id()
    )
  );
