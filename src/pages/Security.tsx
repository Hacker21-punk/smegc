import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Lock, Eye, Server, Key, FileCheck } from "lucide-react";
import { Link } from "react-router-dom";

const securityPractices = [
  {
    icon: Lock,
    title: "Encryption",
    description: "All data is encrypted at rest using AES-256 and in transit using TLS 1.3. Database backups are encrypted and stored in geographically redundant locations.",
  },
  {
    icon: Eye,
    title: "Read-Only by Default",
    description: "All cloud scanning uses read-only IAM roles. We never modify your infrastructure unless you explicitly enable write access for automated remediation with full audit trails.",
  },
  {
    icon: Key,
    title: "Credential Security",
    description: "We never store your AWS access keys or secret keys. Authentication is handled via cross-account IAM roles with external IDs, following AWS security best practices.",
  },
  {
    icon: Server,
    title: "Infrastructure Security",
    description: "Our platform runs on hardened infrastructure with network segmentation, intrusion detection, and continuous vulnerability scanning. All systems are patched within 24 hours of critical updates.",
  },
  {
    icon: Shield,
    title: "Access Controls",
    description: "Role-based access control (RBAC) with multi-factor authentication. All administrative actions are logged with immutable audit trails. Session management includes automatic timeout and IP-based restrictions.",
  },
  {
    icon: FileCheck,
    title: "Compliance",
    description: "Our security practices align with IT Act 2000, DPDP Act 2023, SOC 2 Type II principles, and ISO 27001 guidelines. We undergo regular third-party security assessments.",
  },
];

export default function Security() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <Logo />
          <Button variant="ghost" size="sm" asChild>
            <Link to="/" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </header>

      <main className="container max-w-3xl py-16 space-y-12">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Security</h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Security is at the core of everything we do at SME Cloud Guard. We protect your data with the same rigor we help you protect your cloud infrastructure.
          </p>
        </div>

        <div className="grid gap-8">
          {securityPractices.map((practice) => {
            const Icon = practice.icon;
            return (
              <div key={practice.title} className="flex gap-5">
                <div className="shrink-0 h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-xl font-semibold">{practice.title}</h2>
                  <p className="text-muted-foreground leading-relaxed">{practice.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <section className="space-y-4 border-t pt-8">
          <h2 className="text-2xl font-semibold">Responsible Disclosure</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you discover a security vulnerability in our platform, we encourage responsible disclosure. Please report it to sme.cloudguard26@gmail.com. We commit to acknowledging receipt within 24 hours and providing an initial assessment within 72 hours. We do not pursue legal action against researchers who follow responsible disclosure practices.
          </p>
        </section>

        <section className="space-y-4 border-t pt-8">
          <h2 className="text-2xl font-semibold">Contact Our Security Team</h2>
          <p className="text-muted-foreground leading-relaxed">
            For security-related inquiries, contact us at:<br />
            <strong className="text-foreground">Email:</strong> sme.cloudguard26@gmail.com<br />
            <strong className="text-foreground">Phone:</strong> +91 8269110527<br />
            <strong className="text-foreground">Address:</strong> Pune, Maharashtra, India
          </p>
        </section>
      </main>
    </div>
  );
}
