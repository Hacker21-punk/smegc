import { Shield, Eye, Lock, UserCheck, Server, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { cn } from "@/lib/utils";

const safetyPoints = [
  {
    icon: Eye,
    title: "Read-Only Access",
    description: "SME Cloud Guard never modifies your AWS resources. We only read configuration data.",
  },
  {
    icon: Lock,
    title: "No Write Permissions",
    description: "No IAM changes, no resource modifications, no automatic fixes applied to your account.",
  },
  {
    icon: UserCheck,
    title: "User-Controlled Remediation",
    description: "You decide what to fix and when. We provide guidance — you apply the changes.",
  },
  {
    icon: Server,
    title: "Production Safe",
    description: "Designed specifically to be safe for live production AWS accounts.",
  },
];

export function SafetySection() {
  const { ref, isIntersecting } = useIntersectionObserver({ threshold: 0.1 });

  return (
    <section ref={ref} className="py-20 lg:py-32 relative overflow-hidden">
      <div className="container relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Main message */}
          <div
            className={cn(
              "transition-all duration-700",
              isIntersecting
                ? "opacity-100 translate-x-0"
                : "opacity-0 -translate-x-8"
            )}
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-success/10 px-4 py-2 text-sm font-medium text-success mb-6 border border-success/20">
              <Shield className="h-4 w-4" />
              <span>Zero-Write Security</span>
            </div>
            
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
              Why It's <span className="text-success">Safe</span> to Use
            </h2>
            
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              We understand the hesitation. Connecting any tool to your AWS account feels risky. That's why SME Cloud Guard is built from the ground up with a zero-write philosophy.
            </p>

            {/* Trust statement */}
            <div className="bg-success/5 border border-success/20 rounded-xl p-6">
              <p className="text-foreground font-medium mb-4">
                Our Promise:
              </p>
              <ul className="space-y-3">
                {[
                  "We will never modify your AWS resources",
                  "We will never perform automatic fixes",
                  "We will never access sensitive data like secrets or credentials",
                  "You remain in full control at all times",
                ].map((promise, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{promise}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right side - Safety points grid */}
          <div
            className={cn(
              "grid sm:grid-cols-2 gap-4 transition-all duration-700 delay-200",
              isIntersecting
                ? "opacity-100 translate-x-0"
                : "opacity-0 translate-x-8"
            )}
          >
            {safetyPoints.map((point, index) => {
              const Icon = point.icon;
              return (
                <Card
                  key={index}
                  className={cn(
                    "bg-card border shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1",
                    isIntersecting
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-4"
                  )}
                  style={{ transitionDelay: `${300 + index * 100}ms` }}
                >
                  <CardContent className="pt-6">
                    <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center mb-4">
                      <Icon className="h-5 w-5 text-success" />
                    </div>
                    <h3 className="font-semibold mb-2">{point.title}</h3>
                    <p className="text-sm text-muted-foreground">{point.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
