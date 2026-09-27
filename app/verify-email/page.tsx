import { Suspense } from "react";
import VerifyEmail from "@/components/gradlink/VerifyEmail";

export const metadata = { title: "Confirm your email · GradLink" };

export default function VerifyEmailPage() {
  // VerifyEmail reads the `token` query param via useSearchParams, which needs
  // a Suspense boundary so the rest of the route can still prerender.
  return (
    <Suspense fallback={null}>
      <VerifyEmail />
    </Suspense>
  );
}
