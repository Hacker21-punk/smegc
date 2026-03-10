import { cn } from "@/lib/utils";
import cloudguardLogo from "@/assets/cloudguard-logo.png";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className = "", showText = true, size = "md" }: LogoProps) {
  const sizeClasses = {
    sm: { icon: "h-7 w-7", text: "text-base", sub: "text-[9px]" },
    md: { icon: "h-8 w-8", text: "text-lg", sub: "text-[10px]" },
    lg: { icon: "h-10 w-10", text: "text-xl", sub: "text-[11px]" },
  };

  const s = sizeClasses[size];

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <img
        src={cloudguardLogo}
        alt="CloudGuard Logo"
        className={cn(s.icon, "object-contain")}
      />

      {showText && (
        <div className="flex flex-col">
          <span className={cn(s.text, "font-bold tracking-tight leading-none")}>
            <span className="text-foreground">Cloud</span>
            <span className="gradient-text">Guard</span>
          </span>
          <span className={cn(s.sub, "font-medium uppercase tracking-[0.2em] text-muted-foreground leading-none mt-0.5")}>
            Autopilot
          </span>
        </div>
      )}
    </div>
  );
}
