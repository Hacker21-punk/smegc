import { useNotifications, SecurityNotification } from "@/contexts/NotificationContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  AlertTriangle,
  ShieldAlert,
  Shield,
  Info,
  CheckCircle2,
  Server,
  Radar,
  X,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

const severityConfig = {
  critical: { icon: ShieldAlert, color: "text-critical", bg: "bg-critical/10", border: "border-critical/20" },
  high: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10", border: "border-warning/20" },
  medium: { icon: Shield, color: "text-info", bg: "bg-info/10", border: "border-info/20" },
  low: { icon: Info, color: "text-muted-foreground", bg: "bg-muted/10", border: "border-border" },
  info: { icon: Info, color: "text-muted-foreground", bg: "bg-muted/10", border: "border-border" },
};

const typeIcons = {
  new_finding: AlertTriangle,
  account_change: Server,
  scan_complete: Radar,
  system: Info,
};

export function NotificationDropdown() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const navigate = useNavigate();

  const handleNotifClick = (notif: SecurityNotification) => {
    markAsRead(notif.id);
    if (notif.type === "new_finding") {
      navigate("/dashboard/findings");
    } else if (notif.type === "account_change") {
      navigate("/dashboard/accounts");
    } else if (notif.type === "scan_complete") {
      navigate("/dashboard/findings");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 group">
          <Bell className={cn(
            "h-4 w-4 transition-all duration-300",
            unreadCount > 0 && "animate-[wiggle_0.5s_ease-in-out]"
          )} />
          {unreadCount > 0 && (
            <>
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 text-[10px] font-bold bg-critical text-critical-foreground rounded-full flex items-center justify-center animate-scale-in">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
              <span className="absolute top-1 right-1 w-4 h-4 bg-critical rounded-full animate-ping opacity-30" />
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[380px] p-0 animate-slide-up-fade"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="outline" className="bg-critical/10 text-critical border-critical/20 text-[10px]">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1" onClick={markAllAsRead}>
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 text-muted-foreground" onClick={clearAll}>
                <X className="h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Notifications list */}
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-3 opacity-60" />
              <p className="text-sm text-muted-foreground">All clear — no notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {notifications.map((notif) => {
                const config = severityConfig[notif.severity];
                const SeverityIcon = config.icon;
                const TypeIcon = typeIcons[notif.type];

                return (
                  <button
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={cn(
                      "w-full text-left px-4 py-3 flex gap-3 transition-colors duration-200 hover:bg-muted/50",
                      !notif.read && "bg-primary/5"
                    )}
                  >
                    {/* Icon */}
                    <div className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                      config.bg
                    )}>
                      <SeverityIcon className={cn("h-4 w-4", config.color)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-xs leading-snug line-clamp-2",
                          !notif.read ? "font-semibold" : "font-medium text-muted-foreground"
                        )}>
                          {notif.title}
                        </p>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                        {notif.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", config.border, config.color)}>
                          {notif.severity}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(notif.timestamp, { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-border/50 px-4 py-2.5">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/dashboard/findings")}
            >
              View all security findings
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
