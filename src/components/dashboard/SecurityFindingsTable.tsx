import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileDown, ExternalLink } from "lucide-react";

export interface SecurityFinding {
  id: string;
  resource: string;
  resourceType: string;
  issue: string;
  severity: "critical" | "high" | "medium" | "low";
  awsAccount: string;
  detectedAt: string;
  status: "open" | "remediated" | "ignored";
}

interface SecurityFindingsTableProps {
  findings: SecurityFinding[];
  onGenerateRemediation: (id: string) => void;
}

export function SecurityFindingsTable({ findings, onGenerateRemediation }: SecurityFindingsTableProps) {
  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "secondary";
      case "low":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-critical text-critical-foreground";
      case "high":
        return "bg-critical/80 text-critical-foreground";
      case "medium":
        return "bg-warning text-warning-foreground";
      case "low":
        return "bg-info text-info-foreground";
      default:
        return "";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Security Findings</CardTitle>
        <Button variant="outline" size="sm">
          <FileDown className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Resource</TableHead>
              <TableHead>Issue</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Detected</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {findings.map((finding) => (
              <TableRow key={finding.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{finding.resource}</p>
                    <p className="text-xs text-muted-foreground">{finding.resourceType}</p>
                  </div>
                </TableCell>
                <TableCell className="max-w-xs">
                  <p className="truncate">{finding.issue}</p>
                </TableCell>
                <TableCell>
                  <Badge className={getSeverityColor(finding.severity)}>
                    {finding.severity.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{finding.awsAccount}</TableCell>
                <TableCell className="text-muted-foreground">{finding.detectedAt}</TableCell>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onGenerateRemediation(finding.id)}
                  >
                    <ExternalLink className="mr-1 h-3 w-3" />
                    Fix
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
