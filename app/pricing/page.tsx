import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import PricingSection from "@/components/PricingSection";

export const metadata = {
  title: "Pricing — GradLink",
  description:
    "GradLink is free for students and employers. Colleges upgrade to Placement Pro for outcome reporting, exports and unlimited events.",
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
