import { Button } from "@/components/ui/button";
import { Shield, ArrowRight, Eye, Lock, UserCheck } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-security.jpg";
import { cn } from "@/lib/utils";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";

export function HeroSection() {
  const { ref, isIntersecting } = useIntersectionObserver({ threshold: 0.1 });

  const trustBadges = [
    { icon: Eye, text: "Multi-Cloud Security" },
    { icon: Lock, text: "Autonomous Protection" },
    { icon: UserCheck, text: "Built for SMEs" },
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
          {/* Trust Badge */}
          <div
            className={cn(
              "mb-6 inline-flex items-center gap-2 rounded-full bg-success/10 px-4 py-2 text-sm font-medium text-success border border-success/20 transition-all duration-700",
              isIntersecting
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            )}
          >
            <Shield className="h-4 w-4" />
            <span>Autonomous Multi-Cloud Cybersecurity</span>
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
            CloudGuard Autopilot
            <span className="block mt-2 bg-gradient-to-r from-primary via-info to-primary bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
              Security That Runs Itself
            </span>
          </h1>

          {/* Subheading */}
          <p
            className={cn(
              "mb-8 max-w-2xl text-lg text-muted-foreground sm:text-xl leading-relaxed transition-all duration-700 delay-200",
              isIntersecting
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            )}
          >
            SME Cloud Guard continuously scans your AWS environment, explains security risks in plain English, guides you to fix them safely, verifies the fixes, and provides audit-ready evidence — all with read-only access.
          </p>

          {/* CTA Buttons */}
          <div
            className={cn(
              "mb-10 flex flex-col items-start gap-4 sm:flex-row transition-all duration-700 delay-300",
              isIntersecting
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            )}
          >
            <Link to="/auth">
              <Button
                size="lg"
                className="gap-2 group shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all hover:scale-105"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link to="#how-it-works">
              <Button
                variant="outline"
                size="lg"
                className="group hover:bg-primary/5 transition-all"
              >
                <span className="relative">
                  See How It Works
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
                </span>
              </Button>
            </Link>
          </div>

          {/* Trust Badges */}
          <div
            className={cn(
              "flex flex-wrap gap-4 transition-all duration-700 delay-400",
              isIntersecting
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            )}
          >
            {trustBadges.map((badge, index) => {
              const Icon = badge.icon;
              return (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-card/50 backdrop-blur-sm rounded-full px-4 py-2 border border-border/50"
                >
                  <Icon className="h-4 w-4 text-success" />
                  <span className="text-sm font-medium">{badge.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
