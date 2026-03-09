import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function TermsOfService() {
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

      <main className="container max-w-3xl py-16 space-y-8">
        <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: March 9, 2026</p>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground leading-relaxed">
            By accessing or using SME Cloud Guard ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, you may not use the Service. These terms constitute a legally binding agreement between you and SME Cloud Guard.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">2. Description of Service</h2>
          <p className="text-muted-foreground leading-relaxed">
            SME Cloud Guard provides cloud security posture management (CSPM) for AWS, Azure, and GCP environments. The Service includes security scanning, risk assessment, compliance reporting, remediation guidance, and real-time threat detection. All scanning is performed using read-only access unless write access is explicitly granted.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">3. Account Registration</h2>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed">
            <li>You must provide accurate and complete information during registration.</li>
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>You must be at least 18 years old to use the Service.</li>
            <li>One person or entity may not maintain more than one free account.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">4. AWS & Cloud Account Access</h2>
          <p className="text-muted-foreground leading-relaxed">
            By connecting your cloud accounts, you authorize SME Cloud Guard to access your cloud resources using the IAM roles you configure. You retain full control over the permissions granted. We recommend using read-only access for scanning. Write access for automated remediation is optional and requires explicit enablement.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">5. Subscription & Payments</h2>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed">
            <li>Pricing is displayed in INR (₹) and is subject to applicable GST.</li>
            <li>Subscriptions are billed monthly or annually as selected.</li>
            <li>You may cancel your subscription at any time; access continues until the end of the billing period.</li>
            <li>Refunds are handled on a case-by-case basis within 7 days of purchase.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">6. Acceptable Use</h2>
          <p className="text-muted-foreground leading-relaxed">
            You may not use the Service to: (a) violate any applicable law or regulation, (b) attempt to gain unauthorized access to other users' accounts or data, (c) reverse engineer, decompile, or disassemble any part of the Service, (d) use the Service for competitive intelligence or benchmarking, or (e) resell access to the Service without written authorization.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">7. Limitation of Liability</h2>
          <p className="text-muted-foreground leading-relaxed">
            SME Cloud Guard provides security insights and recommendations on a best-effort basis. We do not guarantee the detection of all security vulnerabilities. In no event shall our liability exceed the amount paid by you for the Service during the 12 months preceding the claim. We are not liable for any indirect, incidental, or consequential damages.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">8. Intellectual Property</h2>
          <p className="text-muted-foreground leading-relaxed">
            All content, features, and functionality of the Service are owned by SME Cloud Guard and are protected by Indian and international copyright, trademark, and other intellectual property laws. Your data remains your property at all times.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">9. Termination</h2>
          <p className="text-muted-foreground leading-relaxed">
            We may suspend or terminate your account if you violate these Terms. Upon termination, your right to use the Service ceases immediately. You may export your data within 30 days of termination.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">10. Governing Law</h2>
          <p className="text-muted-foreground leading-relaxed">
            These Terms are governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Pune, Maharashtra, India.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">11. Contact</h2>
          <p className="text-muted-foreground leading-relaxed">
            For questions about these Terms, contact us at:<br />
            <strong className="text-foreground">Email:</strong> sme.cloudguard26@gmail.com<br />
            <strong className="text-foreground">Phone:</strong> +91 8269110527<br />
            <strong className="text-foreground">Address:</strong> Pune, Maharashtra, India
          </p>
        </section>
      </main>
    </div>
  );
}
