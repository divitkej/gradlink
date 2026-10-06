"use client";

import DashboardShell from "@/components/dashboard/DashboardShell";
import { GlassPanel } from "@/components/dashboard/widgets";
import { LoadingBlock } from "@/components/dashboard/cards";
import StudentProfileEditor from "@/components/dashboard/StudentProfileEditor";
import StudentHistory from "@/components/dashboard/StudentHistory";
import CompanyProfileEditor from "@/components/dashboard/CompanyProfileEditor";
import CollegeProfileEditor from "@/components/dashboard/CollegeProfileEditor";
import { useSession } from "@/lib/session";

export default function ProfilePage() {
  const { session, ready } = useSession();
  const title = session?.role === "company" ? "Company Profile" : session?.role === "event_manager" ? "College Profile" : "Career Profile";

  return (
    <DashboardShell title={title}>
      {!ready || !session ? (
        <GlassPanel><LoadingBlock /></GlassPanel>
      ) : session.role === "company" ? (
        <CompanyProfileEditor session={session} />
      ) : session.role === "event_manager" ? (
        <CollegeProfileEditor session={session} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <StudentProfileEditor session={session} />
          <StudentHistory />
        </div>
      )}
    </DashboardShell>
  );
}
