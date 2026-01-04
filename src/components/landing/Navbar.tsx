import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/Logo";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/">
          <Logo />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </a>
          <a href="#compliance" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Compliance
          </a>
          <a href="#contact" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Contact
          </a>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <Link to="/auth">
            <Button variant="ghost">Login</Button>
          </Link>
          <Link to="/auth">
            <Button>Start Free Trial</Button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden border-t bg-background p-4">
          <div className="flex flex-col gap-4">
            <a href="#features" className="text-sm font-medium" onClick={() => setIsMenuOpen(false)}>
              Features
            </a>
            <a href="#pricing" className="text-sm font-medium" onClick={() => setIsMenuOpen(false)}>
              Pricing
            </a>
            <a href="#compliance" className="text-sm font-medium" onClick={() => setIsMenuOpen(false)}>
              Compliance
            </a>
            <a href="#contact" className="text-sm font-medium" onClick={() => setIsMenuOpen(false)}>
              Contact
            </a>
            <div className="flex flex-col gap-2 pt-4 border-t">
              <Link to="/auth">
                <Button variant="outline" className="w-full">Login</Button>
              </Link>
              <Link to="/auth">
                <Button className="w-full">Start Free Trial</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
