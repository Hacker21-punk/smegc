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
  Crosshair,
  Clock,
  Sparkles,
  Bell,
  CheckCircle2,
} from "lucide-react";

export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  type: "credential_theft" | "privilege_escalation" | "ransomware" | "data_exfiltration" | "public_exploit";
  status: "idle" | "running" | "completed";
  breachProbability: number;
  financialImpact: number;
  breachPath: string[];
  lastRun: string | null;
  attackSteps: number;
  criticalAssets: number;
}

export const SCENARIOS: SimulationScenario[] = [];

export default function BreachSimulation() {
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
          message: `[Breach Simulation early-access request] ${form.message || "No additional comments"}`,
        },
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success("You're on the list — we'll be in touch when Breach Simulation is ready.");
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
              <h1 className="heading-display flex items-center gap-2">
                <Crosshair className="h-6 w-6 text-destructive" />
                Continuous Breach Simulation
              </h1>
              <p className="text-fluid-subtitle text-muted-foreground">AI-powered red team simulating real attack scenarios against your infrastructure</p>
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
                <h2 className="text-lg font-semibold">Coming Soon</h2>
                <p className="text-sm text-muted-foreground">
                  We're building Continuous Breach Simulation to safely model real attack scenarios against your discovered infrastructure. This will allow your team to simulate credential theft, privilege escalation, ransomware, data exfiltration, and public exploits to predict breach probability and financial impact before they occur.
                </p>
                <p className="text-sm text-muted-foreground">
                  Join the early-access list below to help us prioritize simulation scenarios and get access before public release.
                </p>
              </div>
            </CardContent>
          </Card>

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
                    <p className="text-xs opacity-80">We'll email you the moment Breach Simulation is ready for early-access testing.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bs-name">Name</Label>
                    <Input id="bs-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bs-email">Work email</Label>
                    <Input id="bs-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="bs-company">Company</Label>
                    <Input id="bs-company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="bs-message">Any specific attack scenarios or requirements?</Label>
                    <Textarea
                      id="bs-message"
                      placeholder="e.g. ransomware simulations, custom API exploits, active directory compromise"
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
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
