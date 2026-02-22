import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingTargetAudience } from "@/components/landing/landing-target-audience";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";
import { LandingAISection } from "@/components/landing/landing-ai-section";
import { LandingDemoFlow } from "@/components/landing/landing-demo-flow";
import { LandingCTA } from "@/components/landing/landing-cta";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#1D2740]">
      <LandingHeader />
      <LandingHero />
      <LandingTargetAudience />
      <LandingFeatures />
      <LandingHowItWorks />
      <LandingDemoFlow />
      <LandingAISection />
      <LandingCTA />
      <LandingFooter />
    </div>
  );
}
