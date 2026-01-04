import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className = "", showText = true, size = "md" }: LogoProps) {
  const sizeClasses = {
    sm: { icon: "h-6 w-6", text: "text-lg" },
    md: { icon: "h-8 w-8", text: "text-xl" },
    lg: { icon: "h-10 w-10", text: "text-2xl" },
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative">
        <Shield className={cn(sizeClasses[size].icon, "text-primary")} />
        <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full" />
      </div>
      {showText && (
        <span className={cn(sizeClasses[size].text, "font-bold text-foreground")}>
          SME Cloud<span className="text-primary">Guard</span>
        </span>
      )}
    </div>
  );
}
