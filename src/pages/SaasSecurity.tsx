import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Globe2, Mail, MessageSquare, GitBranch, CheckCircle2, Sparkles, Bell, Clock,
} from "lucide-react";

const ROADMAP = [
  { app: "Google Workspace", icon: <Mail className="h-5 w-5" />, status: "Q2 planning", scopes: "Drive sharing, OAuth apps, admin audit logs" },
  { app: "Microsoft 365", icon: <Globe2 className="h-5 w-5" />, status: "Q2 planning", scopes: "SharePoint exposure, Teams policies, Entra ID risks" },
  { app: "Slack", icon: <MessageSquare className="h-5 w-5" />, status: "Q3 planning", scopes: "Public channels, external connections, token leaks" },
  { app: "GitHub", icon: <GitBranch className="h-5 w-5" />, status: "Q3 planning", scopes: "Secret scanning, branch protection, OAuth app review" },
];

export default function SaasSecurity() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: user?.user_metadata?.full_name ?? "",
    email: user?.email ?? "",
    company: user?.user_metadata?.company_name ?? "",
    apps: "",
  });

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
          message: `[SaaS Security early-access request] Interested in: ${form.apps || "all integrations"}`,
        },
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success("You're on the list — we'll be in touch when SaaS Security is ready.");
    } catch (err) {
      console.error(err);
      toast.error("Could not submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} lastScanTime="" />
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="md:ml-64 pt-16">
        <div className="p-6 max-w-5xl mx-auto space-y-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Globe2 className="h-6 w-6 text-primary" />
                SaaS Security Scanner
              </h1>
              <p className="text-muted-foreground">Posture management for Google Workspace, Microsoft 365, Slack, and GitHub.</p>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              <Sparkles className="h-3 w-3 mr-1" />
              Early access
            </Badge>
          </div>

          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-6 flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Clock className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">Coming to CloudGuard</h2>
                <p className="text-sm text-muted-foreground">
                  We're building SaaS Security to give SMEs the same posture visibility for their critical SaaS apps that CloudGuard already provides for AWS. Each integration uses official OAuth — no credential sharing, fully read-only by default — and is currently in design and provider review.
                </p>
                <p className="text-sm text-muted-foreground">
                  Join the early-access list below to help us prioritize integrations and get access before public release.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid sm:grid-cols-2 gap-4">
            {ROADMAP.map((r) => (
              <Card key={r.app}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">{r.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm">{r.app}</p>
                      <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{r.scopes}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-4 w-4" />
                Request early access
              </CardTitle>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">You're on the list</p>
                    <p className="text-xs opacity-80">We'll email you the moment SaaS Security is ready for early-access testing.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sas-name">Name</Label>
                    <Input id="sas-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sas-email">Work email</Label>
                    <Input id="sas-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="sas-company">Company</Label>
                    <Input id="sas-company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="sas-apps">Which SaaS apps matter most to you?</Label>
                    <Textarea
                      id="sas-apps"
                      placeholder="e.g. Google Workspace, GitHub Enterprise, Slack"
                      value={form.apps}
                      onChange={(e) => setForm({ ...form, apps: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                      {submitting ? "Submitting..." : "Notify me at launch"}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
