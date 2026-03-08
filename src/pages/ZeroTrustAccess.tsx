import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  Fingerprint,
  Smartphone,
  MapPin,
  Clock,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Monitor,
} from "lucide-react";

interface AccessPolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  icon: React.ReactNode;
}

interface ActiveSession {
  id: string;
  user: string;
  device: string;
  location: string;
  trustScore: number;
  lastVerified: string;
  status: "trusted" | "review" | "blocked";
}

const POLICIES: AccessPolicy[] = [
  { id: "zt-1", name: "Continuous Identity Verification", description: "Re-authenticate users every 4 hours or on context change", enabled: true, icon: <Fingerprint className="h-5 w-5" /> },
  { id: "zt-2", name: "Device Trust Validation", description: "Only allow access from managed devices with up-to-date security", enabled: true, icon: <Smartphone className="h-5 w-5" /> },
  { id: "zt-3", name: "Geo-Fencing Access Rules", description: "Block access from non-approved geographic regions", enabled: false, icon: <MapPin className="h-5 w-5" /> },
  { id: "zt-4", name: "Session Monitoring", description: "Monitor active sessions and terminate on anomalous behavior", enabled: true, icon: <Clock className="h-5 w-5" /> },
  { id: "zt-5", name: "Lateral Movement Prevention", description: "Microsegmentation to prevent east-west traffic between services", enabled: false, icon: <ShieldCheck className="h-5 w-5" /> },
  { id: "zt-6", name: "Context-Aware Access", description: "Adjust permissions based on time, device, location, and risk score", enabled: true, icon: <Monitor className="h-5 w-5" /> },
];

const SESSIONS: ActiveSession[] = [
  { id: "ses-1", user: "admin@company.com", device: "MacBook Pro (Managed)", location: "Mumbai, IN", trustScore: 95, lastVerified: "5 min ago", status: "trusted" },
  { id: "ses-2", user: "dev@company.com", device: "Windows Laptop (Managed)", location: "Bangalore, IN", trustScore: 88, lastVerified: "12 min ago", status: "trusted" },
  { id: "ses-3", user: "ops@company.com", device: "iPhone 15 (Personal)", location: "Delhi, IN", trustScore: 62, lastVerified: "45 min ago", status: "review" },
  { id: "ses-4", user: "contractor@ext.com", device: "Unknown Device", location: "Lagos, NG", trustScore: 15, lastVerified: "2 hours ago", status: "blocked" },
  { id: "ses-5", user: "finance@company.com", device: "ChromeBook (Managed)", location: "Pune, IN", trustScore: 91, lastVerified: "8 min ago", status: "trusted" },
];

const statusColors: Record<string, string> = {
  trusted: "text-green-600 bg-green-500/10",
  review: "text-orange-500 bg-orange-500/10",
  blocked: "text-destructive bg-destructive/10",
};

export default function ZeroTrustAccess() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [policies, setPolicies] = useState(POLICIES);

  const togglePolicy = (id: string) => {
    setPolicies(prev => prev.map(p => {
      if (p.id === id) {
        const next = !p.enabled;
        toast.success(`${p.name} ${next ? "enabled" : "disabled"}`);
        return { ...p, enabled: next };
      }
      return p;
    }));
  };

  const enabledCount = policies.filter(p => p.enabled).length;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} lastScanTime="" onRefresh={() => {}} />
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="md:ml-64 pt-16">
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Fingerprint className="h-6 w-6 text-primary" />
              Zero Trust Access Engine
            </h1>
            <p className="text-muted-foreground">Continuous identity verification, device trust, and context-aware access control</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{enabledCount}/{policies.length}</p><p className="text-xs text-muted-foreground">Active Policies</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-500">{SESSIONS.filter(s => s.status === "trusted").length}</p><p className="text-xs text-muted-foreground">Trusted Sessions</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-orange-500">{SESSIONS.filter(s => s.status === "review").length}</p><p className="text-xs text-muted-foreground">Under Review</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-destructive">{SESSIONS.filter(s => s.status === "blocked").length}</p><p className="text-xs text-muted-foreground">Blocked</p></CardContent></Card>
          </div>

          {/* Policies */}
          <Card>
            <CardHeader><CardTitle>Access Policies</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {policies.map(p => (
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

          {/* Active Sessions */}
          <Card>
            <CardHeader><CardTitle>Active Sessions</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Trust Score</TableHead>
                    <TableHead>Last Verified</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SESSIONS.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium text-sm">{s.user}</TableCell>
                      <TableCell className="text-sm">{s.device}</TableCell>
                      <TableCell className="text-sm">{s.location}</TableCell>
                      <TableCell>
                        <span className={`font-bold ${s.trustScore >= 80 ? "text-green-500" : s.trustScore >= 50 ? "text-orange-500" : "text-destructive"}`}>
                          {s.trustScore}/100
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.lastVerified}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[s.status]}>
                          {s.status === "trusted" && <ShieldCheck className="h-3 w-3 mr-1" />}
                          {s.status === "review" && <UserCheck className="h-3 w-3 mr-1" />}
                          {s.status === "blocked" && <ShieldAlert className="h-3 w-3 mr-1" />}
                          {s.status}
                        </Badge>
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
