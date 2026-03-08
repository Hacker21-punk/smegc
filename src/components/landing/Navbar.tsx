import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/Logo";
import { Link } from "react-router-dom";
import { Menu, X, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "#features", label: "Features" },
    { href: "#pricing", label: "Pricing" },
    { href: "#compliance", label: "Compliance" },
    { href: "#contact", label: "Contact" },
  ];

  return (
    <nav
      className={cn(
        "sticky top-0 z-50 w-full border-b transition-all duration-500",
        isScrolled
          ? "glass-strong shadow-sm border-border/50"
          : "bg-transparent border-transparent"
      )}
    >
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="transition-transform hover:scale-[1.02] active:scale-[0.98]">
          <Logo />
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="relative text-sm font-medium text-muted-foreground hover:text-foreground transition-colors link-underline"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          <Link to="/auth">
            <Button variant="ghost" size="sm" className="transition-all hover:bg-primary/5">
              Login
            </Button>
          </Link>
          <Link to="/auth">
            <Button size="sm" className="gap-1.5 group shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 transition-all hover:scale-[1.02]">
              Start Free Trial
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </Link>
        </div>

        {/* Mobile toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <div className="relative w-5 h-5">
            <Menu className={cn("absolute inset-0 h-5 w-5 transition-all duration-300", isMenuOpen ? "opacity-0 rotate-90" : "opacity-100 rotate-0")} />
            <X className={cn("absolute inset-0 h-5 w-5 transition-all duration-300", isMenuOpen ? "opacity-100 rotate-0" : "opacity-0 -rotate-90")} />
          </div>
        </Button>
      </div>

      {/* Mobile Menu */}
      <div className={cn(
        "md:hidden overflow-hidden transition-all duration-300 ease-out border-t glass",
        isMenuOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0 border-t-0"
      )}>
        <div className="container py-4">
          <div className="flex flex-col gap-2">
            {navLinks.map((link, index) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium py-2.5 px-3 rounded-lg hover:bg-muted transition-all animate-fade-in-up"
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="flex flex-col gap-2 pt-4 border-t mt-2">
              <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                <Button variant="outline" className="w-full">Login</Button>
              </Link>
              <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                <Button className="w-full">Start Free Trial</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}