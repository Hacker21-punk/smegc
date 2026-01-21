import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Starter",
    price: "₹999",
    period: "/month",
    description: "Perfect for small businesses getting started with AWS security.",
    features: [
      "1 AWS Account",
      "Daily security scans",
      "Email alerts",
      "Basic compliance reports",
      "5 team members",
      "7-day data retention",
    ],
    highlighted: false,
  },
  {
    name: "Growth",
    price: "₹2,499",
    period: "/month",
    description: "For growing businesses with multiple AWS accounts.",
    features: [
      "Up to 5 AWS Accounts",
      "Hourly security scans",
      "WhatsApp + Email alerts",
      "Full compliance reports (IT Act, GST)",
      "15 team members",
      "30-day data retention",
      "WhatsApp bot access",
      "Priority support",
    ],
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "₹7,499",
    period: "/month",
    description: "For organizations with complex AWS infrastructure.",
    features: [
      "Unlimited AWS Accounts",
      "Real-time security scans",
      "All alert channels",
      "Custom compliance reports",
      "Unlimited team members",
      "1-year data retention",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantee",
    ],
    highlighted: false,
  },
];

export function PricingSection() {
  const { ref, isIntersecting } = useIntersectionObserver({ threshold: 0.1 });

  return (
    <section id="pricing" ref={ref} className="py-20 lg:py-32 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary/5 to-info/5 rounded-full blur-3xl" />

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
            Simple, <span className="text-primary">Transparent</span> Pricing
          </h2>
          <p className="text-lg text-muted-foreground">
            Choose the plan that fits your business. All prices in INR. No
            hidden fees.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3 items-start">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={cn(
                "relative transition-all duration-500 hover:shadow-2xl",
                isIntersecting
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8",
                plan.highlighted
                  ? "border-primary shadow-xl shadow-primary/10 lg:scale-105 z-10"
                  : "hover:-translate-y-2"
              )}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-primary to-info text-primary-foreground px-4 py-1.5 rounded-full text-sm font-medium inline-flex items-center gap-1.5 shadow-lg animate-pulse-glow">
                    <Sparkles className="h-3.5 w-3.5" />
                    Most Popular
                  </span>
                </div>
              )}
              <CardHeader className="text-center pb-2 pt-8">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="mt-4 group">
                  <span className="text-5xl font-bold transition-all group-hover:text-primary">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <CardDescription className="mt-2">
                  {plan.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li
                      key={featureIndex}
                      className={cn(
                        "flex items-center gap-3 transition-all duration-300",
                        isIntersecting
                          ? "opacity-100 translate-x-0"
                          : "opacity-0 -translate-x-4"
                      )}
                      style={{
                        transitionDelay: `${index * 100 + featureIndex * 50}ms`,
                      }}
                    >
                      <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/dashboard">
                  <Button
                    className={cn(
                      "w-full transition-all",
                      plan.highlighted
                        ? "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-105"
                        : "hover:bg-primary hover:text-primary-foreground"
                    )}
                    variant={plan.highlighted ? "default" : "outline"}
                  >
                    Get Started
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <p
          className={cn(
            "text-center text-muted-foreground mt-12 transition-all duration-700 delay-300",
            isIntersecting
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          )}
        >
          All plans include a 14-day free trial. No credit card required.
        </p>
      </div>
    </section>
  );
}
