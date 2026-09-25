import AuthShell from "@/components/gradlink/AuthShell";
import SignUpForm from "@/components/gradlink/SignUpForm";

export const metadata = { title: "Student sign-up · GradLink" };

export default function StudentSignUp() {
  return (
    <AuthShell backHref="/sign-up" backLabel="Back">
      <SignUpForm role="student" />
    </AuthShell>
  );
}
