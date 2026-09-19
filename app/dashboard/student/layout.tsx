/**
 * Metadata lives here because page.tsx is a client component (it uses the
 * session and active-event hooks), and client components can't export metadata.
 */
export const metadata = { title: "Student Dashboard — GradLink" };

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
