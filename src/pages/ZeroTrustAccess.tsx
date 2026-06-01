import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { toast } from "sonner";
import { useIdentityAssets, useRiskyEdges } from "@/hooks/use-cloud-data";
import {
  Fingerprint, Smartphone, MapPin, Clock, ShieldCheck,
  ShieldAlert, UserCheck, Monitor, Key,
} from "lucide-react";

interface AccessPolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  icon: React.ReactNode;
}

const DEFAULT_POLICIES: AccessPolicy[] = [
  { id: "zt-1", name: "Continuous Identity Verification", description: "Re-authenticate users every 4 hours or on context change", enabled: true, icon: <Fingerprint className="h-5 w-5" /> },
  { id: "zt-2", name: "Device Trust Validation", description: "Only allow access from managed devices with up-to-date security", enabled: true, icon: <Smartphone className="h-5 w-5" /> },
  { id: "zt-3", name: "Geo-Fencing Access Rules", description: "Block access from non-approved geographic regions", enabled: false, icon: <MapPin className="h-5 w-5" /> },
  { id: "zt-4", name: "Session Monitoring", description: "Monitor active sessions and terminate on anomalous behavior", enabled: true, icon: <Clock className="h-5 w-5" /> },
  { id: "zt-5", name: "Lateral Movement Prevention", description: "Microsegmentation to prevent east-west traffic between services", enabled: false, icon: <ShieldCheck className="h-5 w-5" /> },
  { id: "zt-6", name: "Context-Aware Access", description: "Adjust permissions based on time, device, location, and risk score", enabled: true, icon: <Monitor className="h-5 w-5" /> },
];

const trustFromRisk = (score: number) => Math.max(0, 100 - (score ?? 0));
const statusFromTrust = (t: number): { key: string; label: string; cls: string; icon: React.ReactNode } => {
  if (t >= 70) return { key: "trusted", label: "trusted", cls: "text-green-600 bg-green-500/10", icon: <ShieldCheck className="h-3 w-3 mr-1" /> };
  if (t >= 40) return { key: "review", label: "review", cls: "text-orange-500 bg-orange-500/10", icon: <UserCheck className="h-3 w-3 mr-1" /> };
  return { key: "blocked", label: "high risk", cls: "text-destructive bg-destructive/10", icon: <ShieldAlert className="h-3 w-3 mr-1" /> };
};

export default function ZeroTrustAccess() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [policies, setPolicies] = useState(DEFAULT_POLICIES);

  const { data: identities = [], isLoading: idLoading } = useIdentityAssets();
  const { data: riskyEdges = [] } = useRiskyEdges();

  const togglePolicy = (id: string) => {
    setPolicies((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      const next = !p.enabled;
      toast.success(`${p.name} ${next ? "enabled" : "disabled"}`);
      return { ...p, enabled: next };
    }));
  };

  const enabledCount = policies.filter((p) => p.enabled).length;

  // Build identity rows with trust scores from risk_score
  const rows = identities.map((i) => {
    const trust = trustFromRisk(i.risk_score ?? 0);
    return { ...i, trust, status: statusFromTrust(trust) };
  });
  const trusted = rows.filter((r) => r.status.key === "trusted").length;
  const review = rows.filter((r) => r.status.key === "review").length;
  const blocked = rows.filter((r) => r.status.key === "blocked").length;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} lastScanTime="" />
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="md:ml-64 pt-16">
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight font-display flex items-center gap-2">
              <Fingerprint className="h-6 w-6 text-primary" />
              Zero Trust Access Engine
            </h1>
            <p className="text-muted-foreground">Identity inventory, trust scoring, and context-aware access policies.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{enabledCount}/{policies.length}</p><p className="text-xs text-muted-foreground">Active Policies</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-500">{trusted}</p><p className="text-xs text-muted-foreground">Trusted Identities</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-orange-500">{review}</p><p className="text-xs text-muted-foreground">Need Review</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-destructive">{blocked}</p><p className="text-xs text-muted-foreground">High Risk</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Access Policies</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {policies.map((p) => (
                <div key={p.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${p.enabled ? "border-primary/20 bg-primary/5" : ""}`}>
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${p.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {p.icon}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.description}</p>
                    </div>
                  </div>
                  <Switch checked={p.enabled} onCheckedChange={() => togglePolicy(p.id)} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Identity Inventory</span>
                {riskyEdges.length > 0 && (
                  <Badge variant="outline" className="text-destructive bg-destructive/10">
                    {riskyEdges.length} risky access paths detected
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {idLoading ? (
                <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : rows.length === 0 ? (
                <EmptyState
                  icon={<Key className="h-7 w-7" />}
                  title="No identities discovered yet"
                  description="Connect a cloud account so we can inventory your IAM users, roles, and policies and score them against zero-trust principles."
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Identity</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Region</TableHead>
                        <TableHead>Trust Score</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.slice(0, 50).map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            <p className="font-medium text-sm">{r.resource_name || r.resource_id}</p>
                            <p className="text-xs text-muted-foreground font-mono truncate max-w-xs">{r.resource_id}</p>
                          </TableCell>
                          <TableCell className="text-sm">{r.provider.toUpperCase()}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{r.region || "global"}</TableCell>
                          <TableCell>
                            <span className={`font-bold ${r.trust >= 70 ? "text-green-500" : r.trust >= 40 ? "text-orange-500" : "text-destructive"}`}>
                              {r.trust}/100
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={r.status.cls}>{r.status.icon}{r.status.label}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {rows.length > 50 && (
                    <p className="text-xs text-muted-foreground text-center mt-3">Showing top 50 of {rows.length} identities</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
