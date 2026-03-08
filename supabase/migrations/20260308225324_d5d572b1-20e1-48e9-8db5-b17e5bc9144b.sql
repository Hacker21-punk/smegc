
-- Kubernetes Clusters table
CREATE TABLE public.kubernetes_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cloud_account_id UUID REFERENCES public.cloud_accounts(id) ON DELETE SET NULL,
  aws_account_id UUID REFERENCES public.aws_accounts(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'aws',
  cluster_name TEXT NOT NULL,
  cluster_type TEXT NOT NULL DEFAULT 'eks',
  region TEXT,
  version TEXT,
  node_count INTEGER DEFAULT 0,
  network_mode TEXT,
  endpoint TEXT,
  status TEXT NOT NULL DEFAULT 'discovered',
  risk_score INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  last_scan_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kubernetes_clusters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org k8s clusters" ON public.kubernetes_clusters
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert k8s clusters for their org" ON public.kubernetes_clusters
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their org k8s clusters" ON public.kubernetes_clusters
  FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete their org k8s clusters" ON public.kubernetes_clusters
  FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id());

-- Kubernetes Resources table
CREATE TABLE public.kubernetes_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cluster_id UUID NOT NULL REFERENCES public.kubernetes_clusters(id) ON DELETE CASCADE,
  resource_kind TEXT NOT NULL,
  resource_name TEXT NOT NULL,
  namespace TEXT DEFAULT 'default',
  labels JSONB DEFAULT '{}'::jsonb,
  annotations JSONB DEFAULT '{}'::jsonb,
  spec JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'active',
  risk_score INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kubernetes_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org k8s resources" ON public.kubernetes_resources
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert k8s resources for their org" ON public.kubernetes_resources
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their org k8s resources" ON public.kubernetes_resources
  FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete their org k8s resources" ON public.kubernetes_resources
  FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id());

-- Kubernetes Security Findings table
CREATE TABLE public.kubernetes_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cluster_id UUID NOT NULL REFERENCES public.kubernetes_clusters(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES public.kubernetes_resources(id) ON DELETE SET NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  resource_kind TEXT,
  resource_name TEXT,
  namespace TEXT,
  remediation_steps TEXT[] DEFAULT '{}',
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  risk_score_contribution INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kubernetes_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org k8s findings" ON public.kubernetes_findings
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert k8s findings for their org" ON public.kubernetes_findings
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their org k8s findings" ON public.kubernetes_findings
  FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete their org k8s findings" ON public.kubernetes_findings
  FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id());

-- Enable realtime for findings
ALTER PUBLICATION supabase_realtime ADD TABLE public.kubernetes_findings;
