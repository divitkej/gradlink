"use client";

import Link from "next/link";
import { useState } from "react";
import { Users } from "lucide-react";
import { SectionCard } from "./cards";
import SessionManager from "./SessionManager";
import ManualSection from "./ManualSection";
import { useSession } from "@/lib/session";
import { useActiveEvent } from "@/lib/use-active-event";

/**
 * An alumni mentor's home: the event they are mentoring at, their mentoring
 * sessions (add, see who booked, mark who came) and a way to the students.
 */
export default function AlumniDashboard({ eventId }: { eventId: string }) {
  const { session } = useSession();
  const { event } = useActiveEvent();
  // Kept here so a time zone set elsewhere shows straight away.
  const [timezone, setTimezone] = useState<string | null>(null);
  if (!session) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionCard title={`Mentoring at ${event?.title ?? "this event"}`}>
        <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.6, maxWidth: 640, marginBottom: 14 }}>
          Thanks for giving your time. Add mentoring sessions below and students from your college book them on their schedule.
          After each session, open it to see who booked and mark who came.
        </p>
        <Link href={`/events/${eventId}?tab=people`} style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}>
          <Users size={15} /> See the students at this event
        </Link>
      </SectionCard>
      <SessionManager eventId={eventId} role="alumni" myId={session.profileId} isOwner={false}
        timezone={timezone ?? event?.timezone ?? null} onTimezoneChange={setTimezone} />
      <div id="manual"><ManualSection defaultRole="alumni" /></div>
    </div>
  );
}
