import { Rocket, Building2, User, ClipboardCheck } from "lucide-react";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { cn } from "@/lib/utils";

const audiences = [
  {
    icon: Rocket,
    title: "Indian Startups",
    description: "Growing fast on AWS and need visibility into security without slowing down development.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Building2,
    title: "Small Businesses",
    description: "Running critical workloads on AWS but without dedicated security teams or big budgets.",
    color: "text-info",
    bgColor: "bg-info/10",
  },
  {
    icon: User,
    title: "Founders & CTOs",
    description: "Want to understand their security posture clearly — not buried in technical jargon.",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    icon: ClipboardCheck,
    title: "Audit-Ready Teams",
    description: "Preparing for client security reviews, ISO certifications, or compliance audits.",
    color: "text-success",
    bgColor: "bg-success/10",
  },
];

export function TargetAudienceSection() {
  const { ref, isIntersecting } = useIntersectionObserver({ threshold: 0.1 });

  return (
    <section ref={ref} className="py-20 lg:py-32 bg-muted/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-info/5 rounded-full blur-3xl" />

      <div className="container relative">
        <div
          className={cn(
            "mx-auto max-w-2xl text-center mb-16 transition-all duration-700",
            isIntersecting
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8"
          )}
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Built for <span className="text-primary">You</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            SME Cloud Guard is designed specifically for businesses that need security without complexity.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {audiences.map((audience, index) => {
            const Icon = audience.icon;
            return (
              <div
                key={index}
                className={cn(
                  "text-center transition-all duration-500",
                  isIntersecting
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-8"
                )}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div
                  className={cn(
                    "mx-auto mb-4 h-16 w-16 rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-110",
                    audience.bgColor
                  )}
                >
                  <Icon className={cn("h-8 w-8", audience.color)} />
                </div>
                <h3 className="font-semibold text-lg mb-2">{audience.title}</h3>
                <p className="text-sm text-muted-foreground">{audience.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
