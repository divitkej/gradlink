"use client";

import DashboardShell from "@/components/dashboard/DashboardShell";
import StudentOpportunities from "@/components/dashboard/StudentOpportunities";
import EventGate from "@/components/events/EventGate";

export default function StudentOpportunitiesPage() {
  return (
    <DashboardShell role="student" title="Opportunities">
      <EventGate>{(eventId) => <StudentOpportunities eventId={eventId} />}</EventGate>
    </DashboardShell>
  );
}
