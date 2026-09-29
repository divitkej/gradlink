"use client";

import DashboardShell from "@/components/dashboard/DashboardShell";
import EventManagerDashboard from "@/components/dashboard/EventManagerDashboard";
import EventGate from "@/components/events/EventGate";
import CollegeDomainNotice from "@/components/dashboard/CollegeDomainNotice";

export default function EventManagerPage() {
  return (
    <DashboardShell role="event_manager" title="Event Manager">
      <CollegeDomainNotice />
      <EventGate>{(eventId) => <EventManagerDashboard eventId={eventId} />}</EventGate>
    </DashboardShell>
  );
}
