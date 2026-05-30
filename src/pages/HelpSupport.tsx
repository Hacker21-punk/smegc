import { useState } from "react";
import { Link } from "react-router-dom";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import {
  HelpCircle,
  MessageCircle,
  BookOpen,
  Mail,
  Shield,
  Lock,
  Cloud,
  FileText,
  ExternalLink,
} from "lucide-react";

export default function HelpSupport() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    subject: "",
    message: "",
  });

  const handleSubmitContact = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Message sent! We'll get back to you within 24 hours.");
    setContactForm({ subject: "", message: "" });
  };

  const faqs = [
    {
      question: "How does SME Cloud Guard access my AWS account?",
      answer:
        "SME Cloud Guard uses AWS IAM roles with read-only permissions. When you connect an AWS account, you create a cross-account IAM role that grants us SecurityAudit access. This means we can only view your resources—we can never create, modify, or delete anything in your AWS environment.",
    },
    {
      question: "Is my data secure?",
      answer:
        "Yes. We use industry-standard encryption for data in transit and at rest. Your AWS credentials are never stored—we use temporary credentials via IAM role assumption. All scan results and findings are encrypted and isolated per organization.",
    },
    {
      question: "What compliance frameworks do you support?",
      answer:
        "We provide evidence mapping for ISO 27001, SOC 2, GDPR, and India's DPDP Act. Our compliance reports help you understand your current posture but should be used alongside formal audits for certification purposes.",
    },
    {
      question: "How often are scans performed?",
      answer:
        "You can trigger manual scans at any time from the AWS Accounts page. Additionally, automated daily scans run to keep your security posture up to date. Scan frequency can be adjusted based on your subscription plan.",
    },
    {
      question: "What should I do when I see a critical finding?",
      answer:
        "Critical findings indicate immediate security risks. Review the finding details, which include a plain-English explanation of the issue, its business impact, and step-by-step remediation guidance. We provide CloudFormation templates to help you implement fixes safely.",
    },
    {
      question: "Can SME Cloud Guard fix issues automatically?",
      answer:
        "No. SME Cloud Guard operates on a read-only, zero-write security model. We identify and prioritize issues, provide remediation guidance, and generate CloudFormation templates—but you maintain full control over any changes to your infrastructure.",
    },
  ];

  const resources = [
    {
      icon: <BookOpen className="h-5 w-5" />,
      title: "Getting Started Guide",
      description: "Learn how to connect your first cloud account",
      href: "/dashboard/accounts",
    },
    {
      icon: <Shield className="h-5 w-5" />,
      title: "Security Best Practices",
      description: "Review your security score and recommendations",
      href: "/dashboard",
    },
    {
      icon: <FileText className="h-5 w-5" />,
      title: "Understanding Findings",
      description: "How to interpret and prioritize security findings",
      href: "/dashboard/findings",
    },
    {
      icon: <Cloud className="h-5 w-5" />,
      title: "IAM Role Setup",
      description: "Step-by-step AWS role configuration",
      href: "/dashboard/accounts",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader lastScanTime="—" onRefresh={() => {}} onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="pt-16 md:pl-64">
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">Help & Support</h1>
            <p className="text-muted-foreground mt-1">
              Find answers, learn best practices, and get in touch
            </p>
          </div>

          {/* Trust Banner */}
          <div className="p-4 rounded-lg bg-success/5 border border-success/20">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-success" />
              <div>
                <p className="font-medium text-sm text-foreground">
                  Read-Only Security Model
                </p>
                <p className="text-sm text-muted-foreground">
                  SME Cloud Guard never modifies your AWS resources. You stay in control.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid gap-4 md:grid-cols-2">
            {resources.map((resource) => (
              <Link key={resource.title} to={resource.href} className="block">
                <Card className="hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer h-full">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        {resource.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-sm">{resource.title}</h3>
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {resource.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* FAQs */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <HelpCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
                  <CardDescription>Common questions about SME Cloud Guard</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left text-sm font-medium">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          {/* Contact Form */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <MessageCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Contact Support</CardTitle>
                  <CardDescription>
                    Can't find what you're looking for? Send us a message
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitContact} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="Brief description of your question"
                    value={contactForm.subject}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, subject: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Describe your issue or question in detail..."
                    rows={4}
                    value={contactForm.message}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, message: e.target.value })
                    }
                    required
                  />
                </div>
                <Button type="submit" className="w-full md:w-auto">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Support Hours */}
          <div className="text-center text-sm text-muted-foreground py-4">
            <p>Support available Monday–Friday, 9 AM – 6 PM IST</p>
            <p className="mt-1">
              For urgent security concerns, email{" "}
              <span className="text-primary font-medium">security@smecloudguard.com</span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
