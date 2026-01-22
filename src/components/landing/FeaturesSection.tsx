import {
  Search,
  ListOrdered,
  FileText,
  CheckCircle,
  ClipboardList,
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
    icon: Search,
    title: "Continuous AWS Scanning",
    description:
      "Read-only security scans of your AWS infrastructure. Security Groups, IAM, S3, EC2, RDS, and VPCs.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: ListOrdered,
    title: "Risk Prioritization",
    description:
      "Findings ranked by severity (P0–P3) so you know exactly what to fix first.",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    icon: FileText,
    title: "Clear Remediation Guidance",
    description:
      "Step-by-step instructions and CloudFormation templates. No automatic changes — you apply fixes.",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    icon: CheckCircle,
    title: "Post-Remediation Verification",
    description:
      "After you fix an issue, we verify it's resolved and update your security status.",
    color: "text-info",
    bgColor: "bg-info/10",
  },
  {
    icon: ClipboardList,
    title: "Audit & Compliance Evidence",
    description:
      "Generate reports for ISO 27001, SOC 2, and DPDP Act readiness. Perfect for client reviews.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: IndianRupee,
    title: "Built for Indian SMEs",
    description:
      "Affordable pricing in INR, designed for growing Indian businesses on AWS.",
    color: "text-success",
    bgColor: "bg-success/10",
  },
];

export function FeaturesSection() {
  const { ref, isIntersecting } = useIntersectionObserver({ threshold: 0.1 });

  return (
    <section id="features" ref={ref} className="py-20 lg:py-32 relative overflow-hidden">
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
            Core <span className="text-primary">Features</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to secure your AWS infrastructure — without the enterprise price tag or complexity.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className={cn(
                  "border bg-card shadow-sm transition-all duration-500 group hover:shadow-xl hover:-translate-y-2",
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
