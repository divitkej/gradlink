"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, Check, Clock, MapPin, Users, CircleAlert, CheckCircle2 } from "lucide-react";
import { GlassPanel } from "./widgets";
import { SectionCard, LoadingBlock, SmallButton } from "./cards";
import { Badge } from "@/components/ui/primitives";
import { useSession } from "@/lib/session";
import { useStudentData } from "@/lib/use-student-data";
import {
  bookSession, cancelBooking, listSessions, saveCompany, SESSION_KIND_LABEL,
  type SessionRow, type SessionKind, type CompanyRow,
} from "@/lib/db";
import { fmtDay, fmtTime, sessionEnd, sessionPhase } from "@/lib/format";

const KINDS: SessionKind[] = ["workshop", "mock_interview", "company_session", "recruiter_slot", "networking", "talk"];

export default function StudentSchedule({ eventId }: { eventId: string }) {
  const { session } = useSession();
  const profileId = session?.profileId ?? "";
  const { data, loading, patch } = useStudentData(profileId, eventId);
  const [kind, setKind] = useState<SessionKind | "all">("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; text: string } | null>(null);

  if (loading || !data) return <GlassPanel><LoadingBlock label="Loading the schedule…" /></GlassPanel>;

  const refresh = async () => {
    const sessions = await listSessions(eventId);
    patch((d) => ({ ...d, sessions }));
  };

  async function act(s: SessionRow, action: "book" | "cancel") {
    setBusy(s.id);
    setError(null);
    if (action === "book") {
      const res = await bookSession(s.id);
      if (!res.ok) setError({ id: s.id, text: res.error });
    } else if (!(await cancelBooking(s.id))) {
      setError({ id: s.id, text: "Couldn't cancel. Please try again." });
    }
    await refresh();
    setBusy(null);
  }

  const mine = data.sessions.filter((s) => s.my_status && s.my_status !== "cancelled");
  const holding = mine.filter((s) => s.my_status === "booked" || s.my_status === "attended");
  /** Another session you hold a place in that overlaps this one. */
  const clash = (s: SessionRow) =>
    holding.find((o) => o.id !== s.id && new Date(o.starts_at).getTime() < sessionEnd(s) && new Date(s.starts_at).getTime() < sessionEnd(o));

  const available = KINDS.filter((k) => data.sessions.some((s) => s.kind === k));
  const list = data.sessions.filter((s) => kind === "all" || s.kind === kind);
  const days = new Map<string, SessionRow[]>();
  for (const s of list) {
    const key = new Date(s.starts_at).toDateString();
    days.set(key, [...(days.get(key) ?? []), s]);
  }

  const companies = new Map(data.companies.map((c) => [c.profile_id ?? c.id, c]));
  const plan = data.saved
    .filter((s) => s.saved && companies.has(s.company_id))
    .map((s) => ({ s, c: companies.get(s.company_id) as CompanyRow }))
    .sort((a, b) => (a.c.booth_number ?? "").localeCompare(b.c.booth_number ?? "", undefined, { numeric: true }));

  async function toggleVisited(companyId: string, visited: boolean) {
    const res = await saveCompany(eventId, companyId, { visited });
    if (res.ok) patch((d) => ({ ...d, saved: [...d.saved.filter((x) => x.company_id !== companyId), res.saved] }));
  }

  return (
    <div className="sched-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr)", gap: 20, alignItems: "start" }}>
      <SectionCard title="Event schedule" hint={`${data.sessions.length} ${data.sessions.length === 1 ? "session" : "sessions"}`}>
        {data.sessions.length === 0 ? (
          <Empty icon={<CalendarDays size={22} />} title="No sessions yet" body="Workshops, mock interviews and company sessions appear here once the organiser or companies publish them." />
        ) : (
          <>
            {available.length > 1 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }} role="group" aria-label="Filter by type">
                {(["all", ...available] as const).map((k) => (
                  <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k}
                    style={{ fontSize: 12, fontWeight: 600, padding: "6px 11px", borderRadius: "var(--r-sm)", cursor: "pointer", color: kind === k ? "#0A0A0A" : "var(--text-2)", background: kind === k ? "var(--accent)" : "rgba(255,255,255,0.03)", border: `1px solid ${kind === k ? "var(--accent)" : "var(--border)"}` }}>
                    {k === "all" ? "All" : SESSION_KIND_LABEL[k]}
                  </button>
                ))}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {Array.from(days.entries()).map(([day, sessions]) => (
                <div key={day}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>{fmtDay(sessions[0].starts_at)}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {sessions.map((s) => (
                      <SessionItem key={s.id} s={s} busy={busy === s.id} error={error?.id === s.id ? error.text : null} clash={clash(s)} onAct={(a) => act(s, a)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </SectionCard>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <SectionCard title="My event plan" hint={`${mine.length} ${mine.length === 1 ? "session" : "sessions"}`}>
          {mine.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55 }}>Sessions you book or wait for show up here in time order.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {mine.map((s) => (
                <div key={s.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)" }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", minWidth: 44, fontVariantNumeric: "tabular-nums", paddingTop: 1 }}>{fmtTime(s.starts_at)}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{s.title}</span>
                    <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)" }}>{[fmtDay(s.starts_at), s.location].filter(Boolean).join(" · ")}</span>
                  </span>
                  <StatusText s={s} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Companies to visit" hint={`${plan.filter((p) => p.s.visited).length} of ${plan.length} visited`}>
          {plan.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55 }}>
              Save companies from your <Link href="/dashboard/student#companies" style={{ color: "var(--text)" }}>matched companies</Link> and they are listed here by booth.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {plan.map(({ s, c }) => (
                <div key={s.company_id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)" }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <Link href={`/scan/company/${s.company_id}?eventId=${eventId}`} style={{ display: "block", fontSize: 13, fontWeight: 600, color: s.visited ? "var(--text-2)" : "var(--text)", textDecoration: "none" }}>{c.company_name ?? c.company ?? c.full_name}</Link>
                    <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)" }}>{c.booth_number ? `Booth ${c.booth_number}` : "Booth not set"}{s.note ? ` · ${s.note}` : ""}</span>
                  </span>
                  <SmallButton onClick={() => toggleVisited(s.company_id, !s.visited)} tone={s.visited ? "primary" : "default"} icon={s.visited ? <Check size={13} /> : undefined}>
                    {s.visited ? "Visited" : "Mark visited"}
                  </SmallButton>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <style>{`@media (max-width: 960px) { .sched-grid { grid-template-columns: minmax(0, 1fr) !important; } }`}</style>
    </div>
  );
}

function StatusText({ s }: { s: SessionRow }) {
  const map = {
    booked: { t: "Booked", c: "var(--accent)" },
    attended: { t: "Attended", c: "var(--accent)" },
    waitlisted: { t: `Waitlist #${s.my_waitlist_position ?? "?"}`, c: "var(--amber)" },
    cancelled: { t: "", c: "" },
  } as const;
  const m = s.my_status ? map[s.my_status] : null;
  return m ? <span style={{ fontSize: 11.5, fontWeight: 600, color: m.c, flexShrink: 0 }}>{m.t}</span> : null;
}

function SessionItem({ s, busy, error, clash, onAct }: {
  s: SessionRow; busy: boolean; error: string | null; clash?: SessionRow; onAct: (a: "book" | "cancel") => void;
}) {
  const phase = sessionPhase(s);
  const full = s.capacity !== null && s.booked_count >= s.capacity;
  const host = s.host_org || s.host_name;
  const places = s.capacity === null
    ? `${s.booked_count} booked`
    : full
      ? `Full${s.waitlist_count ? ` · ${s.waitlist_count} waiting` : ""}`
      : `${s.capacity - s.booked_count} of ${s.capacity} places left`;

  let action: React.ReactNode = null;
  if (s.my_status === "attended") {
    action = <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600, color: "var(--accent)" }}><CheckCircle2 size={14} /> Attended</span>;
  } else if (phase === "ended") {
    action = <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Finished</span>;
  } else if (s.my_status === "booked") {
    action = <SmallButton onClick={() => onAct("cancel")} disabled={busy}>{busy ? "Cancelling…" : "Cancel booking"}</SmallButton>;
  } else if (s.my_status === "waitlisted") {
    action = <SmallButton onClick={() => onAct("cancel")} disabled={busy}>{busy ? "Leaving…" : "Leave waitlist"}</SmallButton>;
  } else {
    action = <SmallButton tone="primary" onClick={() => onAct("book")} disabled={busy}>{busy ? "Booking…" : full ? "Join waitlist" : "Book"}</SmallButton>;
  }

  return (
    <div style={{ padding: "12px 14px", background: s.my_status === "booked" || s.my_status === "attended" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${s.my_status === "booked" ? "var(--border-strong)" : "var(--border)"}`, borderRadius: "var(--r-md)", opacity: phase === "ended" && s.my_status !== "attended" ? 0.6 : 1 }}>
      <div className="sess-row" style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ minWidth: 92, fontSize: 12.5, color: "var(--text-2)", fontVariantNumeric: "tabular-nums", paddingTop: 1 }}>
          {fmtTime(s.starts_at)}{s.ends_at ? ` to ${fmtTime(s.ends_at)}` : ""}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{s.title}</span>
            {phase === "live" && <Badge tone="amber" pulse>Live now</Badge>}
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
            <span>{SESSION_KIND_LABEL[s.kind]}{host ? ` · ${host}` : ""}</span>
            {s.location && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><MapPin size={11} /> {s.location}</span>}
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Users size={11} /> {places}</span>
          </div>
          {s.description && <p style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.5, marginTop: 6 }}>{s.description}</p>}
          {s.my_status === "waitlisted" && (
            <p style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--amber)", marginTop: 6 }}>
              <Clock size={12} /> You are number {s.my_waitlist_position} on the waitlist. You get the place automatically if one frees up.
            </p>
          )}
          {clash && s.my_status !== "attended" && phase !== "ended" && (
            <p style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-2)", marginTop: 6 }}>
              <CircleAlert size={12} /> Overlaps with {clash.title} at {fmtTime(clash.starts_at)}
            </p>
          )}
          {error && <p role="alert" style={{ fontSize: 12, color: "var(--danger)", marginTop: 6 }}>{error}</p>}
        </div>
        <div className="sess-action" style={{ flexShrink: 0 }}>{action}</div>
      </div>
      <style>{`@media (max-width: 560px) { .sess-row { flex-wrap: wrap; } .sess-action { width: 100%; } }`}</style>
    </div>
  );
}

function Empty({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "28px 16px", textAlign: "center" }}>
      <div style={{ width: 46, height: 46, borderRadius: "var(--r-lg)", background: "rgba(255,255,255,0.06)", border: "1px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>{icon}</div>
      <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text)" }}>{title}</div>
      <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 380, lineHeight: 1.55 }}>{body}</p>
    </div>
  );
}
