"use client";

import { useParams } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import EventConsole from "@/components/dashboard/EventConsole";
import { DEMO_EVENT_ID } from "@/lib/demo-session";

export default function EventPage() {
  const params = useParams();
  const eventId = (params.eventId ? String(params.eventId) : DEMO_EVENT_ID) || DEMO_EVENT_ID;
  return (
    <DashboardShell title="Event Console">
      <EventConsole eventId={eventId} />
    </DashboardShell>
  );
}
