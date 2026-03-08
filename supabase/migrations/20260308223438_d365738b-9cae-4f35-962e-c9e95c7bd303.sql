
-- Create cloud_accounts table for multi-cloud support (Azure, GCP)
-- AWS accounts remain in aws_accounts table for backward compatibility
CREATE TABLE public.cloud_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider public.cloud_provider NOT NULL,
  account_name TEXT NOT NULL,
  account_identifier TEXT NOT NULL,
  credentials_encrypted JSONB NOT NULL DEFAULT '{}'::jsonb,
  status public.account_status NOT NULL DEFAULT 'pending'::account_status,
  last_scan_at TIMESTAMP WITH TIME ZONE,
  risk_score INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, provider, account_identifier)
);

-- Enable RLS
ALTER TABLE public.cloud_accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their org cloud accounts"
  ON public.cloud_accounts FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can insert cloud accounts for their org"
  ON public.cloud_accounts FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can update their org cloud accounts"
  ON public.cloud_accounts FOR UPDATE
  TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can delete their org cloud accounts"
  ON public.cloud_accounts FOR DELETE
  TO authenticated
  USING (organization_id = public.get_user_organization_id());

-- Update trigger
CREATE TRIGGER update_cloud_accounts_updated_at
  BEFORE UPDATE ON public.cloud_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add cloud_account_id FK from cloud_assets to cloud_accounts
-- (cloud_assets already has cloud_account_id referencing aws_accounts, 
--  we add a new column for generic cloud accounts)
ALTER TABLE public.cloud_assets ADD COLUMN IF NOT EXISTS generic_cloud_account_id UUID REFERENCES public.cloud_accounts(id) ON DELETE SET NULL;
