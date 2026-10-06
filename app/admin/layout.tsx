/**
 * Metadata lives here because page.tsx is a client component. The owner
 * dashboard is never indexed.
 */
export const metadata = { title: "Owner Dashboard · GradLink", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
