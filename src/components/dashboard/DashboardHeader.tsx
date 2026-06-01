import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationDropdown } from "@/components/dashboard/NotificationDropdown";
import { RefreshCw, User, Menu, LogOut, ChevronRight, Home } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  lastScanTime: string;
  onRefresh?: () => unknown | Promise<unknown>;
  onMenuToggle?: () => void;
}

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  findings: "Security Findings",
  accounts: "AWS Accounts",
  "azure-accounts": "Azure Accounts",
  "gcp-accounts": "GCP Projects",
  assets: "Asset Inventory",
  "attack-paths": "Attack Paths",
  "security-graph": "Security Graph",
  simulations: "Breach Simulation",
  "digital-twin": "Digital Twin",
  events: "Security Events",
  "runtime-security": "Runtime Detection",
  autopilot: "Autopilot Policies",
  drift: "Config Drift",
  kubernetes: "Kubernetes",
  "zero-trust": "Zero Trust",
  "saas-security": "SaaS Security",
  threats: "Threat Intel",
  reports: "Compliance",
  settings: "Settings",
  help: "Help & Support",
};

export function DashboardHeader({ lastScanTime, onRefresh, onMenuToggle }: DashboardHeaderProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const segments = location.pathname.split("/").filter(Boolean);
  // Build crumbs after "dashboard"
  const crumbs = segments.length > 1
    ? segments.slice(1).map((seg, i) => ({
        label: LABELS[seg] ?? seg.replace(/-/g, " "),
        href: "/" + segments.slice(0, i + 2).join("/"),
      }))
    : [];

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
      toast.success("Refreshed");
    } catch {
      toast.error("Refresh failed");
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  return (
    <TooltipProvider delayDuration={200}>
      <header className="sticky top-0 z-50 w-full border-b glass-strong">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {onMenuToggle && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuToggle} aria-label="Open menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Open navigation</TooltipContent>
              </Tooltip>
            )}
            <Link to="/dashboard" className="shrink-0">
              <Logo />
            </Link>

            {/* Breadcrumbs */}
            {crumbs.length > 0 && (
              <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-1.5 ml-3 min-w-0">
                <Link
                  to="/dashboard"
                  className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Dashboard home"
                >
                  <Home className="h-3.5 w-3.5" />
                </Link>
                {crumbs.map((c, i) => (
                  <div key={c.href} className="flex items-center gap-1.5 min-w-0">
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                    {i === crumbs.length - 1 ? (
                      <span className="text-xs font-semibold text-foreground capitalize truncate">{c.label}</span>
                    ) : (
                      <Link
                        to={c.href}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors capitalize truncate"
                      >
                        {c.label}
                      </Link>
                    )}
                  </div>
                ))}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {onRefresh && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="hidden sm:flex gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className={cn("h-4 w-4 transition-transform duration-700", isRefreshing && "animate-spin")} />
                    <span className="text-xs">Refresh</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Re-run latest scan data</TooltipContent>
              </Tooltip>
            )}

            {lastScanTime && lastScanTime !== "—" && lastScanTime !== "--" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 border border-border/50 cursor-default">
                    <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    <span className="text-[11px] text-muted-foreground font-medium">
                      Last scan: {lastScanTime}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">Time since last successful scan</TooltipContent>
              </Tooltip>
            )}

            <NotificationDropdown />

            <ThemeToggle />

            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full h-9 w-9 hover:ring-2 hover:ring-primary/20 transition-all"
                      aria-label="Account menu"
                    >
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                        <User className="h-3.5 w-3.5 text-primary-foreground" />
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">Account</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-56 animate-slide-up-fade">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-semibold">My Account</span>
                    {user?.email && (
                      <span className="text-xs text-muted-foreground font-normal truncate">{user.email}</span>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/dashboard/settings")} className="cursor-pointer">
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/dashboard/help")} className="cursor-pointer">
                  Help & Support
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}
