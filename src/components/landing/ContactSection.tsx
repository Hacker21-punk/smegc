import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Phone, Mail, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export function ContactSection() {
  const { ref, isIntersecting } = useIntersectionObserver({ threshold: 0.1 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (formData.message.trim().length < 10) {
      toast.error("Message must be at least 10 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("contact-form", {
        body: {
          name: formData.name.trim(),
          email: formData.email.trim(),
          company: formData.company.trim() || undefined,
          message: formData.message.trim(),
        },
      });

      if (error) throw error;

      toast.success("Message sent!", {
        description: data?.message ?? "We'll get back to you within 24 hours.",
      });
      setFormData({ name: "", email: "", company: "", message: "" });
    } catch (err) {
      console.error("Contact form error:", err);
      toast.error("Failed to send message. Please try again or email us directly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactMethods = [
    {
      icon: MessageSquare,
      label: "WhatsApp Support",
      value: "+91 8269110527",
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      icon: Phone,
      label: "Phone",
      value: "+91 8269110527",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: Mail,
      label: "Email",
      value: "sme.cloudguard26@gmail.com",
      color: "text-info",
      bgColor: "bg-info/10",
    },
  ];

  return (
    <section id="contact" ref={ref} className="py-20 lg:py-32 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2" />

      <div className="container relative">
        <div className="grid gap-12 lg:grid-cols-2">
          {/* Left side - Contact info */}
          <div
            className={cn(
              "transition-all duration-700",
              isIntersecting
                ? "opacity-100 translate-x-0"
                : "opacity-0 -translate-x-8"
            )}
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Get in <span className="text-primary">Touch</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Have questions? Our team is here to help you strengthen your cloud
              security posture across AWS, Azure, and GCP.
            </p>

            <div className="space-y-6">
              {contactMethods.map((method, index) => {
                const Icon = method.icon;
                return (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center gap-4 group transition-all duration-500",
                      isIntersecting
                        ? "opacity-100 translate-x-0"
                        : "opacity-0 -translate-x-4"
                    )}
                    style={{ transitionDelay: `${index * 100}ms` }}
                  >
                    <div
                      className={cn(
                        "h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                        method.bgColor,
                        method.color
                      )}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-medium group-hover:text-primary transition-colors">
                        {method.label}
                      </p>
                      <p className="text-muted-foreground">{method.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right side - Contact form */}
          <div
            className={cn(
              "bg-card p-8 rounded-2xl border shadow-lg transition-all duration-700 delay-200",
              isIntersecting
                ? "opacity-100 translate-x-0"
                : "opacity-0 translate-x-8"
            )}
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="name" className="block text-sm font-medium">
                    Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Your name"
                    required
                    maxLength={100}
                    className="transition-all focus:scale-[1.02]"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium">
                    Email <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="you@company.com"
                    required
                    maxLength={255}
                    className="transition-all focus:scale-[1.02]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="company" className="block text-sm font-medium">
                  Company
                </label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) =>
                    setFormData({ ...formData, company: e.target.value })
                  }
                  placeholder="Your company name"
                  maxLength={200}
                  className="transition-all focus:scale-[1.02]"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="message" className="block text-sm font-medium">
                  Message <span className="text-destructive">*</span>
                </label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  placeholder="Tell us about your cloud security needs..."
                  rows={4}
                  required
                  maxLength={5000}
                  className="transition-all focus:scale-[1.01] resize-none"
                />
              </div>

              <Button
                type="submit"
                className="w-full gap-2 group shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all hover:scale-[1.02]"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  "Sending..."
                ) : (
                  <>
                    Send Message
                    <Send className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
