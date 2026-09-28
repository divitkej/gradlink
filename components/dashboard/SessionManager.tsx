"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Plus, Trash2, Users } from "lucide-react";
import { SectionCard, LoadingBlock, SmallButton, Labeled, fieldStyle as field } from "./cards";
import {
  listSessions, createSession, deleteSession, listSessionBookings, markAttendance, SESSION_KIND_LABEL,
  type SessionRow, type SessionKind, type SessionBookingRow,
} from "@/lib/db";
import type { AppRole } from "@/lib/session";
import { fmtDay, fmtTime, fromLocalInput } from "@/lib/format";

const ALL_KINDS: SessionKind[] = ["workshop", "mock_interview", "company_session", "recruiter_slot", "networking", "talk"];
const COMPANY_KINDS: SessionKind[] = ["company_session", "recruiter_slot", "mock_interview"];


/**
 * Where organisers publish the event's sessions and companies add their own
 * sessions and 1:1 slots. Hosts see who booked and mark who attended, which is
 * what students' passports and engagement scores count.
 */
export default function SessionManager({ eventId, role, myId, isOwner }: { eventId: string; role: AppRole; myId: string; isOwner: boolean }) {
  const kinds = isOwner ? ALL_KINDS : COMPANY_KINDS;
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [form, setForm] = useState({ kind: kinds[0], title: "", description: "", location: "", start: "", end: "", capacity: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const [version, setVersion] = useState(0);
  const load = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    let cancelled = false;
    listSessions(eventId).then((rows) => { if (!cancelled) setSessions(rows); });
    return () => { cancelled = true; };
  }, [eventId, version]);

  const canAdd = isOwner || role === "company";

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await createSession({
      eventId, kind: form.kind, title: form.title, description: form.description, location: form.location,
      startsAt: fromLocalInput(form.start) ?? "", endsAt: fromLocalInput(form.end),
      capacity: form.capacity ? Number(form.capacity) : null,
    });
    setSaving(false);
    if (!res.ok) { setError(res.error); return; }
    setForm({ ...form, title: "", description: "", start: "", end: "", capacity: "" });
    load();
  }

  async function remove(s: SessionRow) {
    const booked = s.booked_count + s.waitlist_count;
    if (!window.confirm(`Delete "${s.title}"?${booked ? ` ${booked} student${booked === 1 ? " has" : "s have"} booked it.` : ""}`)) return;
    if (await deleteSession(s.id)) load();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {canAdd && (
        <SectionCard title="Add a session" hint={isOwner ? "Workshops, mock interviews, talks and more" : "Company sessions, mock interviews and 1:1 slots"}>
          <form onSubmit={add} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="sm-form" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Labeled label="Type">
                <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as SessionKind })} style={field}>
                  {kinds.map((k) => <option key={k} value={k}>{SESSION_KIND_LABEL[k]}</option>)}
                </select>
              </Labeled>
              <Labeled label="Title">
                <input required value={form.title} maxLength={200} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Resume Workshop" style={field} />
              </Labeled>
              <Labeled label="Starts">
                <input required type="datetime-local" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} style={field} />
              </Labeled>
              <Labeled label="Ends (optional)">
                <input type="datetime-local" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} style={field} />
              </Labeled>
              <Labeled label="Room or booth (optional)">
                <input value={form.location} maxLength={200} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Hall B" style={field} />
              </Labeled>
              <Labeled label={form.kind === "recruiter_slot" ? "Places (1 if left empty)" : "Places (empty for no limit)"}>
                <input type="number" min={1} max={10000} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} style={field} />
              </Labeled>
            </div>
            <Labeled label="Description (optional)">
              <textarea value={form.description} maxLength={1000} rows={2} onChange={(e) => setForm({ ...form, description: e.target.value })}
                style={{ ...field, height: "auto", padding: "10px 12px", resize: "vertical", fontFamily: "var(--font-body)" }} />
            </Labeled>
            {error && <p role="alert" style={{ fontSize: 12.5, color: "var(--danger)" }}>{error}</p>}
            <div><SmallButton type="submit" tone="primary" icon={<Plus size={14} />} disabled={saving}>{saving ? "Adding…" : "Add session"}</SmallButton></div>
          </form>
        </SectionCard>
      )}

      <SectionCard title="Sessions" hint={sessions ? `${sessions.length} published` : undefined}>
        {!sessions ? (
          <LoadingBlock label="Loading sessions…" />
        ) : sessions.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No sessions yet. Students see them on their schedule as soon as they are added.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sessions.map((s) => {
              const manage = isOwner || s.host_profile_id === myId;
              const isOpen = open === s.id;
              return (
                <div key={s.id} style={{ padding: "12px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-md)" }}>
                  <div className="sm-row" style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{s.title}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                        {[SESSION_KIND_LABEL[s.kind], `${fmtDay(s.starts_at)}, ${fmtTime(s.starts_at)}${s.ends_at ? ` to ${fmtTime(s.ends_at)}` : ""}`, s.location, s.host_org || s.host_name].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <span style={{ fontSize: 12.5, color: "var(--text-2)", whiteSpace: "nowrap" }}>
                      {s.booked_count}{s.capacity ? ` / ${s.capacity}` : ""} booked{s.waitlist_count ? ` · ${s.waitlist_count} waiting` : ""}
                    </span>
                    {manage && (
                      <>
                        <SmallButton icon={<Users size={13} />} onClick={() => setOpen(isOpen ? null : s.id)}>
                          Attendees <ChevronDown size={13} style={{ transform: isOpen ? "rotate(180deg)" : "none" }} />
                        </SmallButton>
                        <SmallButton tone="danger" ariaLabel={`Delete ${s.title}`} icon={<Trash2 size={13} />} onClick={() => remove(s)}>Delete</SmallButton>
                      </>
                    )}
                  </div>
                  {isOpen && <Attendees sessionId={s.id} onChange={load} />}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
      <style>{`
        @media (max-width: 720px) { .sm-form { grid-template-columns: 1fr !important; } }
        @media (max-width: 640px) { .sm-row { flex-wrap: wrap; } }
      `}</style>
    </div>
  );
}

function Attendees({ sessionId, onChange }: { sessionId: string; onChange: () => void }) {
  const [rows, setRows] = useState<SessionBookingRow[] | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let cancelled = false;
    listSessionBookings(sessionId).then((r) => { if (!cancelled) setRows(r); });
    return () => { cancelled = true; };
  }, [sessionId, version]);

  async function toggle(r: SessionBookingRow) {
    if (await markAttendance(sessionId, r.profile_id, r.status !== "attended")) { setVersion((v) => v + 1); onChange(); }
  }

  if (!rows) return <LoadingBlock label="Loading attendees…" />;
  if (!rows.length) return <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 10 }}>Nobody has booked yet.</p>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
      {rows.map((r) => (
        <div key={r.profile_id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--text)" }}>
            {r.full_name}
            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{[r.degree, r.university].filter(Boolean).length ? ` · ${[r.degree, r.university].filter(Boolean).join(" · ")}` : ""}</span>
          </span>
          <span style={{ fontSize: 12, color: r.status === "waitlisted" ? "var(--amber)" : "var(--text-2)" }}>{r.status === "waitlisted" ? "Waitlist" : r.status === "attended" ? "Attended" : "Booked"}</span>
          <SmallButton tone={r.status === "attended" ? "primary" : "default"} onClick={() => toggle(r)}>
            {r.status === "attended" ? "Undo" : "Mark attended"}
          </SmallButton>
        </div>
      ))}
    </div>
  );
}

