import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import PricingSection from "@/components/pricing/PricingSection";

export const metadata = {
  title: "Pricing · GradLink",
  description:
    "GradLink is free for students and employers. Colleges run their first event free, then buy an Event Pass or subscribe to Placement Pro for unlimited events, outcome reports and exports.",
};

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main>
        <PricingSection />
      </main>
      <Footer />
    </>
  );
}
