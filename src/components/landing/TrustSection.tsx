import { Shield, Award, Building2, Users } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { cn } from "@/lib/utils";

const stats = [
  { icon: Building2, value: 500, suffix: "+", label: "SMEs Protected" },
  { icon: Shield, value: 10000, suffix: "+", label: "Threats Detected" },
  { icon: Award, value: 99.9, suffix: "%", label: "Uptime SLA", decimals: 1 },
  { icon: Users, value: 24, suffix: "/7", label: "Support (Hindi/English)" },
];

export function TrustSection() {
  const { ref, isIntersecting } = useIntersectionObserver({ threshold: 0.2 });

  return (
    <section ref={ref} className="py-16 border-y bg-card relative overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-info/5" />

      <div className="container relative">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className={cn(
                  "text-center group transition-all duration-500",
                  isIntersecting
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-8"
                )}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/20 group-hover:shadow-lg group-hover:shadow-primary/20">
                  <Icon className="h-7 w-7" />
                </div>
                <div className="text-3xl sm:text-4xl font-bold">
                  {isIntersecting ? (
                    <AnimatedCounter
                      value={stat.value}
                      suffix={stat.suffix}
                      decimals={stat.decimals}
                      duration={1500}
                    />
                  ) : (
                    <span>0{stat.suffix}</span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground mt-1 group-hover:text-foreground transition-colors">
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
