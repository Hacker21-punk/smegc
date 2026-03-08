import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Shield,
  Zap,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Activity,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchAutopilotStats,
  fetchViolations,
  runAutopilotEngine,
  type AutopilotStats,
  type PolicyViolation,
} from "@/lib/autopilot-service";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function AutopilotEnforcementPanel() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AutopilotStats | null>(null);
  const [recentViolations, setRecentViolations] = useState<PolicyViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) return;
      setOrgId(profile.organization_id);

      const [statsData, violations] = await Promise.all([
        fetchAutopilotStats(profile.organization_id),
        fetchViolations(profile.organization_id, "open"),
      ]);

      setStats(statsData);
      setRecentViolations(violations.slice(0, 5));
    } catch (err) {
      console.error("Failed to load autopilot data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunEngine = async () => {
    if (!orgId) return;
    setRunning(true);
    try {
      const result = await runAutopilotEngine(orgId);
      toast.success("Autopilot evaluation complete", {
        description: `${result.evaluation.violations_found} new violations, ${result.evaluation.actions_created} actions created`,
      });
      loadData();
    } catch (err) {
      toast.error("Autopilot engine failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setRunning(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-destructive/10 text-destructive border-destructive/20";
      case "high": return "bg-destructive/10 text-destructive border-destructive/20";
      case "medium": return "bg-warning/10 text-warning border-warning/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.activePolicies ?? 0}</p>
                <p className="text-xs text-muted-foreground">Active Policies</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.openViolations ?? 0}</p>
                <p className="text-xs text-muted-foreground">Open Violations</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.fixesToday ?? 0}</p>
                <p className="text-xs text-muted-foreground">Fixes Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.complianceScore ?? 100}%</p>
                <p className="text-xs text-muted-foreground">Compliance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Progress + Actions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5 text-primary" />
              Security Autopilot
            </CardTitle>
            <CardDescription>
              Autonomous policy enforcement • {stats?.totalEnforcements ?? 0} total actions
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={running}
              onClick={handleRunEngine}
            >
              {running ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Zap className="h-4 w-4 mr-1" />
              )}
              {running ? "Evaluating..." : "Run Now"}
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <Link to="/dashboard/autopilot">
                Manage Policies <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Policy Compliance</span>
              <span className="font-medium">{stats?.complianceScore ?? 100}%</span>
            </div>
            <Progress value={stats?.complianceScore ?? 100} className="h-2" />
          </div>

          {/* Recent Violations */}
          {recentViolations.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Recent Violations</p>
              {recentViolations.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {(v.violation_details as Record<string, unknown>)?.reason as string || v.resource_type}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {v.resource_name || v.resource_id}
                      </p>
                    </div>
                  </div>
                  <Badge className={cn("text-xs flex-shrink-0", getSeverityColor(v.severity))}>
                    {v.severity}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-success/5 border border-success/10">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <p className="text-sm text-success">All policies compliant — no open violations</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
