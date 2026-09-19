"use client";

import { useEffect, useRef, useState } from "react";
import {
  FileText, Link as LinkIcon,
  Star, ThumbsDown, HelpCircle, Send, Check, Sparkles, Activity, AlertTriangle, Building2, CalendarCheck, Eye,
} from "lucide-react";
import ScanLayout from "./ScanLayout";
import ViewerGate from "./ViewerGate";
import { SectionCard, StatTile, FlagPill, ScoreRing, MeterBar, Avatar, TagRow, LoadingBlock, ErrorBlock } from "@/components/dashboard/cards";
import { Button } from "@/components/ui/primitives";
import { useSession } from "@/lib/session";
import {
  getStudentByProfile, getAnalytics, getScans, getShortlist, upsertShortlist, sendMessage,
  getRegisteredCompanies, recordScan, normalizeFeedback,
  type StudentRow, type AnalyticsRow, type ScanRow, type ShortlistRow, type CompanyRow,
} from "@/lib/db";
import { evaluateResume, scoreTone } from "@/lib/resume";
import GsapReveal from "@/components/anim/GsapReveal";

export default function StudentScanView({ studentProfileId, eventId }: { studentProfileId: string; eventId: string }) {
  const { session, ready } = useSession();
  const viewer = session?.role ?? null;

  const [student, setStudent] = useState<StudentRow | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsRow | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanRow[]>([]);
  const [, setShortlist] = useState<ShortlistRow | null>(null);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const scanned = useRef(false);

  // local action state
  const [status, setStatus] = useState<ShortlistRow["status"] | null>(null);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  function flash(t: string) { setToast(t); setTimeout(() => setToast(null), 2200); }

  useEffect(() => {
    if (!viewer || !studentProfileId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const s = await getStudentByProfile(studentProfileId);
      const a = await getAnalytics(studentProfileId, eventId);
      if (cancelled) return;
      setStudent(s);
      setAnalytics(a);

      if (viewer === "company" && session) {
        const sl = await getShortlist(session.profileId, studentProfileId, eventId);
        const hist = await getScans({ eventId, scannerProfileId: session.profileId, scannedProfileId: studentProfileId });
        if (!cancelled) { setShortlist(sl); setStatus(sl?.status ?? null); setNote(sl?.notes ?? ""); setScanHistory(hist); }
      } else if (viewer === "event_manager") {
        const hist = await getScans({ eventId, scannedProfileId: studentProfileId });
        const comps = await getRegisteredCompanies(eventId);
        if (!cancelled) { setScanHistory(hist); setCompanies(comps); }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [viewer, studentProfileId, eventId, session]);

  // record the scan once for company / manager viewers
  useEffect(() => {
    if (!viewer || !session || !student || scanned.current) return;
    if (viewer === "company" || viewer === "event_manager") {
      scanned.current = true;
      recordScan({
        eventId, scannerProfileId: session.profileId, scannedProfileId: studentProfileId,
        scannerRole: viewer, scannedRole: "student", scanContext: "qr",
      });
    }
  }, [viewer, session, student, studentProfileId, eventId]);

  if (!ready) return <div style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center" }}><LoadingBlock /></div>;
  if (!viewer) return <ViewerGate onPick={() => {}} hint="Choose your role to view this student profile the right way." />;

  return (
    <ScanLayout viewerRole={viewer}>
      {loading ? (
        <LoadingBlock label="Loading profile…" />
      ) : !student ? (
        <ErrorBlock title="Student not found" body="This QR code doesn't match a registered student for this event." />
      ) : (
        <GsapReveal style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <ProfileHeader student={student} checkedIn={true} />
          {viewer === "company" && (
            <CompanyView
              student={student} status={status} note={note} msg={msg} scanHistory={scanHistory}
              setNote={setNote} setMsg={setMsg}
              onStatus={async (st) => {
                setStatus(st);
                await upsertShortlist({ eventId, companyId: session!.profileId, studentId: studentProfileId, status: st, notes: note });
                flash(st === "rejected" ? "Marked as not a fit" : st === "maybe" ? "Marked as maybe" : "Shortlisted");
              }}
              onSaveNote={async () => {
                await upsertShortlist({ eventId, companyId: session!.profileId, studentId: studentProfileId, status: status ?? "maybe", notes: note });
                flash("Note saved");
              }}
              onSend={async () => {
                if (!msg.trim()) return;
                await sendMessage({ eventId, senderProfileId: session!.profileId, receiverProfileId: studentProfileId, message: msg.trim() });
                setMsg(""); flash("Message sent");
              }}
            />
          )}
          {viewer === "event_manager" && (
            <ManagerView student={student} analytics={analytics} scanHistory={scanHistory} companies={companies} />
          )}
          {viewer === "student" && (
            <SectionCard title="Student profile">
              <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.6 }}>{student.bio ?? "This is a fellow student's public profile."}</p>
              {student.skills?.length ? <div style={{ marginTop: 14 }}><TagRow items={student.skills} /></div> : null}
            </SectionCard>
          )}
        </GsapReveal>
      )}
      {toast && (
        <div style={{ position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)", zIndex: 50, display: "inline-flex", alignItems: "center", gap: 8, background: "var(--surface-elev)", border: "1px solid var(--border-strong)", borderRadius: "var(--r-full)", padding: "10px 18px", color: "var(--text)", fontSize: 13.5, fontWeight: 600, boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}>
          <Check size={15} color="var(--teal)" /> {toast}
        </div>
      )}
    </ScanLayout>
  );
}

function ProfileHeader({ student, checkedIn }: { student: StudentRow; checkedIn: boolean }) {
  return (
    <SectionCard accent="var(--border-strong)">
      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <Avatar name={student.full_name} size={60} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--text)" }}>{student.full_name}</h1>
          <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 2 }}>
            {[student.degree, student.graduation_year ? `Class of ${student.graduation_year}` : null, student.university].filter(Boolean).join(" · ")}
          </p>
        </div>
        {checkedIn && <FlagPill label="Checked in" tone="teal" icon={<CalendarCheck size={13} />} />}
      </div>
      {student.bio && <p style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.6, marginTop: 14 }}>{student.bio}</p>}
    </SectionCard>
  );
}

function ResumeScore({ student }: { student: StudentRow }) {
  const evalr = evaluateResume(student);
  const tone = scoreTone(evalr.score);
  return (
    <SectionCard title="AI resume score" right={<span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)" }}><Sparkles size={13} /> Auto-evaluated</span>}>
      <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
        <ScoreRing score={evalr.score} tone={tone} label="/ 100" />
        <div style={{ flex: 1, minWidth: 220 }}>
          <p style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.55, marginBottom: 12 }}>{evalr.summary}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {evalr.breakdown.map((b) => (
              <div key={b.label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--text-muted)", marginBottom: 4 }}>
                  <span>{b.label}</span><span>{Math.round(b.earned)}/{b.max}</span>
                </div>
                <MeterBar value={(b.earned / b.max) * 100} tone={tone} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="rs-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--teal)", marginBottom: 8 }}>Strengths</div>
          {evalr.strengths.map((s) => <Row key={s} icon={<Check size={13} color="var(--teal)" />} text={s} />)}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--amber)", marginBottom: 8 }}>Improvements</div>
          {evalr.improvements.map((s) => <Row key={s} icon={<AlertTriangle size={13} color="var(--amber)" />} text={s} />)}
        </div>
      </div>
      <style>{`@media (max-width:560px){.rs-2col{grid-template-columns:1fr !important}}`}</style>
    </SectionCard>
  );
}

function Row({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "5px 0" }}>
      <span style={{ marginTop: 2, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.45 }}>{text}</span>
    </div>
  );
}

function LinkBtn({ href, icon, label }: { href: string | null; icon: React.ReactNode; label: string }) {
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 600, color: "var(--text-2)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: "8px 13px", textDecoration: "none" }}>
      {icon} {label}
    </a>
  );
}

function CompanyView({
  student, status, note, msg, scanHistory, setNote, setMsg, onStatus, onSaveNote, onSend,
}: {
  student: StudentRow; status: ShortlistRow["status"] | null; note: string; msg: string; scanHistory: ScanRow[];
  setNote: (v: string) => void; setMsg: (v: string) => void;
  onStatus: (s: ShortlistRow["status"]) => void; onSaveNote: () => void; onSend: () => void;
}) {
  const actions: { key: ShortlistRow["status"]; label: string; icon: React.ReactNode; tone: string }[] = [
    { key: "shortlisted", label: "Shortlist", icon: <Star size={15} />, tone: "var(--teal)" },
    { key: "maybe", label: "Maybe", icon: <HelpCircle size={15} />, tone: "var(--amber)" },
    { key: "rejected", label: "Not a fit", icon: <ThumbsDown size={15} />, tone: "var(--danger)" },
  ];
  return (
    <>
      {student.skills?.length ? (
        <SectionCard title="Skills"><TagRow items={student.skills} /></SectionCard>
      ) : null}

      <ResumeScore student={student} />

      <SectionCard title="Decision">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {actions.map((a) => {
            const on = status === a.key;
            return (
              <button key={a.key} onClick={() => onStatus(a.key)}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "9px 15px", borderRadius: "var(--r-md)", color: on ? "#021016" : a.tone, background: on ? a.tone : "rgba(255,255,255,0.04)", border: `1px solid ${on ? a.tone : "var(--border)"}`, transition: "all 0.15s" }}>
                {a.icon} {a.label}
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 14 }}>
          <label style={{ fontSize: 12, color: "var(--text-2)", display: "block", marginBottom: 6 }}>Private notes</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="What stood out about this candidate…"
            style={{ width: "100%", resize: "vertical", fontSize: 13.5, color: "var(--text)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "10px 12px", outline: "none", fontFamily: "var(--font-body)" }} />
          <div style={{ marginTop: 8 }}><Button variant="secondary" onClick={onSaveNote} icon={<Check size={14} />}>Save note</Button></div>
        </div>
      </SectionCard>

      <SectionCard title="Resume & links">
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
          <LinkBtn href={student.resume_url} icon={<FileText size={14} />} label="View / download resume" />
          <LinkBtn href={student.portfolio_url} icon={<LinkIcon size={14} />} label="Portfolio" />
          <LinkBtn href={student.linkedin_url} icon={<LinkIcon size={14} />} label="LinkedIn" />
          <LinkBtn href={student.github_url} icon={<LinkIcon size={14} />} label="GitHub" />
          {!student.resume_url && !student.portfolio_url && !student.linkedin_url && !student.github_url && (
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>No links provided yet.</span>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Message candidate">
        <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} placeholder={`Message ${student.full_name.split(" ")[0]}…`}
          style={{ width: "100%", resize: "vertical", fontSize: 13.5, color: "var(--text)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "10px 12px", outline: "none", fontFamily: "var(--font-body)" }} />
        <div style={{ marginTop: 8 }}><Button variant="primary" onClick={onSend} icon={<Send size={14} />}>Send message</Button></div>
      </SectionCard>

      <SectionCard title="Your scan history" hint={`${scanHistory.length} with this candidate`}>
        {scanHistory.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>This is your first scan of this candidate.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {scanHistory.map((s) => (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)" }}>
                <span style={{ fontSize: 12.5, color: "var(--text-2)" }}>{s.scan_context ?? "scan"}{s.notes ? ` · ${s.notes}` : ""}</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date(s.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}

function ManagerView({ student, analytics, scanHistory, companies }: { student: StudentRow; analytics: AnalyticsRow | null; scanHistory: ScanRow[]; companies: CompanyRow[] }) {
  const a = analytics;
  const fb = normalizeFeedback(student.ai_feedback);
  const companyScans = a?.company_scans ?? 0;
  const engagement = a?.engagement_score ?? 0;
  const shortlists = a?.shortlists ?? 0;
  const resumeScore = a?.resume_score ?? student.resume_score ?? evaluateResume(student).score;

  // flags
  const flags: { label: string; tone: "teal" | "amber" | "cyan" | "danger" }[] = [];
  if (resumeScore < 60) flags.push({ label: "Needs resume improvement", tone: "danger" });
  if (engagement >= 75) flags.push({ label: "Highly active candidate", tone: "teal" });
  if (shortlists > 0) flags.push({ label: `Shortlisted by ${shortlists} ${shortlists === 1 ? "company" : "companies"}`, tone: "cyan" });
  if (companyScans === 0) flags.push({ label: "No company interaction yet", tone: "amber" });

  // recommend companies by skill overlap
  const skills = (student.skills ?? []).map((s) => s.toLowerCase());
  const recs = companies
    .map((c) => {
      const wanted = [...(c.skills_wanted ?? []), ...(c.hiring_roles ?? [])].map((x) => x.toLowerCase());
      const overlap = skills.filter((s) => wanted.some((w) => w.includes(s) || s.includes(w))).length;
      return { c, overlap };
    })
    .filter((x) => x.overlap > 0)
    .sort((x, y) => y.overlap - x.overlap)
    .slice(0, 3);

  const suggested =
    companyScans === 0 ? "Nudge this student to visit booths — no company has scanned them yet."
    : resumeScore < 60 ? "Recommend a resume clinic before more recruiter meetings."
    : engagement >= 75 ? "High performer — surface to top employers for fast-track interviews."
    : "On track. Encourage follow-ups with scanned companies.";

  return (
    <>
      {flags.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {flags.map((f) => <FlagPill key={f.label} label={f.label} tone={f.tone} icon={<Activity size={13} />} />)}
        </div>
      )}

      <SectionCard title="Event analytics">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }} className="mgr-stats">
          <StatTile label="Profile views" value={a?.profile_views ?? 0} />
          <StatTile label="Company scans" value={companyScans} accent />
          <StatTile label="Shortlists" value={shortlists} accent />
          <StatTile label="Messages" value={a?.messages_received ?? 0} />
          <StatTile label="Resume score" value={resumeScore} tone={scoreTone(resumeScore)} />
          <StatTile label="Engagement" value={engagement} suffix="/100" tone={engagement >= 75 ? "var(--teal)" : engagement >= 40 ? "var(--cyan)" : "var(--amber)"} />
        </div>
        <div style={{ marginTop: 14 }}><MeterBar value={engagement} tone="var(--teal)" /></div>
        <style>{`@media (max-width:560px){.mgr-stats{grid-template-columns:repeat(2,1fr) !important}}`}</style>
      </SectionCard>

      <SectionCard title="Suggested follow-up action" accent="rgba(247,201,72,0.25)" style={{ background: "rgba(247,201,72,0.05)" }}>
        <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.55 }}>{suggested}</p>
      </SectionCard>

      {recs.length > 0 && (
        <SectionCard title="Recommend sending to these companies">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recs.map(({ c, overlap }) => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 13px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
                  <Building2 size={15} color="var(--teal)" />
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{c.company_name ?? c.company}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>· Booth {c.booth_number}</span>
                </span>
                <FlagPill label={`${overlap} skill match${overlap === 1 ? "" : "es"}`} tone="teal" />
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {fb?.summary && (
        <SectionCard title="AI resume feedback" right={<span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)" }}><Sparkles size={13} /> AI</span>}>
          <p style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.6 }}>{fb.summary}</p>
        </SectionCard>
      )}

      <SectionCard title="Activity timeline" hint={`${scanHistory.length} interactions`}>
        {scanHistory.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No recorded activity yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {scanHistory.map((s, i) => (
              <div key={s.id} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--cyan)", marginTop: 5, boxShadow: "0 0 8px var(--cyan)" }} />
                  {i < scanHistory.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 22, background: "var(--border)" }} />}
                </div>
                <div style={{ paddingBottom: 14 }}>
                  <div style={{ fontSize: 13, color: "var(--text)" }}>
                    {s.scanner_role === "event_manager" ? "Check-in / manager scan" : "Scanned by a company"}
                    {s.scan_context ? ` · ${s.scan_context}` : ""}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <Eye size={11} /> {new Date(s.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}
