import { Badge } from "@/components/ui/badge";
import {
  ArrowDown,
  Globe,
  Server,
  Users,
  Database,
  HardDrive,
  Shield,
} from "lucide-react";

export interface AttackPathNode {
  id: string;
  label: string;
  type: "entry" | "compute" | "identity" | "storage" | "database" | "network";
  risk: "critical" | "high" | "medium" | "low";
}

export interface AttackPath {
  id: string;
  name: string;
  severity: "critical" | "high" | "medium" | "low";
  probability: number;
  estimatedLoss: number;
  nodes: AttackPathNode[];
  description: string;
  riskScore: number;
  blastRadius: number;
  pathLength: number;
  status: string;
}

const nodeIconMap: Record<AttackPathNode["type"], React.ReactNode> = {
  entry: <Globe className="h-5 w-5" />,
  compute: <Server className="h-5 w-5" />,
  identity: <Users className="h-5 w-5" />,
  storage: <HardDrive className="h-5 w-5" />,
  database: <Database className="h-5 w-5" />,
  network: <Shield className="h-5 w-5" />,
};

const riskColors: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/20",
  high: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  low: "bg-green-500/10 text-green-600 border-green-500/20",
};

export function AttackPathVisualization({ path }: { path: AttackPath }) {
  return (
    <div className="flex flex-col items-center gap-1 py-4">
      {path.nodes.map((node, i) => (
        <div key={node.id} className="flex flex-col items-center">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${riskColors[node.risk]} min-w-[280px]`}
          >
            <div className="shrink-0">{nodeIconMap[node.type]}</div>
            <div className="flex-1">
              <p className="text-sm font-medium">{node.label}</p>
              <p className="text-xs opacity-70 capitalize">{node.type}</p>
            </div>
            <Badge variant="outline" className={riskColors[node.risk]}>
              {node.risk}
            </Badge>
          </div>
          {i < path.nodes.length - 1 && (
            <ArrowDown className="h-5 w-5 text-muted-foreground my-1" />
          )}
        </div>
      ))}
    </div>
  );
}

export { riskColors, nodeIconMap };
