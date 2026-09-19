"use client";

import { useState } from "react";
import Link from "next/link";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { GlassPanel } from "@/components/dashboard/widgets";
import { SectionCard, LoadingBlock } from "@/components/dashboard/cards";
import { Badge } from "@/components/ui/primitives";
import { Reveal } from "@/components/anim/primitives";
import { CalendarDays, MapPin, ArrowRight, Plus, Ticket, Check, Copy } from "lucide-react";
import { useSession } from "@/lib/session";
import { useActiveEvent } from "@/lib/use-active-event";
import { EVENT_STATUS_LABEL, type EventRow } from "@/lib/events";
import CreateEventForm from "@/components/events/CreateEventForm";
import JoinEventForm from "@/components/events/JoinEventForm";

function statusTone(status: EventRow["status"]) {
  if (status === "live") return "amber" as const;
  if (status === "ended") return "muted" as const;
  return "cyan" as const;
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** The join code is the thing a college actually shares, so make it copyable. */
function JoinCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the code is on screen to read anyway */
    }
  }

  return (
    <button
      onClick={copy}
      title="Copy join code"
      style={{
        display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px",
        borderRadius: "var(--r-full)", cursor: "pointer",
        background: "rgba(0,194,168,0.08)", border: "1px solid rgba(0,194,168,0.28)",
        color: "var(--teal)", fontFamily: "var(--font-display)", fontWeight: 700,
        fontSize: 13, letterSpacing: "0.14em",
      }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {code}
    </button>
  );
}

function EventCard({ event, active, onOpen }: { event: EventRow; active: boolean; onOpen: () => void }) {
  const date = formatDate(event.start_date);
  return (
    <div
      style={{
        background: active ? "rgba(53,211,255,0.06)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${active ? "var(--border-strong)" : "var(--border)"}`,
        borderRadius: "var(--r-lg)",
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <Badge tone={statusTone(event.status)} pulse={event.status === "live"}>
              {EVENT_STATUS_LABEL[event.status] ?? event.status}
            </Badge>
            {active && (
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--cyan)" }}>Currently open</span>
            )}
          </div>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
            {event.title}
          </h3>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12.5, color: "var(--text-muted)" }}>
            {event.location && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <MapPin size={13} /> {event.location}
              </span>
            )}
            {date && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <CalendarDays size={13} /> {date}
              </span>
            )}
          </div>
        </div>

        {event.join_code && <JoinCode code={event.join_code} />}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <Link
          href={`/events/${event.id}`}
          onClick={onOpen}
          style={{
            display: "inline-flex", alignItems: "center", gap: 7, height: 38, padding: "0 16px",
            borderRadius: "var(--r-md)", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13.5,
            color: "#021016", background: "linear-gradient(100deg, var(--cyan), var(--teal))", textDecoration: "none",
          }}
        >
          Open console <ArrowRight size={14} />
        </Link>
        {!active && (
          <button
            onClick={onOpen}
            style={{
              height: 38, padding: "0 15px", borderRadius: "var(--r-md)", cursor: "pointer",
              fontSize: 13, fontWeight: 600, color: "var(--text-2)",
              background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
            }}
          >
            Switch to this event
          </button>
        )}
      </div>
    </div>
  );
}

export default function EventsPage() {
  const { session } = useSession();
  const { events, eventId, status, selectEvent } = useActiveEvent();
  const [showForm, setShowForm] = useState(false);

  const isManager = session?.role === "event_manager";

  return (
    <DashboardShell title="Events">
      <Reveal>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
              Your events
            </h2>
            <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
              {isManager
                ? "Create an event, then share its join code with students and employers."
                : "Events you've joined. Add another with the code your college gave you."}
            </p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8, height: 42, padding: "0 18px",
              borderRadius: "var(--r-md)", cursor: "pointer",
              fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14,
              color: showForm ? "var(--text-2)" : "#021016",
              background: showForm ? "rgba(255,255,255,0.04)" : "linear-gradient(100deg, var(--cyan), var(--teal))",
              border: showForm ? "1px solid var(--border)" : "none",
            }}
          >
            {isManager ? <Plus size={16} /> : <Ticket size={16} />}
            {showForm ? "Cancel" : isManager ? "New event" : "Join an event"}
          </button>
        </div>
      </Reveal>

      {showForm && (
        <div style={{ marginBottom: 20 }}>
          <SectionCard
            title={isManager ? "Create an event" : "Join an event"}
            accent="var(--border-strong)"
          >
            {isManager ? (
              <CreateEventForm onCreated={() => setShowForm(false)} />
            ) : (
              <JoinEventForm onJoined={() => setShowForm(false)} />
            )}
          </SectionCard>
        </div>
      )}

      {status === "loading" ? (
        <GlassPanel><LoadingBlock label="Loading your events…" /></GlassPanel>
      ) : events.length === 0 ? (
        <GlassPanel>
          <div style={{ textAlign: "center", padding: "28px 20px 34px" }}>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
              No events yet
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 380, margin: "0 auto", lineHeight: 1.55 }}>
              {isManager
                ? "Create your first event to get a join code you can share."
                : "Ask your placement office for the event code, then join above."}
            </p>
          </div>
        </GlassPanel>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {events.map((ev) => (
            <EventCard
              key={ev.id}
              event={ev}
              active={ev.id === eventId}
              onOpen={() => selectEvent(ev.id)}
            />
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
