import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationDropdown } from "@/components/dashboard/NotificationDropdown";
import { RefreshCw, User, Menu, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useState } from "react";

interface DashboardHeaderProps {
  lastScanTime: string;
  onRefresh?: () => void | Promise<void>;
  onMenuToggle?: () => void;
}

export function DashboardHeader({ lastScanTime, onRefresh, onMenuToggle }: DashboardHeaderProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    <header className="sticky top-0 z-50 w-full border-b glass-strong">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-4">
          {onMenuToggle && (
            <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuToggle}>
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <Logo />
        </div>

        <div className="flex items-center gap-1.5">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh} 
            className="hidden sm:flex gap-2 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={cn("h-4 w-4 transition-transform duration-700", isRefreshing && "animate-spin")} />
            <span className="text-xs">Refresh</span>
          </Button>

          {lastScanTime && lastScanTime !== "—" && lastScanTime !== "--" && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 border border-border/50">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[11px] text-muted-foreground font-medium">
                Last scan: {lastScanTime}
              </span>
            </div>
          )}

          <NotificationDropdown />

          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 hover:ring-2 hover:ring-primary/20 transition-all">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-info flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
              </Button>
            </DropdownMenuTrigger>
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
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}