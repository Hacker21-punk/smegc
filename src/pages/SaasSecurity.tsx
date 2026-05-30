import { EmptyState } from "@/components/dashboard/EmptyState";
import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Globe2,
  FileWarning,
  Users,
  GitBranch,
  AlertTriangle,
  CheckCircle2,
  Mail,
  MessageSquare,
} from "lucide-react";

interface SaasFinding {
  id: string;
  app: "Google Workspace" | "Microsoft 365" | "Slack" | "GitHub";
  issue: string;
  severity: "critical" | "high" | "medium" | "low";
  category: "sharing" | "permissions" | "exposure" | "config";
  user: string;
  status: "open" | "resolved";
}

const FINDINGS: SaasFinding[] = [];

const appIcons: Record<string, React.ReactNode> = {
  "Google Workspace": <Mail className="h-4 w-4" />,
  "Microsoft 365": <Globe2 className="h-4 w-4" />,
  "Slack": <MessageSquare className="h-4 w-4" />,
  "GitHub": <GitBranch className="h-4 w-4" />,
};

const severityColors: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive",
  high: "bg-orange-500/10 text-orange-500",
  medium: "bg-yellow-500/10 text-yellow-600",
  low: "bg-blue-500/10 text-blue-500",
};

export default function SaasSecurity() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const openCount = FINDINGS.filter(f => f.status === "open").length;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} lastScanTime="" />
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="md:ml-64 pt-16">
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Globe2 className="h-6 w-6 text-primary" />
              SaaS Security Scanner
            </h1>
            <p className="text-muted-foreground">Monitor Google Workspace, Microsoft 365, Slack, and GitHub for risky configurations</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">4</p><p className="text-xs text-muted-foreground">Apps Connected</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-destructive">{FINDINGS.filter(f => f.severity === "critical").length}</p><p className="text-xs text-muted-foreground">Critical Risks</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-orange-500">{openCount}</p><p className="text-xs text-muted-foreground">Open Issues</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-500">{FINDINGS.length - openCount}</p><p className="text-xs text-muted-foreground">Resolved</p></CardContent></Card>
          </div>

          {FINDINGS.length === 0 ? (
            <EmptyState
              icon={<Globe2 className="h-7 w-7" />}
              title="No SaaS applications connected"
              description="Connect Google Workspace, Microsoft 365, Slack, or GitHub to start scanning for risky configurations and exposures."
            />
          ) : (
            <Card>
              <CardHeader><CardTitle>SaaS Findings</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Severity</TableHead>
                      <TableHead>Application</TableHead>
                      <TableHead>Issue</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {FINDINGS.map(f => (
                      <TableRow key={f.id}>
                        <TableCell><Badge variant="outline" className={severityColors[f.severity]}>{f.severity}</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            {appIcons[f.app]} {f.app}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm max-w-sm">{f.issue}</TableCell>
                        <TableCell className="text-sm font-mono">{f.user}</TableCell>
                        <TableCell>
                          {f.status === "open" ? (
                            <Badge variant="outline" className="text-orange-500 bg-orange-500/10"><AlertTriangle className="h-3 w-3 mr-1" />Open</Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600 bg-green-500/10"><CheckCircle2 className="h-3 w-3 mr-1" />Resolved</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
