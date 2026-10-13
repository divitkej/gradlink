"use client";

import { Suspense } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import EventManagerDashboard from "@/components/dashboard/EventManagerDashboard";
import EventGate from "@/components/events/EventGate";
import CollegeDomainNotice from "@/components/dashboard/CollegeDomainNotice";
import UpgradedNotice from "@/components/dashboard/UpgradedNotice";

export default function EventManagerPage() {
  return (
    <DashboardShell role="event_manager" title="Event Manager">
      {/* UpgradedNotice reads ?upgraded via useSearchParams, which needs a Suspense boundary. */}
      <Suspense fallback={null}>
        <UpgradedNotice />
      </Suspense>
      <CollegeDomainNotice />
      <EventGate>{(eventId) => <EventManagerDashboard eventId={eventId} />}</EventGate>
    </DashboardShell>
  );
}
