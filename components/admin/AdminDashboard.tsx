"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw, Search, ChevronDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import Logo from "@/components/Logo";
import { SectionCard, StatTile, LoadingBlock } from "@/components/dashboard/cards";
import { Badge } from "@/components/ui/primitives";
import { ApiError } from "@/lib/api-client";
import { EVENT_STATUS_LABEL } from "@/lib/events";
import { getAdminOverview, type AdminOverview, type AdminCollege, type AdminEvent } from "@/lib/admin";

/* ============================================================
   Owner dashboard (/admin). Only the emails in the ADMIN_EMAILS
   secret get data back; anyone else sees "Page not found".

   Refreshes every 30 seconds while the tab is visible, so it can
   sit open during an event.
   ============================================================ */

const REFRESH_MS = 30_000;
/** A live event with no scans for this long is flagged as quiet. */
const QUIET_MINUTES = 20;

/** Relative to when the server built the snapshot, so a render is pure. */
function ago(iso: string | null | undefined, now: number): string {
  if (!iso) return "never";
  const mins = Math.floor((now - Date.parse(iso)) / 60000);
  if (!Number.isFinite(mins)) return "";
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs} h ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function date(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function planLabel(c: AdminCollege): { label: string; tone: "cyan" | "teal" | "amber" | "muted" } {
  const paid = c.sub_plan === "pro" && (c.sub_status === "active" || c.sub_status === "past_due");
  if (paid) return { label: c.sub_status === "past_due" ? "Pro, payment overdue" : "Pro, paid", tone: c.sub_status === "past_due" ? "amber" : "teal" };
  if (c.plan_choice === "pro") return { label: "Chose Pro, not paid", tone: "amber" };
  if (c.plan_choice === "free") return { label: "Starter", tone: "cyan" };
  return { label: "No plan chosen yet", tone: "muted" };
}

function statusTone(s: AdminEvent["status"]) {
  return s === "live" ? "amber" : s === "ended" ? "muted" : "cyan";
}

const th: React.CSSProperties = { padding: "9px 10px", textAlign: "left", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-muted)", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "9px 10px", fontSize: 12.5, color: "var(--text-2)", borderTop: "1px solid var(--border)", verticalAlign: "top" };
const num: React.CSSProperties = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" };

function EventsTable({ events, now }: { events: AdminEvent[]; now: number }) {
  if (!events.length) return <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No events yet.</p>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
        <thead>
          <tr>
            {["Event", "Status", "Dates", "Location", "Student code", "Employer code"].map((h) => <th key={h} style={th}>{h}</th>)}
            {["Students", "Employers", "Scans", "Shortlists", "Messages"].map((h) => <th key={h} style={{ ...th, textAlign: "right" }}>{h}</th>)}
            <th style={th}>Last scan</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id}>
              <td style={{ ...td, color: "var(--text)", fontWeight: 600 }}>{e.title}</td>
              <td style={td}><Badge tone={statusTone(e.status)}>{EVENT_STATUS_LABEL[e.status] ?? e.status}</Badge></td>
              <td style={{ ...td, whiteSpace: "nowrap" }}>{[date(e.start_date), date(e.end_date)].filter(Boolean).join(" to ") || "Not set"}</td>
              <td style={td}>{e.location ?? ""}</td>
              <td style={{ ...td, fontFamily: "var(--font-display)", letterSpacing: "0.1em" }}>{e.student_code ?? ""}</td>
              <td style={{ ...td, fontFamily: "var(--font-display)", letterSpacing: "0.1em" }}>{e.company_code ?? ""}</td>
              <td style={num}>{e.students}</td>
              <td style={num}>{e.companies}</td>
              <td style={num}>{e.scans}</td>
              <td style={num}>{e.shortlists}</td>
              <td style={num}>{e.messages}</td>
              <td style={{ ...td, whiteSpace: "nowrap" }}>{ago(e.last_scan_at, now)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CollegeRow({ college, events, open, onToggle, now }: { college: AdminCollege; events: AdminEvent[]; open: boolean; onToggle: () => void; now: number }) {
  const plan = planLabel(college);
  const students = events.reduce((n, e) => n + e.students, 0);
  const employers = events.reduce((n, e) => n + e.companies, 0);
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r-md)", background: "rgba(255,255,255,0.02)" }}>
      <button type="button" onClick={onToggle} aria-expanded={open}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", padding: "13px 16px", background: "transparent", border: "none", cursor: "pointer", color: "var(--text)", textAlign: "left" }}>
        <span style={{ flex: "1 1 240px", minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 14, fontWeight: 600 }}>{college.organization || college.full_name || "Unnamed college"}</span>
          <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)" }}>
            {college.full_name}{college.full_name && college.email ? ", " : ""}{college.email} · joined {date(college.created_at)}
          </span>
        </span>
        <Badge tone={plan.tone}>{plan.label}</Badge>
        <span style={{ fontSize: 12.5, color: "var(--text-2)", whiteSpace: "nowrap" }}>
          {count(events.length, "event", "events")}, {count(students, "student", "students")}, {count(employers, "employer", "employers")}
        </span>
        <ChevronDown size={16} style={{ color: "var(--text-muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>
      {open && <div style={{ padding: "0 12px 12px" }}><EventsTable events={events} now={now} /></div>}
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getAdminOverview());
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? { status: e.status, message: e.message } : { status: 0, message: "Couldn't reach the server." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // First load runs on the next frame, then every REFRESH_MS.
    const first = requestAnimationFrame(() => { void load(); });
    // Skip refreshes while the tab is hidden, so Neon can scale to zero.
    const id = setInterval(() => { if (!document.hidden) void load(); }, REFRESH_MS);
    return () => { cancelAnimationFrame(first); clearInterval(id); };
  }, [load]);

  const byCollege = useMemo(() => {
    const map = new Map<string, AdminEvent[]>();
    for (const e of data?.events ?? []) {
      const key = e.created_by ?? "";
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return map;
  }, [data]);

  const colleges = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.colleges ?? []).filter((c) => {
      if (!needle) return true;
      const evs = byCollege.get(c.id) ?? [];
      return [c.organization, c.full_name, c.email, ...evs.map((e) => e.title), ...evs.flatMap((e) => [e.student_code, e.company_code])]
        .some((v) => (v ?? "").toLowerCase().includes(needle));
    });
  }, [data, q, byCollege]);

  const live = useMemo(
    () => (data?.events ?? []).filter((e) => e.status === "live" || e.scans_15m > 0),
    [data],
  );
  const collegeName = (id: string | null) => {
    const c = data?.colleges.find((x) => x.id === id);
    return c?.organization || c?.full_name || "Unknown college";
  };
  const orphanEvents = byCollege.get("") ?? [];

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const shell = (children: React.ReactNode) => (
    <div style={{ minHeight: "100svh", position: "relative", zIndex: 1 }}>
      <header style={{ position: "sticky", top: 0, zIndex: 30, display: "flex", alignItems: "center", gap: 14, padding: "14px clamp(16px, 3vw, 32px)", background: "rgba(10,10,10,0.7)", backdropFilter: "blur(16px)", borderBottom: "1px solid var(--border)" }}>
        <Link href="/" style={{ textDecoration: "none" }}><Logo size={20} /></Link>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Owner dashboard</h1>
        <div style={{ flex: 1 }} />
        {data && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Updated {new Date(data.generatedAt).toLocaleTimeString("en-GB")}</span>}
        {data && (
          <button type="button" onClick={() => void load()} disabled={loading}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 36, padding: "0 13px", borderRadius: "var(--r-sm)", cursor: loading ? "default" : "pointer", fontSize: 13, fontWeight: 600, color: "var(--text-2)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", opacity: loading ? 0.6 : 1 }}>
            <RefreshCw size={14} /> Refresh
          </button>
        )}
      </header>
      <main style={{ padding: "clamp(16px, 3vw, 32px)", maxWidth: 1280, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        {children}
      </main>
    </div>
  );

  if (!data) {
    if (loading && !error) return shell(<LoadingBlock label="Loading…" />);
    if (error?.status === 401) {
      return shell(
        <SectionCard title="Sign in to continue">
          <p style={{ fontSize: 13.5, color: "var(--text-2)" }}>
            <Link href="/sign-in" style={{ color: "var(--accent)" }}>Sign in</Link> with the owner account, then come back to this page.
          </p>
        </SectionCard>,
      );
    }
    if (error?.status === 404 || error?.status === 403) {
      return shell(<SectionCard title="Page not found"><p style={{ fontSize: 13.5, color: "var(--text-2)" }}>There is nothing here.</p></SectionCard>);
    }
    return shell(
      <SectionCard title="Couldn't load the dashboard">
        <p style={{ fontSize: 13.5, color: "var(--text-2)", marginBottom: 12 }}>{error?.message}</p>
        <button type="button" onClick={() => void load()} style={{ height: 36, padding: "0 14px", borderRadius: "var(--r-sm)", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--text)", background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)" }}>Try again</button>
      </SectionCard>,
    );
  }

  const { health, totals } = data;
  const now = Date.parse(data.generatedAt);
  const healthy = health.errors1h === 0 && health.dbLatencyMs < 1500;

  return shell(
    <>
      {error && (
        <div role="alert" style={{ fontSize: 13, color: "var(--danger)", background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.25)", borderRadius: "var(--r-sm)", padding: "10px 14px" }}>
          The last refresh failed ({error.message}). Showing data from {new Date(data.generatedAt).toLocaleTimeString("en-GB")}.
        </div>
      )}

      <SectionCard
        title="Site health"
        right={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: healthy ? "var(--accent-2)" : "var(--amber)" }}>
            {healthy ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
            {healthy ? "Running normally" : "Needs a look"}
          </span>
        }
      >
        <div className="adm-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          <StatTile label="Database response" value={health.dbLatencyMs} suffix=" ms" />
          <StatTile label="Server errors, last hour" value={health.errors1h} tone={health.errors1h ? "var(--amber)" : undefined} />
          <StatTile label="Server errors, 24 hours" value={health.errors24h} />
          <StatTile label="Scans, last hour" value={totals.scans_1h} accent />
          <StatTile label="Messages, 24 hours" value={totals.messages_24h} />
        </div>
      </SectionCard>

      <SectionCard title="Happening now" hint={`${count(live.length, "event", "events")} live or with scans in the last 15 minutes`}>
        {live.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No event is live right now.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {live.map((e) => {
              const quiet = e.status === "live" && (!e.last_scan_at || now - Date.parse(e.last_scan_at) > QUIET_MINUTES * 60000);
              return (
                <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "11px 13px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-md)" }}>
                  <span style={{ flex: "1 1 220px", minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{e.title}</span>
                    <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)" }}>{collegeName(e.created_by)}{e.location ? `, ${e.location}` : ""}</span>
                  </span>
                  <span style={{ fontSize: 12.5, color: "var(--text-2)" }}>{count(e.students, "student", "students")}, {count(e.companies, "employer", "employers")}</span>
                  <span style={{ fontSize: 12.5, color: "var(--text-2)" }}>{count(e.scans_15m, "scan", "scans")} in 15 min</span>
                  <span style={{ fontSize: 12.5, color: "var(--text-2)" }}>last scan {ago(e.last_scan_at, now)}</span>
                  {quiet
                    ? <Badge tone="amber">Quiet for {QUIET_MINUTES}+ min</Badge>
                    : <Badge tone="teal">Active</Badge>}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Totals">
        <div className="adm-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          <StatTile label="Colleges" value={totals.colleges} accent />
          <StatTile label="Students" value={totals.students} />
          <StatTile label="Employers" value={totals.companies} />
          <StatTile label="Events" value={totals.events} />
          <StatTile label="Sign-ups, 7 days" value={totals.signups_7d} />
        </div>
      </SectionCard>

      <SectionCard title="Colleges" hint={`${colleges.length} of ${data.colleges.length}`}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", marginBottom: 12 }}>
          <Search size={14} style={{ position: "absolute", left: 11, color: "var(--text-muted)" }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search college, email, event or code…" aria-label="Search colleges"
            style={{ width: "100%", height: 38, padding: "0 12px 0 32px", fontSize: 13, color: "var(--text)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", outline: "none" }} />
        </div>
        {colleges.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{data.colleges.length ? "No college matches that search." : "No college has signed up yet."}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {colleges.map((c) => (
              <CollegeRow key={c.id} college={c} events={byCollege.get(c.id) ?? []} open={open.has(c.id)} onToggle={() => toggle(c.id)} now={now} />
            ))}
          </div>
        )}
        {orphanEvents.length > 0 && !q && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Events whose college account was deleted</div>
            <EventsTable events={orphanEvents} now={now} />
          </div>
        )}
      </SectionCard>

      <SectionCard title="Recent server errors" hint="Newest first, last 50">
        {data.errors.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No server errors recorded.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
              <thead><tr>{["When", "Where", "Message"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {data.errors.map((e) => (
                  <tr key={e.id}>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>{new Date(e.created_at).toLocaleString("en-GB")}</td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>{e.scope}</td>
                    <td style={{ ...td, wordBreak: "break-word" }}>{e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <style>{`
        @media (max-width: 1000px) { .adm-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 480px) { .adm-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </>,
  );
}
