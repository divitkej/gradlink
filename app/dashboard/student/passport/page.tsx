"use client";

import DashboardShell from "@/components/dashboard/DashboardShell";
import StudentPassport from "@/components/dashboard/StudentPassport";
import EventGate from "@/components/events/EventGate";

export default function StudentPassportPage() {
  return (
    <DashboardShell role="student" title="Digital Passport">
      <EventGate>{(eventId) => <StudentPassport eventId={eventId} />}</EventGate>
    </DashboardShell>
  );
}
