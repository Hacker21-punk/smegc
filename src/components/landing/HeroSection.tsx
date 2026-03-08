import { Button } from "@/components/ui/button";
import { Shield, ArrowRight, Eye, Lock, UserCheck, Sparkles } from "lucide-react";
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
    <section ref={ref} className="relative overflow-hidden py-24 lg:py-36">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Cloud Security"
          className="w-full h-full object-cover transition-transform duration-[2s] scale-105"
          style={{ transform: isIntersecting ? "scale(1)" : "scale(1.05)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      {/* Animated orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-[20%] w-80 h-80 bg-primary/8 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute bottom-20 right-[10%] w-60 h-60 bg-info/8 rounded-full blur-3xl animate-float-slow" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/2 right-[30%] w-40 h-40 bg-success/5 rounded-full blur-3xl animate-morph" />
      </div>

      {/* Dot grid */}
      <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />

      <div className="container relative">
        <div className="max-w-3xl">
          {/* Badge */}
          <div
            className={cn(
              "mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary border border-primary/20 transition-all duration-700",
              isIntersecting ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Autonomous Multi-Cloud Cybersecurity</span>
          </div>

          {/* Headline */}
          <h1
            className={cn(
              "mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl transition-all duration-700 delay-100",
              isIntersecting ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            CloudGuard Autopilot
            <span className="block mt-3 gradient-text-animated text-3xl sm:text-4xl lg:text-5xl font-bold">
              Security That Runs Itself
            </span>
          </h1>

          {/* Sub */}
          <p
            className={cn(
              "mb-10 max-w-2xl text-base text-muted-foreground sm:text-lg leading-relaxed transition-all duration-700 delay-200",
              isIntersecting ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            Continuously discovers your cloud assets across AWS, Azure, and GCP — analyzes attack paths, predicts breach probability, and autonomously fixes security issues. All explained in plain English.
          </p>

          {/* CTAs */}
          <div
            className={cn(
              "mb-10 flex flex-col items-start gap-3 sm:flex-row transition-all duration-700 delay-300",
              isIntersecting ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            <Link to="/auth">
              <Button
                size="lg"
                className="gap-2 group shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all hover:scale-105 animate-pulse-glow"
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
              "flex flex-wrap gap-3 transition-all duration-700 delay-400",
              isIntersecting ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            {trustBadges.map((badge, index) => {
              const Icon = badge.icon;
              return (
                <div
                  key={index}
                  className="flex items-center gap-2 glass-card rounded-full px-4 py-2 hover-scale"
                >
                  <Icon className="h-3.5 w-3.5 text-success" />
                  <span className="text-xs font-medium">{badge.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}