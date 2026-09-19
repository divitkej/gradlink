"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { GlassPanel } from "@/components/dashboard/widgets";
import { Badge } from "@/components/ui/primitives";
import { Reveal } from "@/components/anim/primitives";
import { LoadingBlock, StatTile } from "@/components/dashboard/cards";
import { CalendarDays, MapPin, QrCode, ArrowRight } from "lucide-react";
import { useSession, DEMO_EVENT_ID } from "@/lib/demo-session";
import { getEvent, getRegisteredStudents, getRegisteredCompanies, type EventRow } from "@/lib/db";

export default function EventsPage() {
  const { session, ready } = useSession();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [students, setStudents] = useState(0);
  const [companies, setCompanies] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [ev, st, co] = await Promise.all([getEvent(DEMO_EVENT_ID), getRegisteredStudents(), getRegisteredCompanies()]);
      if (cancelled) return;
      setEvent(ev); setStudents(st.length); setCompanies(co.length); setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [ready]);

  return (
    <DashboardShell title="Events">
      <Reveal>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Your events</h2>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 22 }}>Open the event console to access your QR, checklist, people, and the manual.</p>
      </Reveal>
      {loading ? (
        <GlassPanel><LoadingBlock /></GlassPanel>
      ) : !event ? (
        <GlassPanel><p style={{ fontSize: 14, color: "var(--text-muted)" }}>No events yet.</p></GlassPanel>
      ) : (
        <GlassPanel style={{ border: "1px solid var(--border-strong)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <Badge tone={event.status === "live" ? "amber" : "cyan"} pulse={event.status === "live"}>{event.status === "live" ? "Live now" : event.status}</Badge>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(20px,3vw,26px)", fontWeight: 700, color: "var(--text)", margin: "12px 0 6px" }}>{event.title}</h3>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "var(--text-muted)" }}>
                {event.location && <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><MapPin size={14} /> {event.location}</span>}
                {event.start_date && <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><CalendarDays size={14} /> {new Date(event.start_date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span>}
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--teal)" }}><QrCode size={14} /> QR enabled</span>
              </div>
            </div>
            <Link href={`/events/${DEMO_EVENT_ID}`} style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 46, padding: "0 22px", borderRadius: "var(--r-md)", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14.5, color: "#021016", background: "linear-gradient(100deg, var(--cyan), var(--teal))", textDecoration: "none", alignSelf: "flex-start" }}>
              Open console <ArrowRight size={16} />
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 18 }} className="ev-stats">
            <StatTile label="Companies" value={companies} />
            <StatTile label="Students" value={students} accent />
            <StatTile label="Your role" value={session ? (session.role === "event_manager" ? "Manager" : session.role[0].toUpperCase() + session.role.slice(1)) : "—"} />
          </div>
          <style>{`@media (max-width: 560px){ .ev-stats{ grid-template-columns:1fr !important } }`}</style>
        </GlassPanel>
      )}
    </DashboardShell>
  );
}
