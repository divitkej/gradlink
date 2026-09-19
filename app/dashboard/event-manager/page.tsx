"use client";

import DashboardShell from "@/components/dashboard/DashboardShell";
import EventManagerDashboard from "@/components/dashboard/EventManagerDashboard";
import EventGate from "@/components/events/EventGate";

export default function EventManagerPage() {
  return (
    <DashboardShell role="event_manager" title="Event Manager">
      <EventGate>{(eventId) => <EventManagerDashboard eventId={eventId} />}</EventGate>
    </DashboardShell>
  );
}
