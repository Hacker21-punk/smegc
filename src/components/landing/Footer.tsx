import { Logo } from "@/components/ui/Logo";
import { Link } from "react-router-dom";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { cn } from "@/lib/utils";

export function Footer() {
  const { ref, isIntersecting } = useIntersectionObserver({ threshold: 0.1 });

  const footerLinks = {
    product: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "Integrations", href: "#" },
      { label: "API Documentation", href: "#" },
    ],
    compliance: [
      { label: "IT Act 2000", href: "#" },
      { label: "GST Compliance", href: "#" },
      { label: "Bank Audit", href: "#" },
      { label: "MeitY Guidelines", href: "#" },
    ],
    legal: [
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms of Service", href: "/terms-of-service" },
      { label: "Security", href: "/security" },
    ],
  };

  return (
    <footer ref={ref} className="border-t bg-muted/30 relative overflow-hidden">
      {/* Subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent pointer-events-none" />

      <div className="container py-12 relative">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Company Info */}
          <div
            className={cn(
              "transition-all duration-500",
              isIntersecting
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            )}
          >
            <Logo className="mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Affordable AWS security monitoring designed for Indian SMEs.
            </p>
            <p className="text-xs text-muted-foreground">
              Registered in India | GST: XXXXXXXXXXXX
            </p>
          </div>

          {/* Product Links */}
          <div
            className={cn(
              "transition-all duration-500 delay-100",
              isIntersecting
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            )}
          >
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {footerLinks.product.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="hover:text-foreground transition-colors link-underline"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Compliance Links */}
          <div
            className={cn(
              "transition-all duration-500 delay-200",
              isIntersecting
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            )}
          >
            <h4 className="font-semibold mb-4">Compliance</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {footerLinks.compliance.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="hover:text-foreground transition-colors link-underline"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div
            className={cn(
              "transition-all duration-500 delay-300",
              isIntersecting
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            )}
          >
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="hover:text-foreground transition-colors">
                sme.cloudguard26@gmail.com
              </li>
              <li className="hover:text-foreground transition-colors">
                +91 8269110527
              </li>
              <li>Pune, Maharashtra, India</li>
            </ul>
          </div>
        </div>

        <div
          className={cn(
            "mt-12 pt-8 border-t flex flex-col sm:flex-row justify-between items-center gap-4 transition-all duration-500 delay-400",
            isIntersecting
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          )}
        >
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} SME Cloud Guard. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            {footerLinks.legal.map((link, index) => (
              <Link
                key={index}
                to={link.href}
                className="hover:text-foreground transition-colors link-underline"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
