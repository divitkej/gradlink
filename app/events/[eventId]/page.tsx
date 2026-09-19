"use client";

import { useParams } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import EventConsole from "@/components/dashboard/EventConsole";

export default function EventPage() {
  const params = useParams();
  const eventId = params.eventId ? String(params.eventId) : "";
  return (
    <DashboardShell title="Event Console">
      <EventConsole eventId={eventId} />
    </DashboardShell>
  );
}
