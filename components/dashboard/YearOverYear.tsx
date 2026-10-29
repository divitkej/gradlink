"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { LoadingBlock, SmallButton, fieldStyle } from "./cards";
import { buildReport, compareReports, downloadComparisonCsv, type ComparisonRow, type OutcomeReport } from "@/lib/report";
import { listEventsForManager, type EventRow } from "@/lib/events";
import {
  getEvent, getRegisteredStudents, getRegisteredCompanies, getScans, listShortlists, getInterviewCounts, listOffers,
} from "@/lib/db";
import { fmtEventDate } from "@/lib/format";

const when = (e: EventRow) => e.start_date ?? e.created_at ?? "";

/** The outcome report of another of the college's events, built the same way as this one's. */
async function reportFor(eventId: string): Promise<OutcomeReport> {
  const [event, students, companies, scans, shortlists, interviews, offers] = await Promise.all([
    getEvent(eventId), getRegisteredStudents(eventId), getRegisteredCompanies(eventId), getScans({ eventId }),
    listShortlists(eventId), getInterviewCounts(eventId), listOffers(eventId),
  ]);
  return buildReport({ event, students, companies, scans, shortlists, interviews, offers });
}

function fmt(v: number | null, unit: ComparisonRow["unit"]) {
  if (v === null) return "Not enough data";
  return unit === "/10" ? `${v.toFixed(1)}/10` : `${v}${unit}`;
}

function Change({ row }: { row: ComparisonRow }) {
  if (row.change === null) return <span style={{ color: "var(--text-muted)" }}>n/a</span>;
  if (row.change === 0) return <span style={{ color: "var(--text-muted)" }}>No change</span>;
  const up = row.change > 0;
  const n = row.unit === "/10" ? Math.abs(row.change).toFixed(1) : Math.abs(row.change);
  const unit = row.unit === "%" ? " pts" : "";
  return <span style={{ color: up ? "var(--accent-2)" : "var(--amber)", fontWeight: 600 }}>{up ? "Up" : "Down"} {n}{unit}</span>;
}

/**
 * Year-over-year comparison (Placement Pro): this event's headline numbers
 * next to another event the same college ran, by default the most recent one
 * before it.
 */
export default function YearOverYear({ event, report, profileId }: { event: EventRow | null; report: OutcomeReport; profileId: string }) {
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<{ id: string; report: OutcomeReport } | null>(null);

  useEffect(() => {
    let cancelled = false;
    listEventsForManager(profileId).then((list) => {
      if (!cancelled) setEvents(list.filter((e) => e.id !== event?.id).sort((a, b) => when(b).localeCompare(when(a))));
    });
    return () => { cancelled = true; };
  }, [profileId, event?.id]);

  // Default: the most recent event before this one, else the most recent other one.
  const thisWhen = event ? when(event) : "";
  const fallback = events?.find((e) => when(e) < thisWhen) ?? events?.[0] ?? null;
  const compareId = picked ?? fallback?.id ?? null;

  useEffect(() => {
    if (!compareId) return;
    let cancelled = false;
    reportFor(compareId).then((r) => { if (!cancelled) setLoaded({ id: compareId, report: r }); });
    return () => { cancelled = true; };
  }, [compareId]);

  const previous = loaded && loaded.id === compareId ? loaded.report : null;
  const rows = previous ? compareReports(report, previous) : [];
  const label = (e: EventRow) => {
    const d = fmtEventDate(e.start_date, { month: "short", year: "numeric" });
    return d ? `${e.title} (${d})` : e.title;
  };

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-muted)", flex: 1, minWidth: 160 }}>
          Year-over-year comparison
        </div>
        {events && events.length > 0 && (
          <>
            <select aria-label="Compare with" value={compareId ?? ""} onChange={(e) => setPicked(e.target.value)}
              style={{ ...fieldStyle, height: 34, fontSize: 12.5, width: "auto", maxWidth: "100%" }}>
              {events.map((e) => <option key={e.id} value={e.id}>Compared with {label(e)}</option>)}
            </select>
            <SmallButton icon={<Download size={13} />} disabled={!previous} onClick={() => previous && downloadComparisonCsv(report, previous)}>
              Export comparison
            </SmallButton>
          </>
        )}
      </div>

      {events === null ? (
        <LoadingBlock label="Loading your events…" />
      ) : events.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55 }}>
          This is your first event on GradLeap. Once you run another, its results show here next to this one.
        </p>
      ) : !previous ? (
        <LoadingBlock label="Loading the earlier event…" />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Measure", report.eventTitle, previous.eventTitle, "Change"].map((h, i) => (
                  <th key={i} style={{ padding: "8px 10px", textAlign: i === 0 ? "left" : "right", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <td style={{ padding: "9px 10px", fontSize: 13, color: "var(--text-2)", borderTop: "1px solid var(--border)" }}>{r.label}</td>
                  <td style={{ padding: "9px 10px", fontSize: 13, fontWeight: 600, color: "var(--text)", textAlign: "right", borderTop: "1px solid var(--border)" }}>{fmt(r.current, r.unit)}</td>
                  <td style={{ padding: "9px 10px", fontSize: 13, color: "var(--text-2)", textAlign: "right", borderTop: "1px solid var(--border)" }}>{fmt(r.previous, r.unit)}</td>
                  <td style={{ padding: "9px 10px", fontSize: 12.5, textAlign: "right", borderTop: "1px solid var(--border)", whiteSpace: "nowrap" }}><Change row={r} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
