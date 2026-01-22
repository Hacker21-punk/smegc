import { AlertTriangle, Users, DollarSign, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { cn } from "@/lib/utils";

const problems = [
  {
    icon: AlertTriangle,
    title: "Misconfigurations Are #1 Risk",
    description: "Most AWS security breaches stem from simple misconfigurations, not sophisticated attacks.",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    icon: Users,
    title: "No Dedicated Security Team",
    description: "SMEs rarely have security specialists to monitor and manage cloud infrastructure.",
    color: "text-info",
    bgColor: "bg-info/10",
  },
  {
    icon: DollarSign,
    title: "Enterprise Tools Are Expensive",
    description: "Existing security solutions are priced for large enterprises, not growing businesses.",
    color: "text-critical",
    bgColor: "bg-critical/10",
  },
  {
    icon: ShieldAlert,
    title: "Write Access Feels Risky",
    description: "Many tools require write permissions, which SMEs don't trust on production systems.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
];

export function ProblemSection() {
  const { ref, isIntersecting } = useIntersectionObserver({ threshold: 0.1 });

  return (
    <section ref={ref} className="py-20 lg:py-32 relative overflow-hidden">
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
            The <span className="text-critical">Problem</span> We Solve
          </h2>
          <p className="text-lg text-muted-foreground">
            AWS security doesn't have to be complex or risky. We built SME Cloud Guard as the safe alternative.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {problems.map((problem, index) => {
            const Icon = problem.icon;
            return (
              <Card
                key={index}
                className={cn(
                  "border bg-card shadow-sm transition-all duration-500 group hover:shadow-lg hover:-translate-y-1",
                  isIntersecting
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-8"
                )}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <CardContent className="pt-6">
                  <div
                    className={cn(
                      "mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110",
                      problem.bgColor,
                      problem.color
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                    {problem.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {problem.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Solution Statement */}
        <div
          className={cn(
            "mt-12 text-center transition-all duration-700 delay-500",
            isIntersecting
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8"
          )}
        >
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            <span className="text-foreground font-medium">SME Cloud Guard</span> gives you enterprise-grade security visibility with read-only access — so you stay in control.
          </p>
        </div>
      </div>
    </section>
  );
}
