import { Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className = "", showText = true, size = "md" }: LogoProps) {
  const sizeClasses = {
    sm: { container: "h-7 w-7", icon: "h-4 w-4", text: "text-base", bolt: "h-2 w-2" },
    md: { container: "h-9 w-9", icon: "h-5 w-5", text: "text-lg", bolt: "h-2.5 w-2.5" },
    lg: { container: "h-11 w-11", icon: "h-6 w-6", text: "text-xl", bolt: "h-3 w-3" },
  };

  const s = sizeClasses[size];

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative group">
        {/* Glow background */}
        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150 group-hover:bg-primary/30 transition-all duration-500" />
        
        {/* Main icon container */}
        <div className={cn(
          s.container,
          "relative rounded-xl bg-gradient-to-br from-primary to-info flex items-center justify-center shadow-lg shadow-primary/25 group-hover:shadow-primary/40 transition-all duration-300 group-hover:scale-105"
        )}>
          <Shield className={cn(s.icon, "text-primary-foreground drop-shadow-sm")} />
          
          {/* Small bolt indicator */}
          <div className="absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-0.5">
            <div className="bg-success rounded-full p-0.5 flex items-center justify-center">
              <Zap className={cn(s.bolt, "text-success-foreground fill-current")} />
            </div>
          </div>
        </div>
      </div>
      
      {showText && (
        <div className="flex flex-col">
          <span className={cn(s.text, "font-bold tracking-tight leading-none")}>
            <span className="text-foreground">Cloud</span>
            <span className="gradient-text">Guard</span>
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground leading-none mt-0.5">
            Autopilot
          </span>
        </div>
      )}
    </div>
  );
}