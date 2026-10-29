import type { Metadata } from "next";
import NotFound from "@/components/site/NotFound";

export const metadata: Metadata = { title: "Page not found · GradLeap" };

export default function NotFoundPage() {
  return <NotFound />;
}
