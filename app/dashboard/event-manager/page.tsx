"use client";

import DashboardShell from "@/components/dashboard/DashboardShell";
import EventManagerDashboard from "@/components/dashboard/EventManagerDashboard";

export default function EventManagerPage() {
  return (
    <DashboardShell role="event_manager" title="Event Manager">
      <EventManagerDashboard />
    </DashboardShell>
  );
}
