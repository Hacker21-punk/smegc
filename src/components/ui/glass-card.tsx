import * as React from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  intensity?: "light" | "medium" | "strong";
  hover?: boolean;
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, children, intensity = "medium", hover = true, ...props }, ref) => {
    const intensityClasses = {
      light: "bg-background/40 backdrop-blur-sm",
      medium: "bg-background/60 backdrop-blur-md",
      strong: "bg-background/80 backdrop-blur-lg",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border border-border/50 shadow-lg",
          intensityClasses[intensity],
          hover && "transition-all duration-300 hover:shadow-xl hover:border-primary/20 hover:-translate-y-1",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
GlassCard.displayName = "GlassCard";

export { GlassCard };
