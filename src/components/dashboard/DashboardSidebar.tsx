import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Shield,
  Cloud,
  FileText,
  Settings,
  HelpCircle,
  Lock,
  Globe,
  Route,
  Zap,
  GitCompareArrows,
  Radar,
  Crosshair,
  Layers,
  Container,
  Fingerprint,
  Globe2,
  Activity,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  badge?: number;
}

interface DashboardSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function DashboardSidebar({ isOpen = true, onClose }: DashboardSidebarProps) {
  const location = useLocation();
  const [activeFindings, setActiveFindings] = useState(0);

  // Fetch active findings count
  useEffect(() => {
    const fetchActiveFindings = async () => {
      const { count, error } = await supabase
        .from("security_findings")
        .select("*", { count: "exact", head: true })
        .eq("is_resolved", false);

      if (!error && count !== null) {
        setActiveFindings(count);
      }
    };

    fetchActiveFindings();

    // Subscribe to real-time changes
    const channel = supabase
      .channel("findings-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "security_findings" },
        () => {
          fetchActiveFindings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const navItems: NavItem[] = [
    { 
      icon: <LayoutDashboard className="h-5 w-5" />, 
      label: "Dashboard", 
      href: "/dashboard" 
    },
    { 
      icon: <Shield className="h-5 w-5" />, 
      label: "Security Findings", 
      href: "/dashboard/findings", 
      badge: activeFindings > 0 ? activeFindings : undefined
    },
    { 
      icon: <Cloud className="h-5 w-5" />, 
      label: "AWS Accounts", 
      href: "/dashboard/accounts" 
    },
    { 
      icon: <FileText className="h-5 w-5" />, 
      label: "Compliance Reports", 
      href: "/dashboard/reports" 
    },
    {
      icon: <Globe className="h-5 w-5" />,
      label: "Asset Inventory",
      href: "/dashboard/assets"
    },
    {
      icon: <Route className="h-5 w-5" />,
      label: "Attack Paths",
      href: "/dashboard/attack-paths"
    },
    {
      icon: <Zap className="h-5 w-5" />,
      label: "Autopilot Policies",
      href: "/dashboard/autopilot"
    },
    {
      icon: <GitCompareArrows className="h-5 w-5" />,
      label: "Config Drift",
      href: "/dashboard/drift"
    },
    {
      icon: <Radar className="h-5 w-5" />,
      label: "Threat Intelligence",
      href: "/dashboard/threats"
    },
    {
      icon: <Crosshair className="h-5 w-5" />,
      label: "Breach Simulation",
      href: "/dashboard/simulations"
    },
    {
      icon: <Layers className="h-5 w-5" />,
      label: "Digital Twin",
      href: "/dashboard/digital-twin"
    },
    {
      icon: <Container className="h-5 w-5" />,
      label: "Kubernetes Security",
      href: "/dashboard/kubernetes"
    },
    {
      icon: <Fingerprint className="h-5 w-5" />,
      label: "Zero Trust Access",
      href: "/dashboard/zero-trust"
    },
    {
      icon: <Globe2 className="h-5 w-5" />,
      label: "SaaS Security",
      href: "/dashboard/saas-security"
    },
    {
      icon: <Activity className="h-5 w-5" />,
      label: "Security Events",
      href: "/dashboard/events"
    },
  ];

  const bottomNavItems: NavItem[] = [
    { icon: <Settings className="h-5 w-5" />, label: "Settings", href: "/dashboard/settings" },
    { icon: <HelpCircle className="h-5 w-5" />, label: "Help & Support", href: "/dashboard/help" },
  ];

  return (
    <aside
      className={cn(
        "fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-64 border-r bg-sidebar transition-transform duration-300",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "md:translate-x-0"
      )}
    >
      <nav className="flex flex-col h-full p-4">
        {/* Trust Signal */}
        <div className="mb-4 p-3 rounded-lg bg-success/5 border border-success/10">
          <div className="flex items-center gap-2 text-success">
            <Lock className="h-4 w-4" />
            <span className="text-xs font-medium">Read-Only Access</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            We never modify your AWS resources
          </p>
        </div>

        <div className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== "/dashboard" && location.pathname.startsWith(item.href));
            
            return (
              <Link key={item.href} to={item.href} onClick={onClose}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 transition-all",
                    isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                  )}
                >
                  {item.icon}
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="ml-auto h-5 min-w-5 flex items-center justify-center text-xs animate-pulse"
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </Badge>
                  )}
                </Button>
              </Link>
            );
          })}
        </div>

        <div className="border-t pt-4 space-y-1">
          {bottomNavItems.map((item) => {
            const isActive = location.pathname === item.href;
            
            return (
              <Link key={item.href} to={item.href} onClick={onClose}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className="w-full justify-start gap-3 text-sidebar-foreground"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </div>

        {/* Footer Trust Message */}
        <div className="mt-4 pt-4 border-t">
          <p className="text-[10px] text-center text-muted-foreground">
            You stay in control of your infrastructure
          </p>
        </div>
      </nav>
    </aside>
  );
}
