
-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE public.graph_node_type AS ENUM (
  'iam_user', 'iam_role', 'iam_group', 'iam_policy',
  'ec2_instance', 's3_bucket', 'rds_instance', 'security_group', 'vpc', 'subnet',
  'lambda_function', 'ecs_cluster', 'eks_cluster',
  'internet_gateway', 'nat_gateway', 'load_balancer',
  'kms_key', 'secrets_manager',
  'external_internet'
);

CREATE TYPE public.graph_edge_type AS ENUM (
  'has_permission', 'can_assume_role', 'trusts',
  'network_access', 'attached_to', 'member_of',
  'exposes', 'encrypts', 'routes_to', 'contains'
);

CREATE TYPE public.attack_path_severity AS ENUM (
  'critical', 'high', 'medium', 'low'
);

CREATE TYPE public.attack_path_status AS ENUM (
  'active', 'mitigated', 'accepted', 'false_positive'
);

CREATE TYPE public.remediation_status AS ENUM (
  'recommended', 'approved', 'in_progress', 'completed', 'failed', 'rolled_back', 'skipped'
);

CREATE TYPE public.remediation_mode AS ENUM (
  'read_only', 'write'
);

-- ============================================================
-- SECURITY GRAPH NODES
-- ============================================================

CREATE TABLE public.security_graph_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  aws_account_id uuid REFERENCES public.aws_accounts(id) ON DELETE CASCADE,
  node_type public.graph_node_type NOT NULL,
  resource_id text NOT NULL,
  resource_name text,
  resource_arn text,
  provider text NOT NULL DEFAULT 'aws',
  region text,
  is_public boolean NOT NULL DEFAULT false,
  is_sensitive boolean NOT NULL DEFAULT false,
  risk_score integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, provider, resource_id)
);

ALTER TABLE public.security_graph_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org graph nodes"
  ON public.security_graph_nodes FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can manage their org graph nodes"
  ON public.security_graph_nodes FOR ALL TO authenticated
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

-- ============================================================
-- SECURITY GRAPH EDGES
-- ============================================================

CREATE TABLE public.security_graph_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_node_id uuid NOT NULL REFERENCES public.security_graph_nodes(id) ON DELETE CASCADE,
  target_node_id uuid NOT NULL REFERENCES public.security_graph_nodes(id) ON DELETE CASCADE,
  edge_type public.graph_edge_type NOT NULL,
  weight integer DEFAULT 1,
  is_risky boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, source_node_id, target_node_id, edge_type)
);

ALTER TABLE public.security_graph_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org graph edges"
  ON public.security_graph_edges FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can manage their org graph edges"
  ON public.security_graph_edges FOR ALL TO authenticated
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

-- ============================================================
-- ATTACK PATHS
-- ============================================================

CREATE TABLE public.attack_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  aws_account_id uuid REFERENCES public.aws_accounts(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  severity public.attack_path_severity NOT NULL,
  status public.attack_path_status NOT NULL DEFAULT 'active',
  risk_score integer NOT NULL DEFAULT 0,
  entry_point_node_id uuid REFERENCES public.security_graph_nodes(id) ON DELETE SET NULL,
  target_node_id uuid REFERENCES public.security_graph_nodes(id) ON DELETE SET NULL,
  path_length integer NOT NULL DEFAULT 0,
  blast_radius integer NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  mitigated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.attack_paths ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org attack paths"
  ON public.attack_paths FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can manage their org attack paths"
  ON public.attack_paths FOR ALL TO authenticated
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

-- ============================================================
-- ATTACK PATH STEPS (ordered nodes in a path)
-- ============================================================

CREATE TABLE public.attack_path_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attack_path_id uuid NOT NULL REFERENCES public.attack_paths(id) ON DELETE CASCADE,
  node_id uuid NOT NULL REFERENCES public.security_graph_nodes(id) ON DELETE CASCADE,
  edge_id uuid REFERENCES public.security_graph_edges(id) ON DELETE SET NULL,
  step_order integer NOT NULL,
  technique text,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.attack_path_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org attack path steps"
  ON public.attack_path_steps FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.attack_paths ap
      WHERE ap.id = attack_path_steps.attack_path_id
      AND ap.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Users can manage their org attack path steps"
  ON public.attack_path_steps FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.attack_paths ap
      WHERE ap.id = attack_path_steps.attack_path_id
      AND ap.organization_id = get_user_organization_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.attack_paths ap
      WHERE ap.id = attack_path_steps.attack_path_id
      AND ap.organization_id = get_user_organization_id()
    )
  );

-- ============================================================
-- REMEDIATION ACTIONS
-- ============================================================

CREATE TABLE public.remediation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  finding_id uuid REFERENCES public.security_findings(id) ON DELETE SET NULL,
  attack_path_id uuid REFERENCES public.attack_paths(id) ON DELETE SET NULL,
  aws_account_id uuid REFERENCES public.aws_accounts(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  action_type text NOT NULL,
  mode public.remediation_mode NOT NULL DEFAULT 'read_only',
  status public.remediation_status NOT NULL DEFAULT 'recommended',
  priority integer DEFAULT 50,
  execution_plan jsonb DEFAULT '{}'::jsonb,
  rollback_plan jsonb DEFAULT '{}'::jsonb,
  result jsonb DEFAULT '{}'::jsonb,
  initiated_by uuid,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.remediation_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org remediation actions"
  ON public.remediation_actions FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can manage their org remediation actions"
  ON public.remediation_actions FOR ALL TO authenticated
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

-- ============================================================
-- INDEXES for performance
-- ============================================================

CREATE INDEX idx_graph_nodes_org ON public.security_graph_nodes(organization_id);
CREATE INDEX idx_graph_nodes_type ON public.security_graph_nodes(node_type);
CREATE INDEX idx_graph_nodes_account ON public.security_graph_nodes(aws_account_id);
CREATE INDEX idx_graph_nodes_public ON public.security_graph_nodes(is_public) WHERE is_public = true;
CREATE INDEX idx_graph_nodes_sensitive ON public.security_graph_nodes(is_sensitive) WHERE is_sensitive = true;

CREATE INDEX idx_graph_edges_org ON public.security_graph_edges(organization_id);
CREATE INDEX idx_graph_edges_source ON public.security_graph_edges(source_node_id);
CREATE INDEX idx_graph_edges_target ON public.security_graph_edges(target_node_id);
CREATE INDEX idx_graph_edges_risky ON public.security_graph_edges(is_risky) WHERE is_risky = true;

CREATE INDEX idx_attack_paths_org ON public.attack_paths(organization_id);
CREATE INDEX idx_attack_paths_severity ON public.attack_paths(severity);
CREATE INDEX idx_attack_paths_status ON public.attack_paths(status);
CREATE INDEX idx_attack_paths_account ON public.attack_paths(aws_account_id);

CREATE INDEX idx_attack_path_steps_path ON public.attack_path_steps(attack_path_id, step_order);

CREATE INDEX idx_remediation_org ON public.remediation_actions(organization_id);
CREATE INDEX idx_remediation_status ON public.remediation_actions(status);
CREATE INDEX idx_remediation_finding ON public.remediation_actions(finding_id);
CREATE INDEX idx_remediation_path ON public.remediation_actions(attack_path_id);

-- ============================================================
-- Enable realtime for attack paths
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.attack_paths;
ALTER PUBLICATION supabase_realtime ADD TABLE public.remediation_actions;

-- ============================================================
-- Updated_at triggers
-- ============================================================
CREATE TRIGGER update_security_graph_nodes_updated_at
  BEFORE UPDATE ON public.security_graph_nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attack_paths_updated_at
  BEFORE UPDATE ON public.attack_paths
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_remediation_actions_updated_at
  BEFORE UPDATE ON public.remediation_actions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
