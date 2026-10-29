import Navbar from "@/components/site/Navbar";
import OpeningHero from "@/components/landing/OpeningHero";
import HeroSection from "@/components/landing/HeroSection";
import ProblemSection from "@/components/landing/ProblemSection";
import WhyGradLeapSection from "@/components/landing/WhyGradLeapSection";
import ProductJourneySection from "@/components/landing/ProductJourneySection";
import SpatialShowcaseSection from "@/components/landing/SpatialShowcaseSection";
import ReadinessSection from "@/components/landing/ReadinessSection";
import LiveEventSection from "@/components/landing/LiveEventSection";
import AnalyticsSection from "@/components/landing/AnalyticsSection";
import EmployerCRMSection from "@/components/landing/EmployerCRMSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/site/Footer";
import StatementBand from "@/components/landing/StatementBand";
import ProductReveal from "@/components/landing/ProductReveal";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <OpeningHero />
        <HeroSection />
        <ProductReveal />
        <ProblemSection />
        <StatementBand
          eyebrow="The GradLeap difference"
          text="Measure the journey, not the attendance."
        />
        <WhyGradLeapSection />
        <ProductJourneySection />
        <SpatialShowcaseSection />
        <ReadinessSection />
        <LiveEventSection />
        <AnalyticsSection />
        <EmployerCRMSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
