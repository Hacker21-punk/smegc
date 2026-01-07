import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { FileDown, ExternalLink, Search, AlertTriangle, Shield, Info } from "lucide-react";
import { FindingDetailsDialog, FindingDetails } from "./FindingDetailsDialog";

export interface SecurityFinding {
  id: string;
  resource: string;
  resourceType: string;
  issue: string;
  severity: "critical" | "high" | "medium" | "low";
  awsAccount: string;
  detectedAt: string;
  status: "open" | "remediated" | "ignored";
  // Extended fields for details dialog
  description?: string | null;
  remediation_steps?: string[] | null;
  cloudformation_template?: string | null;
  service?: string;
  is_resolved?: boolean | null;
  created_at?: string;
}

interface SecurityFindingsTableProps {
  findings: SecurityFinding[];
  onGenerateRemediation: (id: string) => void;
  onMarkResolved?: (id: string) => void;
}

type SeverityFilter = "all" | "critical" | "high" | "medium" | "low";

export function SecurityFindingsTable({ 
  findings, 
  onGenerateRemediation,
  onMarkResolved 
}: SecurityFindingsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [selectedFinding, setSelectedFinding] = useState<FindingDetails | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
      case "high":
        return <AlertTriangle className="h-3 w-3" />;
      case "medium":
        return <Shield className="h-3 w-3" />;
      default:
        return <Info className="h-3 w-3" />;
    }
  };

  // Filter findings
  const filteredFindings = findings.filter((finding) => {
    const matchesSearch = 
      finding.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
      finding.issue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      finding.awsAccount.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSeverity = severityFilter === "all" || finding.severity === severityFilter;
    
    return matchesSearch && matchesSeverity;
  });

  // Count by severity for filter badges
  const severityCounts = {
    all: findings.length,
    critical: findings.filter(f => f.severity === "critical").length,
    high: findings.filter(f => f.severity === "high").length,
    medium: findings.filter(f => f.severity === "medium").length,
    low: findings.filter(f => f.severity === "low").length,
  };

  const handleRowClick = (finding: SecurityFinding) => {
    const details: FindingDetails = {
      id: finding.id,
      title: finding.issue,
      description: finding.description || null,
      severity: finding.severity,
      resource_id: finding.resource,
      resource_type: finding.resourceType,
      service: finding.service || "security_groups",
      aws_account_id: finding.awsAccount,
      remediation_steps: finding.remediation_steps || null,
      cloudformation_template: finding.cloudformation_template || null,
      is_resolved: finding.is_resolved || null,
      created_at: finding.created_at || new Date().toISOString(),
    };
    setSelectedFinding(details);
    setDialogOpen(true);
  };

  const handleMarkResolved = (id: string) => {
    if (onMarkResolved) {
      onMarkResolved(id);
    }
    setDialogOpen(false);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Security Findings</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search findings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 w-[200px]"
              />
            </div>
            <Button variant="outline" size="sm">
              <FileDown className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Severity Filter Chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            {(["all", "critical", "high", "medium", "low"] as SeverityFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setSeverityFilter(filter)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  severityFilter === filter
                    ? filter === "all" 
                      ? "bg-primary text-primary-foreground"
                      : getSeverityColor(filter)
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
                <span className="ml-1 opacity-75">({severityCounts[filter]})</span>
              </button>
            ))}
          </div>

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
              {filteredFindings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchQuery || severityFilter !== "all" 
                      ? "No findings match your filters."
                      : "No security findings detected."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredFindings.map((finding) => (
                  <TableRow 
                    key={finding.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(finding)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{finding.resource}</p>
                        <p className="text-xs text-muted-foreground">{finding.resourceType}</p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="truncate">{finding.issue}</p>
                      {finding.description && (
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {finding.description.slice(0, 80)}...
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getSeverityColor(finding.severity)} flex items-center gap-1 w-fit`}>
                        {getSeverityIcon(finding.severity)}
                        {finding.severity.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{finding.awsAccount}</TableCell>
                    <TableCell className="text-muted-foreground">{finding.detectedAt}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(finding);
                        }}
                      >
                        <ExternalLink className="mr-1 h-3 w-3" />
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <FindingDetailsDialog
        finding={selectedFinding}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onMarkResolved={handleMarkResolved}
      />
    </>
  );
}