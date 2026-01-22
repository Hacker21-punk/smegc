import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { cn } from "@/lib/utils";

export function FinalCTASection() {
  const { ref, isIntersecting } = useIntersectionObserver({ threshold: 0.1 });

  return (
    <section ref={ref} className="py-20 lg:py-32 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />

      <div className="container relative">
        <div
          className={cn(
            "mx-auto max-w-2xl text-center transition-all duration-700",
            isIntersecting
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8"
          )}
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
            Ready to Secure Your{" "}
            <span className="text-primary">AWS Account</span>?
          </h2>
          <p className="text-lg text-muted-foreground mb-10">
            Start with a free trial. No credit card required. Connect with read-only access and see your security posture in minutes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth">
              <Button
                size="lg"
                className="gap-2 group shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all hover:scale-105"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button
                variant="outline"
                size="lg"
                className="gap-2 group hover:bg-primary/5 transition-all"
              >
                <Play className="h-4 w-4" />
                <span>View Dashboard Demo</span>
              </Button>
            </Link>
          </div>

          {/* Trust reminder */}
          <p className="mt-8 text-sm text-muted-foreground">
            Read-only access • No auto-changes • Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
}
