import type { Metadata } from "next";
import TermsOfService from "@/components/legal/TermsOfService";

export const metadata: Metadata = {
  title: "Terms and Conditions · GradLink",
  description: "The rules for using GradLink, plan and payment terms, and what you can expect from us.",
};

export default function TermsPage() {
  return <TermsOfService />;
}
