
-- Cloud provider enum
CREATE TYPE public.cloud_provider AS ENUM ('aws', 'azure', 'gcp');

-- Resource type enum for multi-cloud assets
CREATE TYPE public.cloud_resource_type AS ENUM (
  'compute', 'container', 'serverless', 'storage', 'database', 
  'identity', 'networking', 'security', 'other'
);

-- Asset status enum
CREATE TYPE public.asset_status AS ENUM ('active', 'inactive', 'unknown', 'deleted');

-- Cloud assets table
CREATE TABLE public.cloud_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cloud_account_id UUID REFERENCES public.aws_accounts(id) ON DELETE SET NULL,
  provider cloud_provider NOT NULL,
  resource_type cloud_resource_type NOT NULL DEFAULT 'other',
  resource_id TEXT NOT NULL,
  resource_name TEXT,
  region TEXT,
  status asset_status NOT NULL DEFAULT 'active',
  risk_score INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  tags JSONB DEFAULT '{}',
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add write_access_enabled to aws_accounts for optional write mode
ALTER TABLE public.aws_accounts ADD COLUMN write_access_enabled BOOLEAN NOT NULL DEFAULT false;

-- Enable RLS
ALTER TABLE public.cloud_assets ENABLE ROW LEVEL SECURITY;

-- RLS policies for cloud_assets
CREATE POLICY "Users can view their org assets"
  ON public.cloud_assets FOR SELECT
  TO authenticated
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert assets for their org"
  ON public.cloud_assets FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their org assets"
  ON public.cloud_assets FOR UPDATE
  TO authenticated
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete their org assets"
  ON public.cloud_assets FOR DELETE
  TO authenticated
  USING (organization_id = get_user_organization_id());

-- Index for fast lookups
CREATE INDEX idx_cloud_assets_org_provider ON public.cloud_assets(organization_id, provider);
CREATE INDEX idx_cloud_assets_resource_type ON public.cloud_assets(resource_type);

-- Trigger for updated_at
CREATE TRIGGER update_cloud_assets_updated_at
  BEFORE UPDATE ON public.cloud_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
