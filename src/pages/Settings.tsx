import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  User,
  Bell,
  Palette,
  Shield,
  Monitor,
  Moon,
  Sun,
  Mail,
  Lock,
} from "lucide-react";

export default function Settings() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Notification preferences (local state for demo)
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [scanAlerts, setScanAlerts] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSavePreferences = () => {
    toast.success("Preferences saved successfully");
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader lastScanTime="—" onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="pt-16 md:pl-64">
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="heading-display text-foreground">Settings</h1>
            <p className="text-fluid-subtitle text-muted-foreground mt-1">
              Manage your account preferences and application settings
            </p>
          </div>

          {/* Profile Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Profile</CardTitle>
                  <CardDescription>Your account information</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground text-sm">Email</Label>
                  <p className="font-medium">{user?.email || "Not available"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Full Name</Label>
                  <p className="font-medium">
                    {user?.user_metadata?.full_name || "Not set"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Company</Label>
                  <p className="font-medium">
                    {user?.user_metadata?.company_name || "Not set"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Account Status</Label>
                  <Badge variant="secondary" className="mt-1">Active</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Appearance Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Palette className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Appearance</CardTitle>
                  <CardDescription>Customize the look and feel</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Label className="text-sm font-medium">Theme</Label>
                <div className="flex gap-2">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("light")}
                    className="flex items-center gap-2"
                  >
                    <Sun className="h-4 w-4" />
                    Light
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("dark")}
                    className="flex items-center gap-2"
                  >
                    <Moon className="h-4 w-4" />
                    Dark
                  </Button>
                  <Button
                    variant={theme === "system" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("system")}
                    className="flex items-center gap-2"
                  >
                    <Monitor className="h-4 w-4" />
                    System
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Notifications</CardTitle>
                  <CardDescription>Configure how you receive alerts</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <Label className="font-medium">Email Notifications</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Receive email updates about your security posture
                  </p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <Label className="font-medium">Critical Scan Alerts</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Immediate alerts for critical security findings
                  </p>
                </div>
                <Switch checked={scanAlerts} onCheckedChange={setScanAlerts} />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="font-medium">Weekly Summary Reports</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive a weekly overview of your security status
                  </p>
                </div>
                <Switch checked={weeklyReports} onCheckedChange={setWeeklyReports} />
              </div>

              <Button onClick={handleSavePreferences} className="w-full md:w-auto">
                Save Preferences
              </Button>
            </CardContent>
          </Card>

          {/* Security Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Security</CardTitle>
                  <CardDescription>Manage your account security</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-success mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Read-Only AWS Access</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      SME Cloud Guard uses read-only permissions to scan your AWS accounts. 
                      We never make changes to your infrastructure.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>For password changes or account recovery, please use the authentication options on the login page.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
