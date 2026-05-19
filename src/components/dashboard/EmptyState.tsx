import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Cloud, ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  secondaryCta?: ReactNode;
}

/**
 * Production empty state shown when no real telemetry / cloud data exists yet.
 * Guides the user to connect their cloud account so the module can populate.
 */
export function EmptyState({
  icon,
  title,
  description,
  ctaLabel = "Connect cloud account",
  ctaHref = "/aws-accounts",
  secondaryCta,
}: EmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-16 px-6 text-center flex flex-col items-center">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-5">
          {icon ?? <Cloud className="h-7 w-7" />}
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-6">{description}</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button asChild>
            <Link to={ctaHref}>
              {ctaLabel}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
          {secondaryCta}
        </div>
      </CardContent>
    </Card>
  );
}
