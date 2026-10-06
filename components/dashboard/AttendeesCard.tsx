"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { SectionCard, LoadingBlock } from "./cards";
import { listAttendees, type AttendeeRow } from "@/lib/events";

type Filter = "all" | "student" | "company";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Everyone" },
  { key: "student", label: "Students" },
  { key: "company", label: "Employers" },
];

function orgOf(a: AttendeeRow) {
  return a.role === "student" ? a.university ?? a.organization : a.company_name ?? a.company ?? a.organization;
}

function detailOf(a: AttendeeRow) {
  if (a.role === "student") return [a.degree, a.graduation_year].filter(Boolean).join(", ");
  return [a.sector, a.booth_number ? `Booth ${a.booth_number}` : null].filter(Boolean).join(", ");
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function joined(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/**
 * Everyone who joined this event with a code, newest first, with the details
 * they signed up with. Only the event's organiser can load this.
 */
export default function AttendeesCard({ eventId }: { eventId: string }) {
  const [rows, setRows] = useState<AttendeeRow[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    listAttendees(eventId).then((r) => { if (!cancelled) setRows(r); });
    return () => { cancelled = true; };
  }, [eventId]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (rows ?? []).filter((a) =>
      (filter === "all" || a.role === filter) &&
      (!needle || [a.full_name, a.email, orgOf(a), detailOf(a)].some((v) => (v ?? "").toLowerCase().includes(needle))),
    );
  }, [rows, filter, q]);

  const students = rows?.filter((a) => a.role === "student").length ?? 0;
  const employers = rows?.filter((a) => a.role === "company").length ?? 0;

  const th: React.CSSProperties = { padding: "10px 12px", textAlign: "left", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-muted)", whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "10px 12px", fontSize: 13, color: "var(--text-2)", borderTop: "1px solid var(--border)", verticalAlign: "top" };

  return (
    <SectionCard title="Attendees" hint={rows ? `${count(students, "student", "students")}, ${count(employers, "employer", "employers")}` : undefined}>
      <div id="attendees" />
      {rows === null ? (
        <LoadingBlock label="Loading attendees…" />
      ) : rows.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Nobody has joined yet. Share the student code with students and the employer code with employers. Each person appears here as soon as they join.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {FILTERS.map((f) => {
              const on = filter === f.key;
              return (
                <button key={f.key} type="button" onClick={() => setFilter(f.key)}
                  style={{ fontSize: 12.5, fontWeight: 600, padding: "6px 12px", borderRadius: "var(--r-sm)", cursor: "pointer", color: on ? "var(--text)" : "var(--text-2)", background: on ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.03)", border: `1px solid ${on ? "var(--border-strong)" : "var(--border)"}` }}>
                  {f.label}
                </button>
              );
            })}
            <div style={{ position: "relative", display: "flex", alignItems: "center", flex: 1, minWidth: 180 }}>
              <Search size={14} style={{ position: "absolute", left: 11, color: "var(--text-muted)" }} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, organisation…" aria-label="Search attendees"
                style={{ width: "100%", height: 36, padding: "0 12px 0 32px", fontSize: 13, color: "var(--text)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", outline: "none" }} />
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
              <thead><tr>{["Name", "Type", "Organisation", "Details", "Email", "Joined"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {shown.map((a) => (
                  <tr key={a.profile_id}>
                    <td style={{ ...td, color: "var(--text)", fontWeight: 600 }}>{a.full_name || "No name given"}</td>
                    <td style={td}>{a.role === "student" ? "Student" : "Employer"}</td>
                    <td style={td}>{orgOf(a) || ""}</td>
                    <td style={td}>{detailOf(a)}</td>
                    <td style={td}><a href={`mailto:${a.email}`} style={{ color: "var(--accent)", textDecoration: "none" }}>{a.email}</a></td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>{joined(a.joined_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {shown.length === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)", padding: "12px" }}>No one matches that search.</p>}
          </div>
        </div>
      )}
    </SectionCard>
  );
}
