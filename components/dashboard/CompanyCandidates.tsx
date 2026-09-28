"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Search, Send, ScanLine, Users } from "lucide-react";
import { GlassPanel, PanelTitle } from "./widgets";
import { Avatar, LoadingBlock, SmallButton, fieldStyle } from "./cards";
import { Badge } from "@/components/ui/primitives";
import { sendBulkMessage, type ScanRow, type ShortlistRow, type StudentRow, type InterviewInviteRow } from "@/lib/db";
import { downloadCsv, slugify } from "@/lib/csv";
import { fmtDateTime } from "@/lib/format";

type Stage = "all" | "undecided" | "interview" | ShortlistRow["status"];

const STAGE_LABEL: Record<Exclude<Stage, "all">, string> = {
  undecided: "Scanned, no decision",
  priority: "Priority",
  shortlisted: "Shortlisted",
  maybe: "Maybe",
  rejected: "Not a fit",
  interview: "Interview invited or booked",
};

const statusTone = (s?: string) =>
  s === "priority" ? "amber" : s === "shortlisted" ? "teal" : s === "maybe" ? "cyan" : "muted";

const inviteLabel = (i?: InterviewInviteRow) =>
  !i ? "" : i.status === "accepted" ? `Interview ${i.chosen_time ? fmtDateTime(i.chosen_time) : "booked"}` : "Interview invited";

const select: React.CSSProperties = { ...fieldStyle, height: 36, fontSize: 12.5, width: "auto", minWidth: 0, flex: "1 1 140px" };

/**
 * A company's candidates at one event: everyone it scanned or shortlisted.
 * Filters use only what a student chose to share (degree, year, skills,
 * target roles) plus the company's own stage. No scores are shown to employers.
 */
export default function CompanyCandidates({
  eventId, eventTitle, loading, students, shortlists, scans, invites,
}: {
  invites: InterviewInviteRow[];
  eventId: string;
  eventTitle: string;
  loading: boolean;
  students: StudentRow[];
  shortlists: ShortlistRow[];
  scans: ScanRow[];
}) {
  const [q, setQ] = useState("");
  const [degree, setDegree] = useState("all");
  const [year, setYear] = useState("all");
  const [skill, setSkill] = useState("all");
  const [role, setRole] = useState("all");
  const [stage, setStage] = useState<Stage>("all");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [composing, setComposing] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const slBy = useMemo(() => new Map(shortlists.map((s) => [s.student_id, s])), [shortlists]);
  const inviteBy = useMemo(
    () => new Map(invites.filter((i) => i.status === "pending" || i.status === "accepted").map((i) => [i.student_id, i])),
    [invites],
  );
  const firstScan = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of scans) {
      const id = s.scanned_profile_id;
      if (id && (!m.has(id) || s.created_at < m.get(id)!)) m.set(id, s.created_at);
    }
    return m;
  }, [scans]);

  const uniq = (xs: (string | number | null | undefined)[]) =>
    Array.from(new Set(xs.filter((x): x is string | number => x !== null && x !== undefined && x !== "").map(String))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const degrees = uniq(students.map((s) => s.degree));
  const years = uniq(students.map((s) => s.graduation_year));
  const skills = uniq(students.flatMap((s) => s.skills ?? []));
  const roles = uniq(students.flatMap((s) => s.target_roles ?? []));

  const needle = q.trim().toLowerCase();
  const shown = students.filter((s) => {
    const st = slBy.get(s.profile_id ?? "")?.status;
    return (
      (degree === "all" || s.degree === degree) &&
      (year === "all" || String(s.graduation_year) === year) &&
      (skill === "all" || (s.skills ?? []).includes(skill)) &&
      (role === "all" || (s.target_roles ?? []).includes(role)) &&
      (stage === "all" || (stage === "undecided" ? !st : stage === "interview" ? inviteBy.has(s.profile_id ?? "") : st === stage)) &&
      (!needle || [s.full_name, s.degree, s.university, ...(s.skills ?? []), ...(s.target_roles ?? [])].join(" ").toLowerCase().includes(needle))
    );
  });
  const shownIds = shown.map((s) => s.profile_id).filter((x): x is string => !!x);
  const pickedShown = shownIds.filter((id) => picked.has(id));
  const allPicked = shownIds.length > 0 && pickedShown.length === shownIds.length;
  const filtered = degree !== "all" || year !== "all" || skill !== "all" || role !== "all" || stage !== "all" || !!needle;

  function toggle(id: string) {
    setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  function exportCsv() {
    const abs = (u: string | null) => (u ? new URL(u, window.location.origin).href : "");
    downloadCsv(`gradlink-candidates-${slugify(eventTitle) || "event"}.csv`, [
      ["Name", "Email", "Degree", "University", "Graduation year", "Skills", "Target roles", "Stage", "Your notes", "Résumé", "LinkedIn", "Portfolio", "GitHub", "First scanned"],
      ...shown.map((s) => {
        const sl = slBy.get(s.profile_id ?? "");
        const scanned = firstScan.get(s.profile_id ?? "");
        return [
          s.full_name, s.email, s.degree ?? "", s.university ?? "", s.graduation_year ?? "", (s.skills ?? []).join("; "),
          (s.target_roles ?? []).join("; "),
          [sl ? STAGE_LABEL[sl.status] : STAGE_LABEL.undecided, inviteLabel(inviteBy.get(s.profile_id ?? ""))].filter(Boolean).join(", "),
          sl?.notes ?? "",
          abs(s.resume_url), s.linkedin_url ?? "", s.portfolio_url ?? "", s.github_url ?? "", scanned ? fmtDateTime(scanned) : "",
        ];
      }),
    ]);
  }

  async function send() {
    setSending(true);
    setResult(null);
    const res = await sendBulkMessage(eventId, pickedShown, message);
    setSending(false);
    if (!res.ok) { setResult({ tone: "error", text: res.error }); return; }
    setResult({ tone: "ok", text: `Sent to ${res.sent} ${res.sent === 1 ? "candidate" : "candidates"}.${res.skipped ? ` ${res.skipped} skipped (not scanned or shortlisted by you).` : ""}` });
    setMessage("");
    setComposing(false);
    setPicked(new Set());
  }

  return (
    <GlassPanel id="students" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "18px 22px 0" }}>
        <PanelTitle hint={filtered ? `${shown.length} of ${students.length}` : `${students.length} scanned or shortlisted`}>Candidates</PanelTitle>
      </div>

      {!loading && students.length > 0 && (
        <div style={{ padding: "0 22px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Search size={14} style={{ position: "absolute", left: 11, color: "var(--text-muted)" }} />
            <input aria-label="Search candidates" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, skill, degree or role"
              style={{ ...fieldStyle, height: 36, fontSize: 12.5, paddingLeft: 32 }} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select aria-label="Degree" value={degree} onChange={(e) => setDegree(e.target.value)} style={select}>
              <option value="all">Any degree</option>{degrees.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select aria-label="Graduation year" value={year} onChange={(e) => setYear(e.target.value)} style={select}>
              <option value="all">Any year</option>{years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select aria-label="Skill" value={skill} onChange={(e) => setSkill(e.target.value)} style={select}>
              <option value="all">Any skill</option>{skills.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <select aria-label="Target role" value={role} onChange={(e) => setRole(e.target.value)} style={select}>
              <option value="all">Any target role</option>{roles.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <select aria-label="Stage" value={stage} onChange={(e) => setStage(e.target.value as Stage)} style={select}>
              <option value="all">Any stage</option>
              {(Object.keys(STAGE_LABEL) as Exclude<Stage, "all">[]).map((k) => <option key={k} value={k}>{STAGE_LABEL[k]}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--text-2)", cursor: "pointer" }}>
              <input type="checkbox" checked={allPicked} onChange={() => setPicked(allPicked ? new Set() : new Set(shownIds))} />
              Select all shown
            </label>
            <span style={{ flex: 1 }} />
            <SmallButton icon={<Send size={13} />} disabled={!pickedShown.length} onClick={() => { setResult(null); setComposing(true); }}>
              Message selected ({pickedShown.length})
            </SmallButton>
            <SmallButton icon={<Download size={13} />} disabled={!shown.length} onClick={exportCsv}>Export CSV</SmallButton>
          </div>
          {composing && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-strong)", borderRadius: "var(--r-md)" }}>
              <textarea aria-label="Follow-up message" value={message} maxLength={5000} rows={3} onChange={(e) => setMessage(e.target.value)}
                placeholder="Thanks for stopping by our booth. Here are the next steps for the roles we discussed…"
                style={{ ...fieldStyle, height: "auto", padding: "10px 12px", resize: "vertical", fontFamily: "var(--font-body)" }} />
              <div style={{ display: "flex", gap: 8 }}>
                <SmallButton tone="primary" disabled={sending || !message.trim()} onClick={send}>
                  {sending ? "Sending…" : `Send to ${pickedShown.length}`}
                </SmallButton>
                <SmallButton onClick={() => setComposing(false)}>Cancel</SmallButton>
              </div>
              <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Each candidate gets it as a separate message in their inbox.</span>
            </div>
          )}
          {result && <p role="status" style={{ fontSize: 12.5, color: result.tone === "ok" ? "var(--text)" : "var(--danger)" }}>{result.text}</p>}
        </div>
      )}

      {loading ? (
        <LoadingBlock label="Loading candidates…" />
      ) : students.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "26px 24px 34px", textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: "var(--r-lg)", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-2)" }}><Users size={22} /></div>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text)" }}>No students scanned yet</div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 360, lineHeight: 1.55 }}>Open the scanner and scan a student&apos;s QR at your booth. They show up here with their skills, projects and résumé.</p>
          <Link href="/scan" style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 4, fontSize: 13, fontWeight: 600, color: "#0A0A0A", background: "var(--accent)", padding: "9px 16px", borderRadius: "var(--r-md)", textDecoration: "none" }}><ScanLine size={15} /> Open scanner</Link>
        </div>
      ) : shown.length === 0 ? (
        <p style={{ padding: "8px 22px 24px", fontSize: 13, color: "var(--text-muted)" }}>No candidates match these filters.</p>
      ) : (
        shown.map((s) => {
          const id = s.profile_id ?? "";
          const status = slBy.get(id)?.status;
          return (
            <div key={s.id} className="dash-row" style={{ display: "flex", gap: 12, alignItems: "center", padding: "14px 22px", borderTop: "1px solid var(--border)" }}>
              <input type="checkbox" aria-label={`Select ${s.full_name}`} checked={picked.has(id)} onChange={() => toggle(id)} />
              <Avatar name={s.full_name} size={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{s.full_name}</div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                  {[s.degree, s.graduation_year ? `Class of ${s.graduation_year}` : null, s.university].filter(Boolean).join(" · ")}
                </div>
                {(s.skills?.length || s.target_roles?.length) ? (
                  <div style={{ fontSize: 11.5, color: "var(--text-2)", marginTop: 3 }}>
                    {[s.target_roles?.length ? `Looking for ${s.target_roles.slice(0, 2).join(", ")}` : null, s.skills?.length ? s.skills.slice(0, 4).join(", ") : null].filter(Boolean).join(" · ")}
                  </div>
                ) : null}
              </div>
              {inviteBy.has(id) && <Badge tone="teal">{inviteLabel(inviteBy.get(id))}</Badge>}
              <Badge tone={statusTone(status) as "teal" | "cyan" | "amber" | "muted"}>{status ? STAGE_LABEL[status] : "Scanned"}</Badge>
              <Link href={`/scan/student/${id}?eventId=${eventId}`} style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", textDecoration: "none", whiteSpace: "nowrap" }}>View →</Link>
            </div>
          );
        })
      )}
    </GlassPanel>
  );
}
