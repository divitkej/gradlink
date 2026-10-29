import AuthShell from "@/components/gradleap/AuthShell";
import RoleSelect from "@/components/gradleap/RoleSelect";

export const metadata = {
  title: "Join GradLeap",
  description: "Create your GradLeap account as a student or a company.",
};

export default function SignUp() {
  return (
    <AuthShell>
      <RoleSelect />
    </AuthShell>
  );
}
