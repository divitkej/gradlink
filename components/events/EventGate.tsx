"use client";

import { CalendarPlus, Ticket } from "lucide-react";
import { SectionCard, LoadingBlock } from "@/components/dashboard/cards";
import { useSession } from "@/lib/session";
import { useActiveEvent } from "@/lib/use-active-event";
import JoinEventForm from "./JoinEventForm";
import EventForm from "./EventForm";

/**
 * Wraps any view that only makes sense inside an event.
 *
 * Belonging to no event is a normal state for a new account, not an error — so
 * this renders the way out of it (create one, or join with a code) rather than
 * an empty dashboard full of zeroes.
 */
export default function EventGate({
  children,
}: {
  children: (eventId: string) => React.ReactNode;
}) {
  const { session } = useSession();
  const { status, eventId } = useActiveEvent();

  if (status === "loading") return <LoadingBlock label="Loading your events…" />;

  if (status === "ready" && eventId) return <>{children(eventId)}</>;

  const isManager = session?.role === "event_manager";

  return isManager ? (
    <SectionCard
      title="Create your first event"
      accent="var(--border-strong)"
      right={<CalendarPlus size={18} color="var(--accent)" />}
    >
      <p style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 18, maxWidth: 620 }}>
        An event is a career fair, placement drive or employer day. Once it exists you&apos;ll get two
        codes: one for students and one for employers. Each person registers with their code, and
        everything they do at the event reports back here.
      </p>
      <EventForm />
    </SectionCard>
  ) : (
    <SectionCard
      title="Join your event"
      accent="var(--border-strong)"
      right={<Ticket size={18} color="var(--accent)" />}
    >
      <p style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 18, maxWidth: 620 }}>
        {session?.role === "company"
          ? "The college running the fair gives employers their own code. Enter it here to register your company. Your QR, candidate list and checklist open once you're in."
          : "Your college gives students a code for each career fair. Enter it here to register. Your QR, checklist and the employer list open once you're in."}
      </p>
      <JoinEventForm />
    </SectionCard>
  );
}
