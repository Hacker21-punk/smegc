-- Create enum types
CREATE TYPE public.account_status AS ENUM ('pending', 'connected', 'disconnected', 'error');
CREATE TYPE public.scan_status AS ENUM ('pending', 'running', 'completed', 'failed');
CREATE TYPE public.finding_severity AS ENUM ('critical', 'high', 'medium', 'low', 'info');
CREATE TYPE public.aws_service AS ENUM ('security_groups', 'iam', 's3', 'ec2', 'rds', 'vpc', 'cost');

-- Organizations table (for multi-tenant support)
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User profiles with organization membership
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  full_name TEXT,
  phone TEXT,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- AWS Accounts connected by customers
CREATE TABLE public.aws_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  account_alias TEXT,
  external_id UUID NOT NULL DEFAULT gen_random_uuid(),
  role_arn TEXT,
  status account_status NOT NULL DEFAULT 'pending',
  last_scan_at TIMESTAMP WITH TIME ZONE,
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, account_id)
);

-- Scan jobs for each AWS account
CREATE TABLE public.scan_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  aws_account_id UUID NOT NULL REFERENCES public.aws_accounts(id) ON DELETE CASCADE,
  status scan_status NOT NULL DEFAULT 'pending',
  services_scanned aws_service[] DEFAULT '{}',
  findings_count INTEGER DEFAULT 0,
  risk_score INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Security findings from scans
CREATE TABLE public.security_findings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_job_id UUID NOT NULL REFERENCES public.scan_jobs(id) ON DELETE CASCADE,
  aws_account_id UUID NOT NULL REFERENCES public.aws_accounts(id) ON DELETE CASCADE,
  service aws_service NOT NULL,
  resource_id TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity finding_severity NOT NULL,
  remediation_steps TEXT[],
  cloudformation_template TEXT,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Risk score history for trending
CREATE TABLE public.risk_score_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  aws_account_id UUID NOT NULL REFERENCES public.aws_accounts(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(aws_account_id, recorded_at)
);

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aws_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_score_history ENABLE ROW LEVEL SECURITY;

-- Function to get user's organization
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$;

-- RLS Policies for organizations
CREATE POLICY "Users can view their organization" ON public.organizations
  FOR SELECT USING (id = public.get_user_organization_id());

CREATE POLICY "Users can update their organization" ON public.organizations
  FOR UPDATE USING (id = public.get_user_organization_id());

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- RLS Policies for aws_accounts
CREATE POLICY "Users can view their org AWS accounts" ON public.aws_accounts
  FOR SELECT USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can insert AWS accounts for their org" ON public.aws_accounts
  FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can update their org AWS accounts" ON public.aws_accounts
  FOR UPDATE USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can delete their org AWS accounts" ON public.aws_accounts
  FOR DELETE USING (organization_id = public.get_user_organization_id());

-- RLS Policies for scan_jobs (via aws_accounts)
CREATE POLICY "Users can view their org scan jobs" ON public.scan_jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.aws_accounts 
      WHERE aws_accounts.id = scan_jobs.aws_account_id 
      AND aws_accounts.organization_id = public.get_user_organization_id()
    )
  );

-- RLS Policies for security_findings (via aws_accounts)
CREATE POLICY "Users can view their org findings" ON public.security_findings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.aws_accounts 
      WHERE aws_accounts.id = security_findings.aws_account_id 
      AND aws_accounts.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "Users can update their org findings" ON public.security_findings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.aws_accounts 
      WHERE aws_accounts.id = security_findings.aws_account_id 
      AND aws_accounts.organization_id = public.get_user_organization_id()
    )
  );

-- RLS Policies for risk_score_history
CREATE POLICY "Users can view their org risk history" ON public.risk_score_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.aws_accounts 
      WHERE aws_accounts.id = risk_score_history.aws_account_id 
      AND aws_accounts.organization_id = public.get_user_organization_id()
    )
  );

-- Trigger to create organization and profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Create a new organization for the user
  INSERT INTO public.organizations (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Organization'))
  RETURNING id INTO new_org_id;
  
  -- Create user profile linked to the organization
  INSERT INTO public.profiles (id, organization_id, full_name, phone)
  VALUES (
    NEW.id,
    new_org_id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone'
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add update triggers
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_aws_accounts_updated_at
  BEFORE UPDATE ON public.aws_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_aws_accounts_org ON public.aws_accounts(organization_id);
CREATE INDEX idx_scan_jobs_account ON public.scan_jobs(aws_account_id);
CREATE INDEX idx_scan_jobs_status ON public.scan_jobs(status);
CREATE INDEX idx_findings_account ON public.security_findings(aws_account_id);
CREATE INDEX idx_findings_severity ON public.security_findings(severity);
CREATE INDEX idx_risk_history_account ON public.risk_score_history(aws_account_id);