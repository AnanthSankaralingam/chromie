import HeroSection from "@/components/sections/hero-section";

import HowItWorksSection from "@/components/ui/sections/how-it-works-section";
import PricingSection from "@/components/ui/sections/pricing-section";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection />

      <HowItWorksSection />
      <PricingSection />
    </div>
  );
}
