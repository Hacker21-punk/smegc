-- Add enhanced security analysis fields to security_findings table
ALTER TABLE public.security_findings
ADD COLUMN IF NOT EXISTS risk_score_contribution integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS impact_assessment text,
ADD COLUMN IF NOT EXISTS execution_tag text CHECK (execution_tag IN ('SAFE_AUTOMATABLE', 'REQUIRES_REVIEW', 'MANUAL_ONLY')),
ADD COLUMN IF NOT EXISTS rollback_guidance text,
ADD COLUMN IF NOT EXISTS compliance_tags text[];

-- Add comment for documentation
COMMENT ON COLUMN public.security_findings.risk_score_contribution IS 'Risk score points (1-10) contributed by this finding';
COMMENT ON COLUMN public.security_findings.impact_assessment IS 'Assessment of potential impact if remediation is applied';
COMMENT ON COLUMN public.security_findings.execution_tag IS 'Execution readiness classification for future automation';
COMMENT ON COLUMN public.security_findings.rollback_guidance IS 'Instructions for reverting the remediation if needed';
COMMENT ON COLUMN public.security_findings.compliance_tags IS 'Compliance frameworks this finding relates to (ISO27001, SOC2, GDPR, DPDP)';