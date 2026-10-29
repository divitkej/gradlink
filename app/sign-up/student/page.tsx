import AuthShell from "@/components/gradleap/AuthShell";
import SignUpForm from "@/components/gradleap/SignUpForm";

export const metadata = { title: "Student sign-up · GradLeap" };

export default function StudentSignUp() {
  return (
    <AuthShell backHref="/sign-up" backLabel="Back">
      <SignUpForm role="student" />
    </AuthShell>
  );
}
