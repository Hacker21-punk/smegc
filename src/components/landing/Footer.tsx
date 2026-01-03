import { Logo } from "@/components/ui/Logo";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo className="mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Affordable AWS security monitoring designed for Indian SMEs.
            </p>
            <p className="text-xs text-muted-foreground">
              Registered in India | GST: XXXXXXXXXXXX
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground">Features</a></li>
              <li><a href="#pricing" className="hover:text-foreground">Pricing</a></li>
              <li><a href="#" className="hover:text-foreground">Integrations</a></li>
              <li><a href="#" className="hover:text-foreground">API Documentation</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Compliance</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">IT Act 2000</a></li>
              <li><a href="#" className="hover:text-foreground">GST Compliance</a></li>
              <li><a href="#" className="hover:text-foreground">Bank Audit</a></li>
              <li><a href="#" className="hover:text-foreground">MeitY Guidelines</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>support@smecloudguard.in</li>
              <li>+91 98765 43210</li>
              <li>Mumbai, Maharashtra, India</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2024 SME Cloud Guard. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link to="#" className="hover:text-foreground">Privacy Policy</Link>
            <Link to="#" className="hover:text-foreground">Terms of Service</Link>
            <Link to="#" className="hover:text-foreground">Security</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
