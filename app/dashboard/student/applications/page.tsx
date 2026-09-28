"use client";

import DashboardShell from "@/components/dashboard/DashboardShell";
import StudentApplications from "@/components/dashboard/StudentApplications";
import EventGate from "@/components/events/EventGate";

export default function StudentApplicationsPage() {
  return (
    <DashboardShell role="student" title="Applications">
      <EventGate>{(eventId) => <StudentApplications eventId={eventId} />}</EventGate>
    </DashboardShell>
  );
}
