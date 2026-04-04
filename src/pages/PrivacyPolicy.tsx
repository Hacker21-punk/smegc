import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function PrivacyPolicy() {
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
        <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: March 9, 2026</p>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">1. Introduction</h2>
          <p className="text-muted-foreground leading-relaxed">
            SME Cloud Guard ("we", "our", or "us") is committed to protecting the privacy of our users. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our cloud security monitoring platform.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">2. Information We Collect</h2>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed">
            <li><strong className="text-foreground">Account Information:</strong> Name, email address, phone number, and company name provided during registration.</li>
            <li><strong className="text-foreground">Cloud Configuration Data:</strong> Read-only metadata from your cloud accounts (AWS, Azure, GCP) including security configurations, IAM policies, storage settings, and resource inventories. We never store your cloud credentials.</li>
            <li><strong className="text-foreground">Usage Data:</strong> Information about how you interact with our platform, including pages visited, features used, and session duration.</li>
            <li><strong className="text-foreground">Device Information:</strong> Browser type, operating system, IP address, and device identifiers.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">3. How We Use Your Information</h2>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed">
            <li>To provide and maintain our security monitoring services</li>
            <li>To generate security findings, risk scores, and compliance reports</li>
            <li>To send you security alerts and notifications</li>
            <li>To improve and optimize our platform</li>
            <li>To communicate with you about your account and our services</li>
            <li>To comply with legal obligations under Indian law</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">4. Data Security</h2>
          <p className="text-muted-foreground leading-relaxed">
            We implement industry-standard security measures including AES-256 encryption at rest, TLS 1.3 encryption in transit, and role-based access controls. All AWS scanning is performed using read-only IAM roles with no write permissions unless explicitly enabled by you.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">5. Data Retention</h2>
          <p className="text-muted-foreground leading-relaxed">
            We retain your account data for the duration of your subscription. Security scan results and compliance reports are retained for 12 months. You may request deletion of your data at any time by contacting us at sme.cloudguard26@gmail.com.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">6. Third-Party Sharing</h2>
          <p className="text-muted-foreground leading-relaxed">
            We do not sell your personal data. We may share information with trusted service providers who assist in operating our platform, subject to strict confidentiality agreements. We may also disclose information when required by law or to protect our legal rights.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">7. Compliance with Indian Law</h2>
          <p className="text-muted-foreground leading-relaxed">
            Our data practices comply with the Information Technology Act, 2000, the IT (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011, and the Digital Personal Data Protection Act, 2023. Data is processed and stored in compliance with applicable Indian regulations.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">8. Your Rights</h2>
          <p className="text-muted-foreground leading-relaxed">
            You have the right to access, correct, or delete your personal data. You may also withdraw consent for data processing at any time. To exercise these rights, please contact us at sme.cloudguard26@gmail.com or call +91 8269110527.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">9. Contact Us</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you have questions about this Privacy Policy, please contact us at:<br />
            <strong className="text-foreground">Email:</strong> sme.cloudguard26@gmail.com<br />
            <strong className="text-foreground">Phone:</strong> +91 8269110527<br />
            <strong className="text-foreground">Address:</strong> Pune, Maharashtra, India
          </p>
        </section>
      </main>
    </div>
  );
}
