import AuthShell from "@/components/gradleap/AuthShell";
import SignUpForm from "@/components/gradleap/SignUpForm";

export const metadata = { title: "Company sign-up · GradLeap" };

export default function CompanySignUp() {
  return (
    <AuthShell backHref="/sign-up" backLabel="Back">
      <SignUpForm role="company" />
    </AuthShell>
  );
}
