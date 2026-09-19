"use client";

import DashboardShell from "@/components/dashboard/DashboardShell";
import { GlassPanel } from "@/components/dashboard/widgets";
import { LoadingBlock } from "@/components/dashboard/cards";
import StudentProfileEditor from "@/components/dashboard/StudentProfileEditor";
import CompanyProfileEditor from "@/components/dashboard/CompanyProfileEditor";
import { useSession } from "@/lib/demo-session";

export default function ProfilePage() {
  const { session, ready } = useSession();
  const title = session?.role === "company" ? "Company Profile" : "Career Profile";

  return (
    <DashboardShell title={title}>
      {!ready || !session ? (
        <GlassPanel><LoadingBlock /></GlassPanel>
      ) : session.role === "company" ? (
        <CompanyProfileEditor session={session} />
      ) : session.role === "event_manager" ? (
        <GlassPanel style={{ textAlign: "center", padding: "48px 24px" }}>
          <p style={{ fontSize: 14.5, color: "var(--text-2)" }}>Event managers manage the event from the Overview and Event Console — there&apos;s no personal booth profile to edit here.</p>
        </GlassPanel>
      ) : (
        <StudentProfileEditor session={session} />
      )}
    </DashboardShell>
  );
}
