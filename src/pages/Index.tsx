import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { SafetySection } from "@/components/landing/SafetySection";
import { TargetAudienceSection } from "@/components/landing/TargetAudienceSection";
import { ComplianceSection } from "@/components/landing/ComplianceSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { ContactSection } from "@/components/landing/ContactSection";
import { Footer } from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <ProblemSection />
        <HowItWorksSection />
        <FeaturesSection />
        <SafetySection />
        <TargetAudienceSection />
        <ComplianceSection />
        <PricingSection />
        <FinalCTASection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
