import type { Metadata } from "next";
import TermsOfService from "@/components/legal/TermsOfService";

export const metadata: Metadata = {
  title: "Terms and Conditions · GradLeap",
  description: "The rules for using GradLeap, plan and payment terms, and what you can expect from us.",
};

export default function TermsPage() {
  return <TermsOfService />;
}
