"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { SectionCard, LoadingBlock } from "./cards";
import { getStudentHistory, type StudentHistory as History } from "@/lib/db";
import { EVENT_STATUS_LABEL, type EventStatus } from "@/lib/events";
import { fmtDay } from "@/lib/format";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Every event the student joined and every company they connected with, across all events. */
export default function StudentHistory() {
  const [h, setH] = useState<History | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getStudentHistory().then((r) => { if (!cancelled) setH(r); });
    return () => { cancelled = true; };
  }, []);

  if (h === undefined) return <SectionCard title="Event history"><LoadingBlock label="Loading your history…" /></SectionCard>;
  if (!h) return null;

  const tag = (on: boolean, label: string) =>
    on ? <span key={label} style={{ fontSize: 11.5, color: "var(--text-2)", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: "2px 8px" }}>{label}</span> : null;

  return (
    <div className="dash-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <SectionCard title="Event history" hint={`${h.events.length} ${h.events.length === 1 ? "event" : "events"}`}>
        {h.events.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Events you join with a code from your college appear here.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {h.events.map((e) => (
              <Link key={e.id} href={`/events/${e.id}`} style={{ display: "block", padding: "12px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", textDecoration: "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{e.title}</span>
                  <span style={{ fontSize: 11.5, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{EVENT_STATUS_LABEL[e.status as EventStatus] ?? e.status}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>
                  <CalendarDays size={12} /> {[e.start_date ? fmtDay(e.start_date) : null, e.location].filter(Boolean).join(" · ") || "Date not set"}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 6 }}>
                  {[
                    plural(e.booths_visited, "booth visited", "booths visited"),
                    plural(e.recruiter_scans, "recruiter scanned you", "recruiters scanned you"),
                    plural(e.sessions_attended, "session attended", "sessions attended"),
                    plural(e.shortlists, "shortlist", "shortlists"),
                  ].join(" · ")}
                </div>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Company connections" hint={`${h.connections.length} ${h.connections.length === 1 ? "company" : "companies"}`}>
        {h.connections.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55 }}>Companies you visit, message, or that scan or shortlist you, are listed here and kept after each event.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {h.connections.map((c) => (
              <div key={c.company_id} style={{ padding: "11px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-md)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{c.name}</span>
                  <span style={{ fontSize: 11.5, color: "var(--text-muted)", whiteSpace: "nowrap" }}>Last {fmtDay(c.last_at)}</span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 7 }}>
                  {tag(c.visited, "You visited")}
                  {tag(c.scanned_you, "Scanned you")}
                  {tag(c.messaged, "You messaged")}
                  {tag(c.shortlisted, "Shortlisted you")}
                  {tag(c.interview, "Interview")}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
