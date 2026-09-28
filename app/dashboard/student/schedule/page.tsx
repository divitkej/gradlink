"use client";

import DashboardShell from "@/components/dashboard/DashboardShell";
import StudentSchedule from "@/components/dashboard/StudentSchedule";
import EventGate from "@/components/events/EventGate";

export default function StudentSchedulePage() {
  return (
    <DashboardShell role="student" title="Schedule and Plan">
      <EventGate>{(eventId) => <StudentSchedule eventId={eventId} />}</EventGate>
    </DashboardShell>
  );
}
