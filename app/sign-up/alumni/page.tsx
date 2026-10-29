import AuthShell from "@/components/gradleap/AuthShell";
import SignUpForm from "@/components/gradleap/SignUpForm";

export const metadata = { title: "Alumni mentor sign-up · GradLeap" };

/** Reached from a college's alumni invite link, which carries the event's alumni code as ?code=. */
export default async function AlumniSignUp({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const code = (await searchParams).code;
  return (
    <AuthShell backHref="/sign-up" backLabel="Back">
      <SignUpForm role="alumni" alumniCode={typeof code === "string" ? code : ""} />
    </AuthShell>
  );
}
