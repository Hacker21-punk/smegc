import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SecurityNotification {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  timestamp: Date;
  read: boolean;
  findingId?: string;
  type: "new_finding" | "account_change" | "scan_complete" | "system";
}

interface NotificationContextType {
  notifications: SecurityNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  markAsRead: () => {},
  markAllAsRead: () => {},
  clearAll: () => {},
});

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<SecurityNotification[]>([]);
  const mountedRef = useRef(true);

  // Load initial critical/high unresolved findings as notifications
  useEffect(() => {
    mountedRef.current = true;
    const loadInitial = async () => {
      const { data } = await supabase
        .from("security_findings")
        .select("id, title, description, severity, created_at")
        .eq("is_resolved", false)
        .in("severity", ["critical", "high"])
        .order("created_at", { ascending: false })
        .limit(20);

      if (data && mountedRef.current) {
        const initial: SecurityNotification[] = data.map((f) => ({
          id: `finding-${f.id}`,
          title: f.title,
          description: f.description || "Security issue detected",
          severity: f.severity as SecurityNotification["severity"],
          timestamp: new Date(f.created_at),
          read: true, // initial ones are "read" to avoid flood
          findingId: f.id,
          type: "new_finding" as const,
        }));
        setNotifications(initial);
      }
    };
    loadInitial();
    return () => { mountedRef.current = false; };
  }, []);

  // Realtime: new findings
  useEffect(() => {
    const channel = supabase
      .channel("notification-findings")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "security_findings" },
        (payload) => {
          const f = payload.new as any;
          const newNotif: SecurityNotification = {
            id: `finding-${f.id}-${Date.now()}`,
            title: f.title || "New Security Finding",
            description: f.description || "A new security issue has been detected.",
            severity: f.severity || "medium",
            timestamp: new Date(),
            read: false,
            findingId: f.id,
            type: "new_finding",
          };

          setNotifications((prev) => [newNotif, ...prev].slice(0, 50));

          // Toast for critical/high
          if (f.severity === "critical") {
            toast.error(`🚨 Critical: ${f.title}`, {
              description: f.description?.slice(0, 100),
              duration: 8000,
            });
          } else if (f.severity === "high") {
            toast.warning(`⚠️ High: ${f.title}`, {
              description: f.description?.slice(0, 100),
              duration: 6000,
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Realtime: account status changes
  useEffect(() => {
    const channel = supabase
      .channel("notification-accounts")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "aws_accounts" },
        (payload) => {
          const acc = payload.new as any;
          const old = payload.old as any;
          if (acc.status !== old.status) {
            const newNotif: SecurityNotification = {
              id: `account-${acc.id}-${Date.now()}`,
              title: `Account ${acc.account_alias || acc.account_id} status changed`,
              description: `Status changed from ${old.status} to ${acc.status}`,
              severity: acc.status === "error" ? "critical" : "info",
              timestamp: new Date(),
              read: false,
              type: "account_change",
            };
            setNotifications((prev) => [newNotif, ...prev].slice(0, 50));

            if (acc.status === "error") {
              toast.error(`Account ${acc.account_alias || acc.account_id} encountered an error`);
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Realtime: scan completions
  useEffect(() => {
    const channel = supabase
      .channel("notification-scans")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "scan_jobs" },
        (payload) => {
          const scan = payload.new as any;
          const old = payload.old as any;
          if (scan.status === "completed" && old.status !== "completed") {
            const newNotif: SecurityNotification = {
              id: `scan-${scan.id}-${Date.now()}`,
              title: "Security Scan Completed",
              description: `Found ${scan.findings_count || 0} issues. Risk score: ${scan.risk_score || 0}/100`,
              severity: (scan.risk_score || 0) >= 70 ? "high" : "info",
              timestamp: new Date(),
              read: false,
              type: "scan_complete",
            };
            setNotifications((prev) => [newNotif, ...prev].slice(0, 50));
            toast.success("Security scan completed", {
              description: `${scan.findings_count || 0} findings detected`,
            });
          } else if (scan.status === "failed" && old.status !== "failed") {
            const newNotif: SecurityNotification = {
              id: `scan-fail-${scan.id}-${Date.now()}`,
              title: "Scan Failed",
              description: scan.error_message || "The security scan encountered an error",
              severity: "critical",
              timestamp: new Date(),
              read: false,
              type: "system",
            };
            setNotifications((prev) => [newNotif, ...prev].slice(0, 50));
            toast.error("Security scan failed");
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAsRead, markAllAsRead, clearAll }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
