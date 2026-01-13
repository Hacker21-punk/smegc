import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RotateCcw,
  AlertTriangle,
  Info,
  HelpCircle
} from "lucide-react";

interface ChangeImpactPreviewProps {
  finding: {
    title: string;
    severity: string;
    resource_id: string;
    resource_type: string;
    service: string;
    execution_tag?: string | null;
    remediation_steps?: string[] | null;
    impact_assessment?: string | null;
    rollback_guidance?: string | null;
  };
}

interface ImpactAnalysis {
  willChange: string[];
  willNotChange: string[];
  userVisibleImpact: string | null;
  downtimeExpected: 'none' | 'brief' | 'possible' | 'uncertain';
  rollbackConfidence: 'high' | 'medium' | 'uncertain';
  overallRiskLevel: 'low' | 'medium' | 'high';
}

function analyzeImpact(finding: ChangeImpactPreviewProps['finding']): ImpactAnalysis {
  const { service, resource_type, execution_tag, severity } = finding;
  
  // Initialize analysis
  const analysis: ImpactAnalysis = {
    willChange: [],
    willNotChange: [],
    userVisibleImpact: null,
    downtimeExpected: 'none',
    rollbackConfidence: 'high',
    overallRiskLevel: 'low',
  };

  // Analyze based on service type
  switch (service) {
    case 'security_groups':
      analysis.willChange = [
        'Network access rules for this security group',
        'Inbound/outbound traffic permissions',
      ];
      analysis.willNotChange = [
        'Existing running applications (traffic already established)',
        'Other security groups not directly affected',
        'Instance configurations or data',
      ];
      analysis.userVisibleImpact = 'New connection attempts may be blocked based on updated rules';
      analysis.downtimeExpected = 'none';
      analysis.rollbackConfidence = 'high';
      break;

    case 'iam':
      analysis.willChange = [
        'User/role permissions and access rights',
        'Ability to perform certain AWS actions',
      ];
      analysis.willNotChange = [
        'Existing resources or data',
        'Applications unless they depend on the changed permissions',
        'Other IAM users/roles not directly modified',
      ];
      analysis.userVisibleImpact = 'Users or services may lose access to specific resources until adjusted';
      analysis.downtimeExpected = 'possible';
      analysis.rollbackConfidence = 'high';
      break;

    case 's3':
      analysis.willChange = [
        'Bucket access policies and permissions',
        'Public/private visibility of bucket contents',
      ];
      analysis.willNotChange = [
        'Files stored in the bucket',
        'Bucket configuration like versioning or encryption',
        'Other S3 buckets',
      ];
      analysis.userVisibleImpact = 'Access to files may change for external users or applications';
      analysis.downtimeExpected = 'none';
      analysis.rollbackConfidence = 'high';
      break;

    case 'ec2':
      analysis.willChange = [
        'Instance security configuration',
        'Network or storage attachment settings',
      ];
      analysis.willNotChange = [
        'Data on the instance',
        'Running applications (unless reboot required)',
        'Instance type or location',
      ];
      analysis.userVisibleImpact = 'Some changes may require instance restart';
      analysis.downtimeExpected = 'possible';
      analysis.rollbackConfidence = 'medium';
      break;

    case 'rds':
      analysis.willChange = [
        'Database access or security settings',
        'Encryption or backup configurations',
      ];
      analysis.willNotChange = [
        'Database content or schemas',
        'Application connections (unless access rules change)',
      ];
      analysis.userVisibleImpact = 'Database may experience brief unavailability during changes';
      analysis.downtimeExpected = 'brief';
      analysis.rollbackConfidence = 'medium';
      break;

    case 'vpc':
      analysis.willChange = [
        'Network routing and access control',
        'VPC endpoint or gateway configuration',
      ];
      analysis.willNotChange = [
        'Resources running in the VPC',
        'Data on connected instances',
      ];
      analysis.userVisibleImpact = 'Network connectivity may be briefly affected';
      analysis.downtimeExpected = 'brief';
      analysis.rollbackConfidence = 'medium';
      break;

    default:
      analysis.willChange = ['Security configuration for this resource'];
      analysis.willNotChange = ['Other unrelated resources', 'Existing data'];
      analysis.userVisibleImpact = 'Impact depends on specific change applied';
      analysis.downtimeExpected = 'uncertain';
      analysis.rollbackConfidence = 'uncertain';
  }

  // Adjust based on execution tag
  if (execution_tag === 'MANUAL_ONLY') {
    analysis.overallRiskLevel = 'high';
    analysis.rollbackConfidence = 'medium';
    analysis.userVisibleImpact = (analysis.userVisibleImpact || '') + 
      '. This is a high-risk change requiring careful manual implementation.';
  } else if (execution_tag === 'REQUIRES_REVIEW') {
    analysis.overallRiskLevel = 'medium';
  } else if (execution_tag === 'SAFE_AUTOMATABLE') {
    analysis.overallRiskLevel = 'low';
    analysis.rollbackConfidence = 'high';
  }

  // Adjust based on severity
  if (severity === 'critical' || severity === 'high') {
    // Higher severity issues typically have more impactful fixes
    if (analysis.overallRiskLevel === 'low') {
      analysis.overallRiskLevel = 'medium';
    }
  }

  return analysis;
}

const downtimeConfig = {
  none: {
    label: 'No Downtime Expected',
    icon: CheckCircle2,
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  brief: {
    label: 'Brief Interruption Possible',
    icon: Clock,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
  },
  possible: {
    label: 'Downtime Possible',
    icon: AlertTriangle,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
  },
  uncertain: {
    label: 'Impact Uncertain',
    icon: HelpCircle,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
};

const rollbackConfig = {
  high: {
    label: 'High Confidence',
    description: 'Changes can be easily reversed if needed',
    color: 'text-success',
    bgColor: 'bg-success/10 border-success/20',
  },
  medium: {
    label: 'Medium Confidence',
    description: 'Rollback possible but may require additional steps',
    color: 'text-warning',
    bgColor: 'bg-warning/10 border-warning/20',
  },
  uncertain: {
    label: 'Uncertain',
    description: 'Rollback complexity depends on specific configuration',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted border-border',
  },
};

export function ChangeImpactPreview({ finding }: ChangeImpactPreviewProps) {
  const analysis = analyzeImpact(finding);
  const downtime = downtimeConfig[analysis.downtimeExpected];
  const rollback = rollbackConfig[analysis.rollbackConfidence];
  const DowntimeIcon = downtime.icon;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 text-primary" />
        <h4 className="font-semibold">Change Impact Preview</h4>
        <Badge variant="outline" className="text-xs ml-auto">
          Pre-remediation analysis
        </Badge>
      </div>

      <div className="bg-muted/30 rounded-lg p-4 space-y-4">
        {/* What Will Change */}
        <div>
          <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-primary" />
            What Will Change
          </h5>
          <ul className="space-y-1">
            {analysis.willChange.map((item, idx) => (
              <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                <span className="text-primary mt-0.5">→</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <Separator />

        {/* What Will NOT Change */}
        <div>
          <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
            <XCircle className="h-3 w-3 text-muted-foreground" />
            What Will NOT Change
          </h5>
          <ul className="space-y-1">
            {analysis.willNotChange.map((item, idx) => (
              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <Separator />

        {/* User-Visible Impact */}
        {analysis.userVisibleImpact && (
          <>
            <div>
              <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                <Info className="h-3 w-3 text-info" />
                Potential User-Visible Impact
              </h5>
              <p className="text-sm text-muted-foreground">
                {analysis.userVisibleImpact}
              </p>
            </div>
            <Separator />
          </>
        )}

        {/* Downtime & Rollback Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Downtime Expectation */}
          <div className={`rounded-lg p-3 ${downtime.bgColor}`}>
            <div className="flex items-center gap-2 mb-1">
              <DowntimeIcon className={`h-4 w-4 ${downtime.color}`} />
              <span className={`text-sm font-medium ${downtime.color}`}>
                {downtime.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Based on the type of change being applied
            </p>
          </div>

          {/* Rollback Confidence */}
          <div className={`rounded-lg p-3 border ${rollback.bgColor}`}>
            <div className="flex items-center gap-2 mb-1">
              <RotateCcw className={`h-4 w-4 ${rollback.color}`} />
              <span className={`text-sm font-medium ${rollback.color}`}>
                Rollback: {rollback.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {rollback.description}
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-info/10 border border-info/20 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-info mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Note:</span> This is a preview based on 
                standard remediation patterns. Actual impact may vary based on your specific 
                configuration. If uncertain, consult with your IT team before proceeding.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
