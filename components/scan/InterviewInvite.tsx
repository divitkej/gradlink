"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, Plus, X } from "lucide-react";
import { SectionCard, SmallButton, Labeled, fieldStyle } from "@/components/dashboard/cards";
import {
  getCompanyByProfile, listInterviewInvitesForCompany, sendInterviewInvite, cancelInterviewInvite,
  type InterviewInviteRow,
} from "@/lib/db";
import { fmtDateTimeZoned, fromLocalInput } from "@/lib/format";

/**
 * A company inviting a student it met to interview. The student picks one of
 * the proposed times on their applications page, which books it for them.
 */
export default function InterviewInvite({ eventId, companyId, studentId, firstName }: {
  eventId: string; companyId: string; studentId: string; firstName: string;
}) {
  const [invite, setInvite] = useState<InterviewInviteRow | null | undefined>(undefined);
  const [roles, setRoles] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState("");
  const [times, setTimes] = useState<string[]>([""]);
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listInterviewInvitesForCompany(eventId), getCompanyByProfile(companyId)]).then(([list, me]) => {
      if (cancelled) return;
      setInvite(list.find((i) => i.student_id === studentId && i.status !== "cancelled") ?? null);
      setRoles(me?.hiring_roles ?? []);
    });
    return () => { cancelled = true; };
  }, [eventId, companyId, studentId, version]);

  async function send() {
    setBusy(true);
    setError(null);
    const res = await sendInterviewInvite({
      eventId, studentId, roleTitle: role, location, message,
      proposedTimes: times.map((t) => fromLocalInput(t)).filter((t): t is string => !!t),
    });
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setOpen(false);
    setVersion((v) => v + 1);
  }

  async function cancel() {
    if (!invite || !window.confirm(`Cancel the ${invite.role_title} interview with ${firstName}? They will be told.`)) return;
    await cancelInterviewInvite(invite.id);
    setVersion((v) => v + 1);
  }

  if (invite === undefined) return null;

  const live = invite && (invite.status === "pending" || invite.status === "accepted");
  return (
    <SectionCard title="Interview">
      {live ? (
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <CalendarCheck size={17} color="var(--accent)" />
          <span style={{ flex: 1, minWidth: 200, fontSize: 13.5, color: "var(--text)" }}>
            {invite.status === "pending"
              ? <>Invite sent for <strong>{invite.role_title}</strong>. Waiting for {firstName} to pick a time.</>
              : <>Interview booked for <strong>{invite.role_title}</strong>{invite.chosen_time ? `, ${fmtDateTimeZoned(invite.chosen_time)}` : ""}.</>}
          </span>
          <SmallButton tone="danger" onClick={cancel}>Cancel interview</SmallButton>
        </div>
      ) : !open ? (
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          {invite?.status === "declined" && <span style={{ fontSize: 13, color: "var(--text-2)" }}>{firstName} declined the last invite ({invite.role_title}).</span>}
          <SmallButton tone="primary" icon={<CalendarCheck size={13} />} onClick={() => { setError(null); setOpen(true); }}>Invite to interview</SmallButton>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Labeled label="Role">
            <input value={role} maxLength={200} list="invite-roles" onChange={(e) => setRole(e.target.value)} placeholder="Business Analyst" style={fieldStyle} />
            <datalist id="invite-roles">{roles.map((r) => <option key={r} value={r} />)}</datalist>
          </Labeled>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, color: "var(--text-2)" }}>Proposed times ({firstName} picks one)</span>
            {times.map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 8 }}>
                <input type="datetime-local" aria-label={`Proposed time ${i + 1}`} value={t} onChange={(e) => setTimes(times.map((x, j) => (j === i ? e.target.value : x)))} style={fieldStyle} />
                {times.length > 1 && (
                  <button type="button" aria-label={`Remove time ${i + 1}`} onClick={() => setTimes(times.filter((_, j) => j !== i))}
                    style={{ width: 40, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", color: "var(--text-2)", cursor: "pointer" }}>
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
            {times.length < 5 && <div><SmallButton icon={<Plus size={13} />} onClick={() => setTimes([...times, ""])}>Add another time</SmallButton></div>}
          </div>
          <Labeled label="Where (room, booth or video link)">
            <input value={location} maxLength={300} onChange={(e) => setLocation(e.target.value)} placeholder="Booth 12, or a video call link" style={fieldStyle} />
          </Labeled>
          <Labeled label="Message (optional)">
            <textarea value={message} maxLength={2000} rows={2} onChange={(e) => setMessage(e.target.value)} placeholder="What the interview covers and who they will meet"
              style={{ ...fieldStyle, height: "auto", padding: "10px 12px", resize: "vertical", fontFamily: "var(--font-body)" }} />
          </Labeled>
          {error && <p role="alert" style={{ fontSize: 12.5, color: "var(--danger)" }}>{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <SmallButton tone="primary" disabled={busy || !role.trim()} onClick={send}>{busy ? "Sending…" : "Send invite"}</SmallButton>
            <SmallButton onClick={() => setOpen(false)}>Cancel</SmallButton>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
