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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Fingerprint, Smartphone, MapPin, Clock, ShieldCheck,
  ShieldAlert, UserCheck, Monitor, Key, Sparkles, Bell, CheckCircle2,
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
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: user?.user_metadata?.full_name ?? "",
    email: user?.email ?? "",
    company: user?.user_metadata?.company_name ?? "",
    message: "",
  });

  const { data: identities = [], isLoading: idLoading } = useIdentityAssets();
  const { data: riskyEdges = [] } = useRiskyEdges();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.name) {
      toast.error("Name and email are required");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("contact-form", {
        body: {
          name: form.name,
          email: form.email,
          company: form.company,
          message: `[Zero Trust Access early-access request] ${form.message || "No additional comments"}`,
        },
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success("You're on the list — we'll be in touch when Zero Trust Access Policy Enforcement is ready.");
    } catch (err) {
      console.error(err);
      toast.error("Could not submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

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
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="heading-display flex items-center gap-2">
                <Fingerprint className="h-6 w-6 text-primary" />
                Zero Trust Access Engine
              </h1>
              <p className="text-fluid-subtitle text-muted-foreground mt-1 font-light">Identity inventory, trust scoring, and context-aware access policies.</p>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 animate-pulse">
              <Sparkles className="h-3 w-3 mr-1" />
              Enforcement Coming Soon
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">0/{DEFAULT_POLICIES.length}</p><p className="text-xs text-muted-foreground">Enforced Policies</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-500">{trusted}</p><p className="text-xs text-muted-foreground">Trusted Identities</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-orange-500">{review}</p><p className="text-xs text-muted-foreground">Need Review</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-destructive">{blocked}</p><p className="text-xs text-muted-foreground">High Risk</p></CardContent></Card>
          </div>

          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-6 flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Clock className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">Policy Enforcement — Coming Soon</h2>
                <p className="text-sm text-muted-foreground">
                  While CloudGuard continuously monitors your cloud identities and maps active risks below, policy enforcement is currently in active development. When launched, CloudGuard will automatically require re-authentication for high-risk identity actions or block access from unapproved locations based on the real-time risky-edge telemetry displayed on this page.
                </p>
                <p className="text-sm text-muted-foreground">
                  Register for early access below to be notified as soon as active policy enforcement is available.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Planned Policies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {DEFAULT_POLICIES.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-muted bg-muted/5 opacity-60">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-muted text-muted-foreground">
                        {p.icon}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-muted-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.description}</p>
                      </div>
                    </div>
                    <Switch checked={false} disabled aria-label={`Toggle ${p.name}`} />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bell className="h-4 w-4 text-primary" />
                  Request early access
                </CardTitle>
              </CardHeader>
              <CardContent>
                {submitted ? (
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-medium text-sm">You're on the list</p>
                      <p className="text-xs opacity-80 font-normal">We'll email you the moment Zero Trust policy enforcement is ready for early-access testing.</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="zt-name">Name</Label>
                        <Input id="zt-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zt-email">Work email</Label>
                        <Input id="zt-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zt-company">Company</Label>
                      <Input id="zt-company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zt-message">Which policies are most critical for your team?</Label>
                      <Textarea
                        id="zt-message"
                        placeholder="e.g. continuous identity verification, geo-fencing rules, device trust"
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <Button type="submit" disabled={submitting} className="w-full">
                      {submitting ? "Submitting..." : "Notify me at launch"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

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
