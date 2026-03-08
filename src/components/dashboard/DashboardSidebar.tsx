import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  ChevronDown,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  badge?: number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface DashboardSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function DashboardSidebar({ isOpen = true, onClose }: DashboardSidebarProps) {
  const location = useLocation();
  const [activeFindings, setActiveFindings] = useState(0);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchActiveFindings = async () => {
      const { count, error } = await supabase
        .from("security_findings")
        .select("*", { count: "exact", head: true })
        .eq("is_resolved", false);
      if (!error && count !== null) setActiveFindings(count);
    };

    fetchActiveFindings();

    const channel = supabase
      .channel("findings-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "security_findings" }, () => {
        fetchActiveFindings();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const navGroups: NavGroup[] = [
    {
      label: "Overview",
      items: [
        { icon: <LayoutDashboard className="h-4 w-4" />, label: "Dashboard", href: "/dashboard" },
        { icon: <Shield className="h-4 w-4" />, label: "Security Findings", href: "/dashboard/findings", badge: activeFindings > 0 ? activeFindings : undefined },
        { icon: <Cloud className="h-4 w-4" />, label: "AWS Accounts", href: "/dashboard/accounts" },
      ],
    },
    {
      label: "Security",
      items: [
        { icon: <Globe className="h-4 w-4" />, label: "Asset Inventory", href: "/dashboard/assets" },
        { icon: <Route className="h-4 w-4" />, label: "Attack Paths", href: "/dashboard/attack-paths" },
        { icon: <Crosshair className="h-4 w-4" />, label: "Breach Simulation", href: "/dashboard/simulations" },
        { icon: <Layers className="h-4 w-4" />, label: "Digital Twin", href: "/dashboard/digital-twin" },
        { icon: <Activity className="h-4 w-4" />, label: "Security Events", href: "/dashboard/events" },
      ],
    },
    {
      label: "Protection",
      items: [
        { icon: <Zap className="h-4 w-4" />, label: "Autopilot Policies", href: "/dashboard/autopilot" },
        { icon: <GitCompareArrows className="h-4 w-4" />, label: "Config Drift", href: "/dashboard/drift" },
        { icon: <Container className="h-4 w-4" />, label: "Kubernetes", href: "/dashboard/kubernetes" },
        { icon: <Fingerprint className="h-4 w-4" />, label: "Zero Trust", href: "/dashboard/zero-trust" },
        { icon: <Globe2 className="h-4 w-4" />, label: "SaaS Security", href: "/dashboard/saas-security" },
      ],
    },
    {
      label: "Intelligence",
      items: [
        { icon: <Radar className="h-4 w-4" />, label: "Threat Intel", href: "/dashboard/threats" },
        { icon: <FileText className="h-4 w-4" />, label: "Compliance", href: "/dashboard/reports" },
      ],
    },
  ];

  const bottomNavItems: NavItem[] = [
    { icon: <Settings className="h-4 w-4" />, label: "Settings", href: "/dashboard/settings" },
    { icon: <HelpCircle className="h-4 w-4" />, label: "Help & Support", href: "/dashboard/help" },
  ];

  const toggleGroup = (label: string) => {
    setCollapsedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-64 border-r bg-sidebar transition-all duration-300 ease-out",
        isOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0",
        "md:translate-x-0 md:opacity-100"
      )}
    >
      <div className="flex flex-col h-full">
        {/* Trust Signal */}
        <div className="mx-3 mt-3 mb-1 p-2.5 rounded-lg bg-success/5 border border-success/10">
          <div className="flex items-center gap-2 text-success">
            <Lock className="h-3.5 w-3.5" />
            <span className="text-[11px] font-semibold">Read-Only Access</span>
          </div>
          <p className="text-[10px] text-sidebar-foreground/50 mt-0.5">
            We never modify your cloud resources
          </p>
        </div>

        {/* Main Nav */}
        <ScrollArea className="flex-1 px-3 py-2">
          <nav className="space-y-4">
            {navGroups.map((group) => {
              const isCollapsed = collapsedGroups[group.label];
              return (
                <div key={group.label}>
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="flex items-center justify-between w-full px-2 py-1 mb-1 group"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/40 group-hover:text-sidebar-foreground/60 transition-colors">
                      {group.label}
                    </span>
                    <ChevronDown className={cn(
                      "h-3 w-3 text-sidebar-foreground/30 transition-transform duration-200",
                      isCollapsed && "-rotate-90"
                    )} />
                  </button>
                  
                  <div className={cn(
                    "space-y-0.5 overflow-hidden transition-all duration-300 ease-out",
                    isCollapsed ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"
                  )}>
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.href ||
                        (item.href !== "/dashboard" && location.pathname.startsWith(item.href));
                      
                      return (
                        <Link key={item.href} to={item.href} onClick={onClose}>
                          <div
                            className={cn(
                              "sidebar-nav-item flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium",
                              isActive
                                ? "active bg-sidebar-accent text-sidebar-accent-foreground"
                                : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                            )}
                          >
                            <span className={cn(
                              "transition-colors",
                              isActive ? "text-primary" : "text-sidebar-foreground/50"
                            )}>
                              {item.icon}
                            </span>
                            <span className="flex-1 truncate">{item.label}</span>
                            {item.badge !== undefined && item.badge > 0 && (
                              <Badge 
                                variant="destructive" 
                                className="h-5 min-w-5 flex items-center justify-center text-[10px] font-bold px-1.5"
                              >
                                {item.badge > 99 ? "99+" : item.badge}
                              </Badge>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Bottom Nav */}
        <div className="border-t border-sidebar-border px-3 py-2 space-y-0.5">
          {bottomNavItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link key={item.href} to={item.href} onClick={onClose}>
                <div
                  className={cn(
                    "sidebar-nav-item flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium",
                    isActive
                      ? "active bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <span className="text-sidebar-foreground/50">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2 px-2">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <p className="text-[10px] text-sidebar-foreground/40 font-medium">
              All systems operational
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}