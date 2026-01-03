import { 
  Shield, 
  Bell, 
  FileText, 
  Cloud, 
  Lock, 
  MessageSquare,
  Zap,
  IndianRupee
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: <Shield className="h-10 w-10" />,
    title: "Comprehensive AWS Scans",
    description: "Daily automated scans of Security Groups, IAM, S3, EC2, RDS, and VPCs to detect misconfigurations.",
  },
  {
    icon: <Bell className="h-10 w-10" />,
    title: "WhatsApp & Email Alerts",
    description: "Get instant alerts for critical security issues on WhatsApp in Hindi or English.",
  },
  {
    icon: <FileText className="h-10 w-10" />,
    title: "Compliance Reports",
    description: "Generate PDF reports aligned with Indian IT Act, GST, bank audits, and MeitY requirements.",
  },
  {
    icon: <Cloud className="h-10 w-10" />,
    title: "Multi-Account Support",
    description: "Connect and monitor multiple AWS accounts with secure IAM role assumption.",
  },
  {
    icon: <Zap className="h-10 w-10" />,
    title: "One-Click Remediation",
    description: "Generate CloudFormation templates to fix issues without auto-applying changes.",
  },
  {
    icon: <MessageSquare className="h-10 w-10" />,
    title: "WhatsApp Bot",
    description: "Ask questions like 'What is my risk score?' and get instant responses.",
  },
  {
    icon: <Lock className="h-10 w-10" />,
    title: "Secure Data Handling",
    description: "End-to-end encryption, audit logs, and data residency in India.",
  },
  {
    icon: <IndianRupee className="h-10 w-10" />,
    title: "Rupee-Based Pricing",
    description: "Affordable pricing in INR designed specifically for Indian SMEs.",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20 lg:py-32 bg-muted/30">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Enterprise Security, SME Budget
          </h2>
          <p className="text-lg text-muted-foreground">
            All the features you need to secure your AWS infrastructure without the enterprise price tag.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <Card key={index} className="border-0 bg-card shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {feature.icon}
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
