import { cn } from "@/lib/utils";

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
      <div className={cn(s.icon, "relative flex items-center justify-center")}>
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <rect width="32" height="32" rx="8" className="fill-primary" />
          <path
            d="M16 6L8 10v6c0 5.25 3.4 10.15 8 11.33C20.6 26.15 24 21.25 24 16v-6l-8-4z"
            className="fill-primary-foreground"
            opacity="0.9"
          />
          <path
            d="M14.5 16.5l2 2 4-4"
            className="stroke-primary"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

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
