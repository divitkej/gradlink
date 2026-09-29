import type { Metadata } from "next";
import PrivacyPolicy from "@/components/legal/PrivacyPolicy";

export const metadata: Metadata = {
  title: "Privacy Policy · GradLink",
  description: "What personal data GradLink collects, who can see it, where it is stored and how to access or delete it.",
};

export default function PrivacyPage() {
  return <PrivacyPolicy />;
}
