import AuthShell from "@/components/gradleap/AuthShell";
import SignUpForm from "@/components/gradleap/SignUpForm";

export const metadata = { title: "College / Event host sign-up · GradLeap" };

export default function CollegeSignUp() {
  return (
    <AuthShell backHref="/sign-up" backLabel="Back">
      <SignUpForm role="college" />
    </AuthShell>
  );
}
