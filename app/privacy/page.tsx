import type { Metadata } from "next";
import PrivacyPolicy from "@/components/legal/PrivacyPolicy";

export const metadata: Metadata = {
  title: "Privacy Policy · GradLeap",
  description: "What personal data GradLeap collects, who can see it, where it is stored and how to access or delete it.",
};

export default function PrivacyPage() {
  return <PrivacyPolicy />;
}
