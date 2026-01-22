import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, CheckCircle2, Shield, AlertCircle } from "lucide-react";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { cn } from "@/lib/utils";

const complianceFrameworks = [
  {
    title: "ISO 27001",
    description: "Information security management system compliance evidence.",
    checks: [
      "Access control documentation",
      "Security policy mapping",
      "Risk assessment records",
    ],
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    title: "SOC 2",
    description: "Service organization control readiness documentation.",
    checks: [
      "Security monitoring evidence",
      "Change management logs",
      "Incident response records",
    ],
    color: "text-info",
    bgColor: "bg-info/10",
  },
  {
    title: "DPDP Act",
    description: "Digital Personal Data Protection Act compliance support.",
    checks: [
      "Data protection controls",
      "Encryption verification",
      "Access audit trails",
    ],
    color: "text-success",
    bgColor: "bg-success/10",
  },
];

export function ComplianceSection() {
  const { ref, isIntersecting } = useIntersectionObserver({ threshold: 0.1 });

  return (
    <section
      id="compliance"
      ref={ref}
      className="py-20 lg:py-32 relative overflow-hidden"
    >
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
            <span>Compliance Evidence</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Prepare for <span className="text-primary">Audits</span> with Confidence
          </h2>
          <p className="text-lg text-muted-foreground">
            Generate compliance evidence mapped to popular frameworks. Perfect for client reviews and audit preparation.
          </p>
        </div>

        {/* Disclaimer */}
        <div
          className={cn(
            "max-w-2xl mx-auto mb-12 bg-warning/5 border border-warning/20 rounded-xl p-4 flex items-start gap-3 transition-all duration-700",
            isIntersecting
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8"
          )}
        >
          <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Important:</span> SME Cloud Guard provides compliance evidence and helps prepare for audits. We do not provide official certifications. Work with accredited auditors for formal compliance certification.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {complianceFrameworks.map((framework, index) => (
            <Card
              key={index}
              className={cn(
                "bg-card group transition-all duration-500 hover:shadow-xl hover:-translate-y-1",
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
                      "h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                      framework.bgColor,
                      framework.color
                    )}
                  >
                    <Shield className="h-5 w-5" />
                  </div>
                  <span className="group-hover:text-primary transition-colors">
                    {framework.title}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4 text-sm">
                  {framework.description}
                </p>
                <ul className="space-y-2">
                  {framework.checks.map((check, checkIndex) => (
                    <li
                      key={checkIndex}
                      className="flex items-center gap-2 text-sm"
                    >
                      <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                      <span className="text-muted-foreground">{check}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
