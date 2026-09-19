import AuthShell from "@/components/gradlink/AuthShell";
import RoleSelect from "@/components/gradlink/RoleSelect";

export const metadata = {
  title: "Join GradLink",
  description: "Create your GradLink account as a student or a company.",
};

export default function SignUp() {
  return (
    <AuthShell>
      <RoleSelect />
    </AuthShell>
  );
}
