import { Suspense } from "react";
import ResetPassword from "@/components/gradlink/ResetPassword";

export const metadata = { title: "Reset password · GradLink" };

export default function ResetPasswordPage() {
  // ResetPassword reads the `oobCode` query param via useSearchParams, which
  // needs a Suspense boundary so the rest of the route can still prerender.
  return (
    <Suspense fallback={null}>
      <ResetPassword />
    </Suspense>
  );
}
