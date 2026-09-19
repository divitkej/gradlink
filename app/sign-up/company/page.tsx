import AuthShell from "@/components/gradlink/AuthShell";
import SignUpForm from "@/components/gradlink/SignUpForm";

export const metadata = { title: "Company sign-up — GradLink" };

export default function CompanySignUp() {
  return (
    <AuthShell backHref="/sign-up" backLabel="Back">
      <SignUpForm role="company" />
    </AuthShell>
  );
}
