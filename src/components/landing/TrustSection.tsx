import { Shield, Award, Building2, Users } from "lucide-react";

const stats = [
  { icon: <Building2 className="h-6 w-6" />, value: "500+", label: "SMEs Protected" },
  { icon: <Shield className="h-6 w-6" />, value: "10,000+", label: "Threats Detected" },
  { icon: <Award className="h-6 w-6" />, value: "99.9%", label: "Uptime SLA" },
  { icon: <Users className="h-6 w-6" />, value: "24/7", label: "Support (Hindi/English)" },
];

export function TrustSection() {
  return (
    <section className="py-16 border-y bg-card">
      <div className="container">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                {stat.icon}
              </div>
              <div className="text-3xl font-bold">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
