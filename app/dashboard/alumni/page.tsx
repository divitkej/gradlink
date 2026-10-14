"use client";

import DashboardShell from "@/components/dashboard/DashboardShell";
import AlumniDashboard from "@/components/dashboard/AlumniDashboard";
import EventGate from "@/components/events/EventGate";

export default function AlumniPage() {
  return (
    <DashboardShell role="alumni" title="Alumni Mentor">
      <EventGate>{(eventId) => <AlumniDashboard eventId={eventId} />}</EventGate>
    </DashboardShell>
  );
}
