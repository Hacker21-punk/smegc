import { Search, FileText, Wrench, CheckCircle, ClipboardList } from "lucide-react";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { cn } from "@/lib/utils";

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Secure Read-Only Scan",
    description: "We connect to your AWS account with read-only permissions and scan your infrastructure for security issues.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    number: "02",
    icon: FileText,
    title: "Clear Risk Explanation",
    description: "Every finding is explained in plain English with risk level and business impact — no jargon.",
    color: "text-info",
    bgColor: "bg-info/10",
  },
  {
    number: "03",
    icon: Wrench,
    title: "Guided Remediation",
    description: "Get step-by-step guidance or CloudFormation templates. You decide when and how to apply fixes.",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    number: "04",
    icon: CheckCircle,
    title: "Verification",
    description: "After you apply a fix, we verify the issue is resolved and update your security status.",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    number: "05",
    icon: ClipboardList,
    title: "Audit-Ready Evidence",
    description: "Generate compliance reports and audit timelines to demonstrate your security posture.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
];

export function HowItWorksSection() {
  const { ref, isIntersecting } = useIntersectionObserver({ threshold: 0.1 });

  return (
    <section id="how-it-works" ref={ref} className="py-20 lg:py-32 bg-muted/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-info/5 rounded-full blur-3xl" />

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
            How <span className="text-primary">SME Cloud Guard</span> Works
          </h2>
          <p className="text-lg text-muted-foreground">
            Five simple steps to secure your AWS infrastructure — without giving up control.
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          {/* Connecting line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-info to-success hidden md:block" />

          <div className="space-y-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={index}
                  className={cn(
                    "relative flex gap-6 transition-all duration-500",
                    isIntersecting
                      ? "opacity-100 translate-x-0"
                      : "opacity-0 -translate-x-8"
                  )}
                  style={{ transitionDelay: `${index * 150}ms` }}
                >
                  {/* Step number circle */}
                  <div
                    className={cn(
                      "flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center relative z-10 transition-all duration-300 group-hover:scale-110",
                      step.bgColor
                    )}
                  >
                    <Icon className={cn("h-7 w-7", step.color)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 bg-card rounded-xl p-6 border shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={cn("text-sm font-bold", step.color)}>{step.number}</span>
                      <h3 className="font-semibold text-lg">{step.title}</h3>
                    </div>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
