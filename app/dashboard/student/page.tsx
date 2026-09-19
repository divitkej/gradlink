"use client";

import DashboardShell from "@/components/dashboard/DashboardShell";
import StudentDashboard from "@/components/dashboard/StudentDashboard";
import EventGate from "@/components/events/EventGate";

export default function StudentPage() {
  return (
    <DashboardShell role="student" title="Student Overview">
      <EventGate>{(eventId) => <StudentDashboard eventId={eventId} />}</EventGate>
    </DashboardShell>
  );
}
