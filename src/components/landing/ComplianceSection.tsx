import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, CheckCircle2, Shield, Lock, Globe, FileCheck } from "lucide-react";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { cn } from "@/lib/utils";

const complianceFrameworks = [
  {
    title: "IT Act 2000",
    icon: Shield,
    description:
      "Information Technology Act compliance for data protection and cybersecurity requirements.",
    checks: [
      "Data encryption standards",
      "Audit trail maintenance",
      "Incident response procedures",
    ],
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    title: "GST Compliance",
    icon: FileCheck,
    description:
      "Goods and Services Tax regulations for digital record-keeping and data integrity.",
    checks: [
      "Invoice data protection",
      "Financial record integrity",
      "Secure data transmission",
    ],
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    title: "Bank Audit Requirements",
    icon: Lock,
    description:
      "RBI guidelines and banking sector audit standards for cloud infrastructure.",
    checks: [
      "Access control verification",
      "Transaction security",
      "Business continuity",
    ],
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    title: "MeitY Guidelines",
    icon: Globe,
    description:
      "Ministry of Electronics and IT cloud security recommendations.",
    checks: [
      "Data localization",
      "Vendor risk management",
      "Security certifications",
    ],
    color: "text-info",
    bgColor: "bg-info/10",
  },
];

export function ComplianceSection() {
  const { ref, isIntersecting } = useIntersectionObserver({ threshold: 0.1 });

  return (
    <section
      id="compliance"
      ref={ref}
      className="py-20 lg:py-32 bg-muted/30 relative overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-info/5 rounded-full blur-3xl" />

      <div className="container relative">
        <div
          className={cn(
            "mx-auto max-w-2xl text-center mb-16 transition-all duration-700",
            isIntersecting
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8"
          )}
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary mb-4 border border-primary/20">
            <FileText className="h-4 w-4" />
            <span>Indian Regulatory Compliance</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Built for <span className="text-primary">Indian Business</span>{" "}
            Requirements
          </h2>
          <p className="text-lg text-muted-foreground">
            Generate compliance-ready reports aligned with Indian regulatory
            frameworks and bank audit expectations.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {complianceFrameworks.map((framework, index) => {
            const Icon = framework.icon;
            return (
              <Card
                key={index}
                className={cn(
                  "bg-card group transition-all duration-500 hover:shadow-xl hover:-translate-y-1 card-interactive",
                  isIntersecting
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-8"
                )}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                        framework.bgColor,
                        framework.color
                      )}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="group-hover:text-primary transition-colors">
                      {framework.title}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    {framework.description}
                  </p>
                  <ul className="space-y-2">
                    {framework.checks.map((check, checkIndex) => (
                      <li
                        key={checkIndex}
                        className={cn(
                          "flex items-center gap-3 text-sm transition-all duration-300",
                          isIntersecting
                            ? "opacity-100 translate-x-0"
                            : "opacity-0 -translate-x-4"
                        )}
                        style={{
                          transitionDelay: `${index * 100 + checkIndex * 75}ms`,
                        }}
                      >
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-success/10 flex items-center justify-center">
                          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                        </div>
                        <span className="group-hover:text-foreground text-muted-foreground transition-colors">
                          {check}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
