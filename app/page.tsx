import Navbar from "@/components/Navbar";
import OpeningHero from "@/components/OpeningHero";
import HeroSection from "@/components/HeroSection";
import ProblemSection from "@/components/ProblemSection";
import WhyGradLinkSection from "@/components/WhyGradLinkSection";
import ProductJourneySection from "@/components/ProductJourneySection";
import SpatialShowcaseSection from "@/components/SpatialShowcaseSection";
import ReadinessSection from "@/components/ReadinessSection";
import LiveEventSection from "@/components/LiveEventSection";
import AnalyticsSection from "@/components/AnalyticsSection";
import EmployerCRMSection from "@/components/EmployerCRMSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import StatementBand from "@/components/StatementBand";
import ProductReveal from "@/components/gradlink/ProductReveal";

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
          eyebrow="The GradLink difference"
          text="Measure the journey, not the attendance."
        />
        <WhyGradLinkSection />
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
