import { Button } from "@/components/ui/button";
import { Shield, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-security.jpg";
import { cn } from "@/lib/utils";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";

export function HeroSection() {
  const { ref, isIntersecting } = useIntersectionObserver({ threshold: 0.1 });

  const features = [
    "Automated daily AWS security scans",
    "WhatsApp & Email alerts in Hindi/English",
    "Compliance reports for IT Act, GST, Bank audits",
    "One-click CloudFormation remediation",
  ];

  return (
    <section ref={ref} className="relative overflow-hidden py-20 lg:py-32">
      {/* Background Image with overlay */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Cloud Security"
          className="w-full h-full object-cover transition-transform duration-[2s] scale-105"
          style={{ transform: isIntersecting ? "scale(1)" : "scale(1.05)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-[20%] w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-20 right-[10%] w-48 h-48 bg-info/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="container relative">
        <div className="max-w-3xl">
          {/* Badge */}
          <div
            className={cn(
              "mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary border border-primary/20 transition-all duration-700",
              isIntersecting
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            )}
          >
            <Sparkles className="h-4 w-4 animate-pulse" />
            <span>Made for Indian SMEs</span>
            <Shield className="h-4 w-4" />
          </div>

          {/* Headline */}
          <h1
            className={cn(
              "mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl transition-all duration-700 delay-100",
              isIntersecting
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            )}
          >
            AWS Security Monitoring
            <span className="block mt-2 bg-gradient-to-r from-primary via-info to-primary bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
              You Can Actually Afford
            </span>
          </h1>

          {/* Description */}
          <p
            className={cn(
              "mb-8 max-w-2xl text-lg text-muted-foreground sm:text-xl transition-all duration-700 delay-200",
              isIntersecting
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            )}
          >
            Protect your AWS infrastructure with automated security scans,
            instant WhatsApp alerts, and compliance reports—all priced in Rupees
            for Indian businesses.
          </p>

          {/* CTA Buttons */}
          <div
            className={cn(
              "mb-12 flex flex-col items-start gap-4 sm:flex-row transition-all duration-700 delay-300",
              isIntersecting
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            )}
          >
            <Link to="/dashboard">
              <Button
                size="lg"
                className="gap-2 group shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all hover:scale-105"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              className="group hover:bg-primary/5 transition-all"
            >
              <span className="relative">
                Watch Demo
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
              </span>
            </Button>
          </div>

          {/* Feature List */}
          <div className="grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
            {features.map((feature, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-3 text-muted-foreground group transition-all duration-500",
                  isIntersecting
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 -translate-x-4"
                )}
                style={{ transitionDelay: `${400 + index * 100}ms` }}
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-success/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </div>
                <span className="group-hover:text-foreground transition-colors">
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
