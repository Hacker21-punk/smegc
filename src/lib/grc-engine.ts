/**
 * GRC (Governance, Risk & Compliance) reporting engine.
 *
 * Builds an audit-ready GRC pack from real telemetry only:
 *  - Governance: security policies, enforcement mode, ownership
 *  - Risk: risk register derived from findings + attack paths (likelihood x impact)
 *  - Compliance: multi-framework control posture (read-only coverage, never pass/fail)
 *  - Exceptions: accepted / suppressed risks with justification trail
 *
 * All scoring is deterministic so the same inputs always produce the same report,
 * which is a requirement for evidence reproducibility during audits.
 */

import {
  ComplianceFramework,
  FindingForCompliance,
  generateComplianceReport,
  getAvailableFrameworks,
  getFrameworkConfig,
} from "./compliance-evidence-engine";

export type RiskRating = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type RiskTreatment = "MITIGATE" | "MONITOR" | "ACCEPT" | "TRANSFER";
export type RiskStatus = "OPEN" | "IN_TREATMENT" | "CLOSED" | "ACCEPTED";

export interface RiskRegisterEntry {
  risk_id: string;
  source: "FINDING" | "ATTACK_PATH" | "POLICY_VIOLATION";
  title: string;
  category: string;
  scope: string;
  likelihood: number; // 1-5
  impact: number; // 1-5
  inherent_score: number; // 1-25
  residual_score: number; // 1-25 after mitigating controls
  rating: RiskRating;
  treatment: RiskTreatment;
  status: RiskStatus;
  control_refs: string[];
  identified_at: string;
  last_reviewed_at: string;
  notes: string;
}

export interface PolicyGovernanceEntry {
  policy_id: string;
  name: string;
  policy_type: string;
  scope: string;
  enforcement_mode: string;
  is_enabled: boolean;
  severity: string;
  open_violations: number;
  resolved_violations: number;
  effectiveness: number; // 0-100
  last_updated_at: string;
}

export interface ExceptionEntry {
  exception_id: string;
  subject: string;
  source: "POLICY_VIOLATION" | "ATTACK_PATH" | "FINDING";
  severity: string;
  reason: string;
  raised_at: string;
  scope: string;
}

export interface FrameworkPosture {
  framework: ComplianceFramework;
  display_name: string;
  coverage_percentage: number;
  total_controls: number;
  controls_supported: number;
  controls_partial: number;
  controls_missing: number;
}

export interface GRCReport {
  report_id: string;
  generated_at: string;
  scope_label: string;
  period_start: string;
  period_end: string;
  maturity_score: number; // 0-100
  maturity_tier: string;
  summary: {
    total_risks: number;
    critical_risks: number;
    high_risks: number;
    open_risks: number;
    accepted_risks: number;
    closed_risks: number;
    avg_residual_score: number;
    policies_total: number;
    policies_enabled: number;
    open_violations: number;
    exceptions: number;
    accounts_in_scope: number;
    assets_in_scope: number;
  };
  risk_register: RiskRegisterEntry[];
  policy_governance: PolicyGovernanceEntry[];
  exceptions: ExceptionEntry[];
  framework_posture: FrameworkPosture[];
  attestations: string[];
}

/* ------------------------------------------------------------------ inputs */

export interface GRCInputs {
  scopeLabel: string;
  accountsInScope: number;
  assetsInScope: number;
  findings: FindingForCompliance[];
  attackPaths: Array<{
    id: string;
    title: string;
    severity: string;
    status: string;
    risk_score: number | null;
    blast_radius: number | null;
    detected_at: string;
    updated_at?: string | null;
  }>;
  policies: Array<{
    id: string;
    name: string;
    policy_type: string;
    scope: string;
    enforcement_mode: string;
    is_enabled: boolean;
    severity: string;
    updated_at: string;
  }>;
  violations: Array<{
    id: string;
    policy_id: string;
    status: string;
    severity: string;
    resource_name: string | null;
    resource_type: string;
    region: string | null;
    detected_at: string;
  }>;
}

/* ---------------------------------------------------------------- scoring */

const SEVERITY_IMPACT: Record<string, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

const SERVICE_CATEGORY: Record<string, string> = {
  iam: "Identity & Access Management",
  s3: "Data Protection",
  rds: "Data Protection",
  ec2: "Infrastructure Security",
  vpc: "Network Security",
  security_groups: "Network Security",
  cost: "Operational Resilience",
};

function ratingFromScore(score: number): RiskRating {
  if (score >= 17) return "CRITICAL";
  if (score >= 11) return "HIGH";
  if (score >= 6) return "MEDIUM";
  return "LOW";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/* ------------------------------------------------------------- generation */

export function generateGRCReport(inputs: GRCInputs): GRCReport {
  const now = new Date();
  const register: RiskRegisterEntry[] = [];

  // --- Risks derived from security findings
  for (const f of inputs.findings) {
    const impact = SEVERITY_IMPACT[f.severity] ?? 3;
    // Unresolved findings on public/identity services are more likely to be exploited.
    const likelihood = clamp(
      (f.is_resolved ? 1 : 3) + (f.service === "iam" || f.service === "s3" ? 1 : 0),
      1,
      5,
    );
    const inherent = impact * likelihood;
    const residual = f.is_resolved ? clamp(Math.round(inherent * 0.25), 1, 25) : inherent;

    register.push({
      risk_id: `RSK-F-${f.id.slice(0, 8).toUpperCase()}`,
      source: "FINDING",
      title: f.title,
      category: SERVICE_CATEGORY[f.service] ?? "Cloud Configuration",
      scope: f.service.replace(/_/g, " ").toUpperCase(),
      likelihood,
      impact,
      inherent_score: inherent,
      residual_score: residual,
      rating: ratingFromScore(residual),
      treatment: f.is_resolved
        ? "MONITOR"
        : (f.remediation_steps?.length ?? 0) > 0
          ? "MITIGATE"
          : "MONITOR",
      status: f.is_resolved ? "CLOSED" : "OPEN",
      control_refs: f.compliance_tags ?? [],
      identified_at: f.created_at,
      last_reviewed_at: f.created_at,
      notes: f.is_resolved
        ? "Remediated — residual risk retained for trend analysis."
        : (f.execution_tag ?? "Awaiting review"),
    });
  }

  // --- Risks derived from attack paths
  for (const p of inputs.attackPaths) {
    const impact = SEVERITY_IMPACT[p.severity] ?? 4;
    const likelihood = clamp(Math.ceil(((p.risk_score ?? 50) / 100) * 5), 1, 5);
    const inherent = impact * likelihood;
    const mitigated = p.status === "mitigated" || p.status === "false_positive";
    const residual = mitigated ? clamp(Math.round(inherent * 0.2), 1, 25) : inherent;

    register.push({
      risk_id: `RSK-AP-${p.id.slice(0, 8).toUpperCase()}`,
      source: "ATTACK_PATH",
      title: p.title,
      category: "Attack Surface & Lateral Movement",
      scope: `Blast radius: ${p.blast_radius ?? 0} resources`,
      likelihood,
      impact,
      inherent_score: inherent,
      residual_score: residual,
      rating: ratingFromScore(residual),
      treatment:
        p.status === "accepted" ? "ACCEPT" : mitigated ? "MONITOR" : "MITIGATE",
      status:
        p.status === "accepted"
          ? "ACCEPTED"
          : p.status === "mitigated"
            ? "CLOSED"
            : p.status === "false_positive"
              ? "CLOSED"
              : "IN_TREATMENT",
      control_refs: ["ISO A.8.16", "SOC2 CC7.2"],
      identified_at: p.detected_at,
      last_reviewed_at: p.updated_at ?? p.detected_at,
      notes: `Exploitability score ${p.risk_score ?? 0}/100.`,
    });
  }

  // --- Risks derived from open policy violations
  for (const v of inputs.violations) {
    if (v.status === "resolved") continue;
    const impact = SEVERITY_IMPACT[v.severity] ?? 3;
    const likelihood = v.status === "open" ? 4 : 2;
    const inherent = impact * likelihood;

    register.push({
      risk_id: `RSK-PV-${v.id.slice(0, 8).toUpperCase()}`,
      source: "POLICY_VIOLATION",
      title: `Policy violation on ${v.resource_name || v.resource_type}`,
      category: "Governance & Policy Conformance",
      scope: `${v.resource_type}${v.region ? ` · ${v.region}` : ""}`,
      likelihood,
      impact,
      inherent_score: inherent,
      residual_score: inherent,
      rating: ratingFromScore(inherent),
      treatment:
        v.status === "accepted" || v.status === "suppressed" ? "ACCEPT" : "MITIGATE",
      status:
        v.status === "accepted" || v.status === "suppressed"
          ? "ACCEPTED"
          : v.status === "remediating"
            ? "IN_TREATMENT"
            : "OPEN",
      control_refs: ["ISO A.5.1"],
      identified_at: v.detected_at,
      last_reviewed_at: v.detected_at,
      notes: `Violation status: ${v.status}.`,
    });
  }

  register.sort((a, b) => b.residual_score - a.residual_score);

  // --- Policy governance table
  const policy_governance: PolicyGovernanceEntry[] = inputs.policies.map((p) => {
    const own = inputs.violations.filter((v) => v.policy_id === p.id);
    const open = own.filter((v) => v.status !== "resolved").length;
    const resolved = own.filter((v) => v.status === "resolved").length;
    const total = open + resolved;
    const effectiveness = !p.is_enabled
      ? 0
      : total === 0
        ? 100
        : Math.round((resolved / total) * 100);

    return {
      policy_id: p.id,
      name: p.name,
      policy_type: p.policy_type,
      scope: p.scope,
      enforcement_mode: p.enforcement_mode,
      is_enabled: p.is_enabled,
      severity: p.severity,
      open_violations: open,
      resolved_violations: resolved,
      effectiveness,
      last_updated_at: p.updated_at,
    };
  });

  // --- Exceptions / accepted risk log
  const exceptions: ExceptionEntry[] = [
    ...inputs.violations
      .filter((v) => v.status === "accepted" || v.status === "suppressed")
      .map((v) => ({
        exception_id: `EXC-PV-${v.id.slice(0, 8).toUpperCase()}`,
        subject: `${v.resource_name || v.resource_type}`,
        source: "POLICY_VIOLATION" as const,
        severity: v.severity,
        reason:
          v.status === "suppressed"
            ? "Suppressed by policy owner"
            : "Risk formally accepted",
        raised_at: v.detected_at,
        scope: `${v.resource_type}${v.region ? ` · ${v.region}` : ""}`,
      })),
    ...inputs.attackPaths
      .filter((p) => p.status === "accepted" || p.status === "false_positive")
      .map((p) => ({
        exception_id: `EXC-AP-${p.id.slice(0, 8).toUpperCase()}`,
        subject: p.title,
        source: "ATTACK_PATH" as const,
        severity: p.severity,
        reason:
          p.status === "false_positive"
            ? "Marked as false positive after review"
            : "Risk formally accepted",
        raised_at: p.detected_at,
        scope: `Blast radius: ${p.blast_radius ?? 0} resources`,
      })),
  ];

  // --- Multi-framework compliance posture
  const framework_posture: FrameworkPosture[] = getAvailableFrameworks().map((fw) => {
    const rep = generateComplianceReport(fw, inputs.findings, inputs.scopeLabel);
    return {
      framework: fw,
      display_name: getFrameworkConfig(fw).name,
      coverage_percentage: rep.summary.coverage_percentage,
      total_controls: rep.summary.total_controls,
      controls_supported: rep.summary.controls_supported,
      controls_partial: rep.summary.controls_partial,
      controls_missing: rep.summary.controls_missing,
    };
  });

  // --- Summary + maturity
  const open_risks = register.filter(
    (r) => r.status === "OPEN" || r.status === "IN_TREATMENT",
  ).length;
  const accepted_risks = register.filter((r) => r.status === "ACCEPTED").length;
  const closed_risks = register.filter((r) => r.status === "CLOSED").length;
  const avg_residual =
    register.length === 0
      ? 0
      : Math.round(
          (register.reduce((s, r) => s + r.residual_score, 0) / register.length) * 10,
        ) / 10;

  const avgCoverage =
    framework_posture.length === 0
      ? 0
      : framework_posture.reduce((s, f) => s + f.coverage_percentage, 0) /
        framework_posture.length;

  const policyHealth =
    policy_governance.length === 0
      ? 0
      : policy_governance.reduce((s, p) => s + p.effectiveness, 0) /
        policy_governance.length;

  const riskHealth = register.length === 0 ? 0 : clamp(100 - avg_residual * 4, 0, 100);
  const coverageWeight = inputs.accountsInScope > 0 ? 100 : 0;

  const maturity_score = Math.round(
    avgCoverage * 0.35 + riskHealth * 0.3 + policyHealth * 0.2 + coverageWeight * 0.15,
  );

  const maturity_tier =
    maturity_score >= 85
      ? "Optimized"
      : maturity_score >= 70
        ? "Managed"
        : maturity_score >= 50
          ? "Defined"
          : maturity_score >= 30
            ? "Developing"
            : "Initial";

  const periodStart = new Date(now);
  periodStart.setDate(periodStart.getDate() - 30);

  return {
    report_id: `GRC-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${String(
      register.length,
    ).padStart(4, "0")}`,
    generated_at: now.toISOString(),
    scope_label: inputs.scopeLabel,
    period_start: periodStart.toISOString(),
    period_end: now.toISOString(),
    maturity_score,
    maturity_tier,
    summary: {
      total_risks: register.length,
      critical_risks: register.filter((r) => r.rating === "CRITICAL").length,
      high_risks: register.filter((r) => r.rating === "HIGH").length,
      open_risks,
      accepted_risks,
      closed_risks,
      avg_residual_score: avg_residual,
      policies_total: policy_governance.length,
      policies_enabled: policy_governance.filter((p) => p.is_enabled).length,
      open_violations: inputs.violations.filter((v) => v.status !== "resolved").length,
      exceptions: exceptions.length,
      accounts_in_scope: inputs.accountsInScope,
      assets_in_scope: inputs.assetsInScope,
    },
    risk_register: register,
    policy_governance,
    exceptions,
    framework_posture,
    attestations: [
      "All evidence in this report was collected through read-only cloud APIs.",
      "No configuration changes were made while producing this report.",
      "Control coverage reflects platform-supported evidence only and is not a certification of compliance.",
      "Risk scores are deterministic (likelihood x impact) and reproducible from the same dataset.",
    ],
  };
}

/* ------------------------------------------------------------------ export */

export function getRiskRatingConfig(rating: RiskRating) {
  switch (rating) {
    case "CRITICAL":
      return { label: "Critical", color: "bg-critical/10 text-critical border-critical/20" };
    case "HIGH":
      return { label: "High", color: "bg-warning/10 text-warning border-warning/20" };
    case "MEDIUM":
      return { label: "Medium", color: "bg-primary/10 text-primary border-primary/20" };
    default:
      return { label: "Low", color: "bg-muted text-muted-foreground border-border" };
  }
}

export function getRiskStatusConfig(status: RiskStatus) {
  switch (status) {
    case "OPEN":
      return { label: "Open", color: "bg-critical/10 text-critical border-critical/20" };
    case "IN_TREATMENT":
      return { label: "In treatment", color: "bg-warning/10 text-warning border-warning/20" };
    case "ACCEPTED":
      return { label: "Accepted", color: "bg-primary/10 text-primary border-primary/20" };
    default:
      return { label: "Closed", color: "bg-success/10 text-success border-success/20" };
  }
}

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export function formatRiskRegisterAsCSV(report: GRCReport): string {
  const header = [
    "Risk ID",
    "Source",
    "Title",
    "Category",
    "Scope",
    "Likelihood (1-5)",
    "Impact (1-5)",
    "Inherent Score",
    "Residual Score",
    "Rating",
    "Treatment",
    "Status",
    "Control References",
    "Identified At",
    "Last Reviewed",
    "Notes",
  ];

  const rows = report.risk_register.map((r) =>
    [
      r.risk_id,
      r.source,
      r.title,
      r.category,
      r.scope,
      r.likelihood,
      r.impact,
      r.inherent_score,
      r.residual_score,
      r.rating,
      r.treatment,
      r.status,
      r.control_refs.join("; "),
      r.identified_at,
      r.last_reviewed_at,
      r.notes,
    ]
      .map(csvCell)
      .join(","),
  );

  return [header.map(csvCell).join(","), ...rows].join("\n");
}

export function formatGRCReportAsMarkdown(report: GRCReport): string {
  const s = report.summary;
  const lines: string[] = [];

  lines.push(`# GRC Report — ${report.scope_label}`);
  lines.push("");
  lines.push(`**Report ID:** ${report.report_id}`);
  lines.push(`**Generated:** ${new Date(report.generated_at).toUTCString()}`);
  lines.push(
    `**Reporting period:** ${report.period_start.slice(0, 10)} → ${report.period_end.slice(0, 10)}`,
  );
  lines.push(`**Assurance basis:** Read-only cloud API evidence`);
  lines.push("");
  lines.push("## 1. Executive Summary");
  lines.push("");
  lines.push(`- GRC maturity score: **${report.maturity_score}/100 (${report.maturity_tier})**`);
  lines.push(`- Accounts in scope: ${s.accounts_in_scope} · Assets in scope: ${s.assets_in_scope}`);
  lines.push(
    `- Risks: ${s.total_risks} total (${s.critical_risks} critical, ${s.high_risks} high)`,
  );
  lines.push(
    `- Risk lifecycle: ${s.open_risks} open/in treatment · ${s.accepted_risks} accepted · ${s.closed_risks} closed`,
  );
  lines.push(`- Average residual risk score: ${s.avg_residual_score}/25`);
  lines.push(
    `- Governance: ${s.policies_enabled}/${s.policies_total} policies enabled · ${s.open_violations} open violations`,
  );
  lines.push(`- Documented exceptions: ${s.exceptions}`);
  lines.push("");

  lines.push("## 2. Compliance Posture by Framework");
  lines.push("");
  lines.push("| Framework | Coverage | Supported | Partial | Missing |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const f of report.framework_posture) {
    lines.push(
      `| ${f.display_name} | ${f.coverage_percentage}% | ${f.controls_supported} | ${f.controls_partial} | ${f.controls_missing} |`,
    );
  }
  lines.push("");

  lines.push("## 3. Risk Register");
  lines.push("");
  if (report.risk_register.length === 0) {
    lines.push("_No risks recorded for the selected scope._");
  } else {
    lines.push("| Risk ID | Title | Category | L | I | Residual | Rating | Treatment | Status |");
    lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
    for (const r of report.risk_register.slice(0, 200)) {
      lines.push(
        `| ${r.risk_id} | ${r.title} | ${r.category} | ${r.likelihood} | ${r.impact} | ${r.residual_score} | ${r.rating} | ${r.treatment} | ${r.status} |`,
      );
    }
    if (report.risk_register.length > 200) {
      lines.push("");
      lines.push(
        `_Showing first 200 of ${report.risk_register.length} risks. Export CSV for the complete register._`,
      );
    }
  }
  lines.push("");

  lines.push("## 4. Policy Governance");
  lines.push("");
  if (report.policy_governance.length === 0) {
    lines.push("_No governance policies defined._");
  } else {
    lines.push("| Policy | Type | Scope | Mode | Enabled | Open | Resolved | Effectiveness |");
    lines.push("| --- | --- | --- | --- | --- | --- | --- | --- |");
    for (const p of report.policy_governance) {
      lines.push(
        `| ${p.name} | ${p.policy_type} | ${p.scope} | ${p.enforcement_mode} | ${p.is_enabled ? "Yes" : "No"} | ${p.open_violations} | ${p.resolved_violations} | ${p.effectiveness}% |`,
      );
    }
  }
  lines.push("");

  lines.push("## 5. Exceptions & Accepted Risks");
  lines.push("");
  if (report.exceptions.length === 0) {
    lines.push("_No exceptions recorded._");
  } else {
    lines.push("| Exception ID | Subject | Source | Severity | Reason | Raised |");
    lines.push("| --- | --- | --- | --- | --- | --- |");
    for (const e of report.exceptions) {
      lines.push(
        `| ${e.exception_id} | ${e.subject} | ${e.source} | ${e.severity} | ${e.reason} | ${e.raised_at.slice(0, 10)} |`,
      );
    }
  }
  lines.push("");

  lines.push("## 6. Attestations");
  lines.push("");
  for (const a of report.attestations) lines.push(`- ${a}`);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(
    "_Generated by CloudGuard Autopilot. This report supports audit preparation and does not constitute certification._",
  );

  return lines.join("\n");
}
