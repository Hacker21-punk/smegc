import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Container,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lock,
  Eye,
  Users,
} from "lucide-react";

interface K8sFinding {
  id: string;
  cluster: string;
  namespace: string;
  resource: string;
  issue: string;
  severity: "critical" | "high" | "medium" | "low";
  category: "privileged" | "rbac" | "image" | "dashboard" | "network";
  status: "open" | "remediated";
}

const FINDINGS: K8sFinding[] = [
  { id: "k8s-1", cluster: "prod-eks", namespace: "default", resource: "deploy/api-server", issue: "Container running as root with privileged mode", severity: "critical", category: "privileged", status: "open" },
  { id: "k8s-2", cluster: "prod-eks", namespace: "kube-system", resource: "clusterrole/admin-binding", issue: "Overly permissive ClusterRoleBinding grants cluster-admin", severity: "critical", category: "rbac", status: "open" },
  { id: "k8s-3", cluster: "prod-eks", namespace: "monitoring", resource: "deploy/grafana", issue: "Kubernetes dashboard exposed without authentication", severity: "high", category: "dashboard", status: "open" },
  { id: "k8s-4", cluster: "staging-gke", namespace: "app", resource: "deploy/worker", issue: "Image from untrusted registry with known CVEs", severity: "high", category: "image", status: "open" },
  { id: "k8s-5", cluster: "staging-gke", namespace: "app", resource: "pod/cache-redis", issue: "No network policy — pod can reach all namespaces", severity: "medium", category: "network", status: "open" },
  { id: "k8s-6", cluster: "prod-eks", namespace: "payments", resource: "deploy/payment-svc", issue: "Container image using latest tag (no pinned version)", severity: "medium", category: "image", status: "remediated" },
  { id: "k8s-7", cluster: "dev-aks", namespace: "default", resource: "sa/default", issue: "Default service account has auto-mounted token", severity: "low", category: "rbac", status: "remediated" },
];

const severityColors: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
};

const catIcons: Record<string, React.ReactNode> = {
  privileged: <Shield className="h-4 w-4" />,
  rbac: <Users className="h-4 w-4" />,
  image: <Container className="h-4 w-4" />,
  dashboard: <Eye className="h-4 w-4" />,
  network: <Lock className="h-4 w-4" />,
};

export default function KubernetesSecurity() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const openCount = FINDINGS.filter(f => f.status === "open").length;
  const critCount = FINDINGS.filter(f => f.severity === "critical").length;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} lastScanTime="" onRefresh={() => {}} />
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="md:ml-64 pt-16">
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Container className="h-6 w-6 text-primary" />
              Kubernetes Security Monitor
            </h1>
            <p className="text-muted-foreground">Container and cluster security across EKS, GKE, and AKS</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">3</p><p className="text-xs text-muted-foreground">Clusters Monitored</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-destructive">{critCount}</p><p className="text-xs text-muted-foreground">Critical Issues</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-orange-500">{openCount}</p><p className="text-xs text-muted-foreground">Open Findings</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-500">{FINDINGS.length - openCount}</p><p className="text-xs text-muted-foreground">Remediated</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Security Findings</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Severity</TableHead>
                    <TableHead>Cluster</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {FINDINGS.map(f => (
                    <TableRow key={f.id}>
                      <TableCell>
                        <Badge variant="outline" className={severityColors[f.severity]}>{f.severity}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{f.cluster}</TableCell>
                      <TableCell className="font-mono text-xs">{f.resource}</TableCell>
                      <TableCell className="text-sm max-w-xs">{f.issue}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {catIcons[f.category]} {f.category}
                        </div>
                      </TableCell>
                      <TableCell>
                        {f.status === "open" ? (
                          <Badge variant="outline" className="text-orange-500 bg-orange-500/10">
                            <AlertTriangle className="h-3 w-3 mr-1" />Open
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-600 bg-green-500/10">
                            <CheckCircle2 className="h-3 w-3 mr-1" />Fixed
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
