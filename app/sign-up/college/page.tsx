import AuthShell from "@/components/gradlink/AuthShell";
import SignUpForm from "@/components/gradlink/SignUpForm";

export const metadata = { title: "College / Event host sign-up — GradLink" };

export default function CollegeSignUp() {
  return (
    <AuthShell backHref="/sign-up" backLabel="Back">
      <SignUpForm role="college" />
    </AuthShell>
  );
}
