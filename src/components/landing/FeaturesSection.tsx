import {
  Shield,
  Bell,
  FileText,
  Cloud,
  Lock,
  MessageSquare,
  Zap,
  IndianRupee,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Shield,
    title: "Comprehensive AWS Scans",
    description:
      "Daily automated scans of Security Groups, IAM, S3, EC2, RDS, and VPCs to detect misconfigurations.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Bell,
    title: "WhatsApp & Email Alerts",
    description:
      "Get instant alerts for critical security issues on WhatsApp in Hindi or English.",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    icon: FileText,
    title: "Compliance Reports",
    description:
      "Generate PDF reports aligned with Indian IT Act, GST, bank audits, and MeitY requirements.",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    icon: Cloud,
    title: "Multi-Account Support",
    description:
      "Connect and monitor multiple AWS accounts with secure IAM role assumption.",
    color: "text-info",
    bgColor: "bg-info/10",
  },
  {
    icon: Zap,
    title: "One-Click Remediation",
    description:
      "Generate CloudFormation templates to fix issues without auto-applying changes.",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    icon: MessageSquare,
    title: "WhatsApp Bot",
    description:
      "Ask questions like 'What is my risk score?' and get instant responses.",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    icon: Lock,
    title: "Secure Data Handling",
    description:
      "End-to-end encryption, audit logs, and data residency in India.",
    color: "text-critical",
    bgColor: "bg-critical/10",
  },
  {
    icon: IndianRupee,
    title: "Rupee-Based Pricing",
    description:
      "Affordable pricing in INR designed specifically for Indian SMEs.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
];

export function FeaturesSection() {
  const { ref, isIntersecting } = useIntersectionObserver({ threshold: 0.1 });

  return (
    <section ref={ref} className="py-20 lg:py-32 bg-muted/30 relative overflow-hidden">
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
            Enterprise Security,{" "}
            <span className="text-primary">SME Budget</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            All the features you need to secure your AWS infrastructure without
            the enterprise price tag.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className={cn(
                  "border-0 bg-card shadow-sm transition-all duration-500 group hover:shadow-xl hover:-translate-y-2 hover:border-primary/20 card-interactive",
                  isIntersecting
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-8"
                )}
                style={{ transitionDelay: `${index * 75}ms` }}
              >
                <CardHeader>
                  <div
                    className={cn(
                      "mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-110",
                      feature.bgColor,
                      feature.color
                    )}
                  >
                    <Icon className="h-7 w-7" />
                  </div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
