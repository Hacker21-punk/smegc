import { Button } from "@/components/ui/button";
import { Shield, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-security.jpg";

export function HeroSection() {
  const features = [
    "Automated daily AWS security scans",
    "WhatsApp & Email alerts in Hindi/English",
    "Compliance reports for IT Act, GST, Bank audits",
    "One-click CloudFormation remediation",
  ];

  return (
    <section className="relative overflow-hidden py-20 lg:py-32">
      {/* Background Image with overlay */}
      <div className="absolute inset-0">
        <img 
          src={heroImage} 
          alt="Cloud Security" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/80" />
      </div>

      <div className="container relative">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary border border-primary/20">
            <Shield className="h-4 w-4" />
            <span>Made for Indian SMEs</span>
          </div>

          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            AWS Security Monitoring
            <span className="block text-primary">You Can Actually Afford</span>
          </h1>

          <p className="mb-8 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Protect your AWS infrastructure with automated security scans, instant WhatsApp alerts, 
            and compliance reports—all priced in Rupees for Indian businesses.
          </p>

          <div className="mb-12 flex flex-col items-start gap-4 sm:flex-row">
            <Link to="/dashboard">
              <Button size="lg" className="gap-2">
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button variant="outline" size="lg">
              Watch Demo
            </Button>
          </div>

          <div className="grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-success" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
