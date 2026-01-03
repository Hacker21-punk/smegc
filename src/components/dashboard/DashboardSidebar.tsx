import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Shield,
  Cloud,
  FileText,
  Settings,
  Bell,
  HelpCircle,
  MessageSquare,
  IndianRupee,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  badge?: string;
}

const navItems: NavItem[] = [
  { icon: <LayoutDashboard className="h-5 w-5" />, label: "Dashboard", href: "/dashboard" },
  { icon: <Shield className="h-5 w-5" />, label: "Security Findings", href: "/dashboard/findings", badge: "12" },
  { icon: <Cloud className="h-5 w-5" />, label: "AWS Accounts", href: "/dashboard/accounts" },
  { icon: <FileText className="h-5 w-5" />, label: "Compliance Reports", href: "/dashboard/reports" },
  { icon: <Bell className="h-5 w-5" />, label: "Alert Settings", href: "/dashboard/alerts" },
  { icon: <IndianRupee className="h-5 w-5" />, label: "Billing", href: "/dashboard/billing" },
  { icon: <MessageSquare className="h-5 w-5" />, label: "WhatsApp Bot", href: "/dashboard/whatsapp" },
];

const bottomNavItems: NavItem[] = [
  { icon: <Settings className="h-5 w-5" />, label: "Settings", href: "/dashboard/settings" },
  { icon: <HelpCircle className="h-5 w-5" />, label: "Help & Support", href: "/dashboard/help" },
];

interface DashboardSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function DashboardSidebar({ isOpen = true, onClose }: DashboardSidebarProps) {
  const location = useLocation();

  return (
    <aside
      className={cn(
        "fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-64 border-r bg-sidebar transition-transform duration-300",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "md:translate-x-0"
      )}
    >
      <nav className="flex flex-col h-full p-4">
        <div className="flex-1 space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} to={item.href} onClick={onClose}>
              <Button
                variant={location.pathname === item.href ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3",
                  location.pathname === item.href && "bg-sidebar-accent text-sidebar-accent-foreground"
                )}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge && (
                  <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                    {item.badge}
                  </span>
                )}
              </Button>
            </Link>
          ))}
        </div>

        <div className="border-t pt-4 space-y-1">
          {bottomNavItems.map((item) => (
            <Link key={item.href} to={item.href} onClick={onClose}>
              <Button
                variant={location.pathname === item.href ? "secondary" : "ghost"}
                className="w-full justify-start gap-3 text-sidebar-foreground"
              >
                {item.icon}
                <span>{item.label}</span>
              </Button>
            </Link>
          ))}
        </div>
      </nav>
    </aside>
  );
}
