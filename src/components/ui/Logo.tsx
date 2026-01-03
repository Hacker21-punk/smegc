import { Shield } from "lucide-react";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className = "", showText = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <Shield className="h-8 w-8 text-primary" />
        <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full" />
      </div>
      {showText && (
        <span className="text-xl font-bold text-foreground">
          SME Cloud<span className="text-primary">Guard</span>
        </span>
      )}
    </div>
  );
}
