import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Starter",
    price: "₹1,999",
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
    price: "₹4,999",
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
    price: "₹14,999",
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
  return (
    <section id="pricing" className="py-20 lg:py-32">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-muted-foreground">
            Choose the plan that fits your business. All prices in INR. No hidden fees.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative ${plan.highlighted ? 'border-primary shadow-lg scale-105' : ''}`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <CardDescription className="mt-2">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/dashboard">
                  <Button 
                    className="w-full" 
                    variant={plan.highlighted ? "default" : "outline"}
                  >
                    Get Started
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-center text-muted-foreground mt-8">
          All plans include a 14-day free trial. No credit card required.
        </p>
      </div>
    </section>
  );
}
