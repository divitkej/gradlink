"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  Sparkles, AlertTriangle, ScanLine, Building2, History, CalendarClock, Stamp, Briefcase, Award, Bookmark, BookmarkCheck, ArrowRight,
  Users, CalendarCheck,
} from "lucide-react";
import { GlassPanel, PanelTitle, StatCard } from "./widgets";
import { SectionCard, ScoreRing, LoadingBlock, SmallButton } from "./cards";
import { Badge, Meter } from "@/components/ui/primitives";
import { Reveal } from "@/components/anim/primitives";
import QRCard from "./QRCard";
import Checklist from "./Checklist";
import ManualSection from "./ManualSection";
import StudentReadiness from "./StudentReadiness";
import { useSession } from "@/lib/session";
import { useActiveEvent } from "@/lib/use-active-event";
import { useStudentData, activityOf } from "@/lib/use-student-data";
import { saveCompany, type StudentRow } from "@/lib/db";
import { evaluateResume, scoreTone } from "@/lib/resume";
import { competencies, readiness as readinessOf, actionPlan, fairReady as fairReadyOf, matchCompanies } from "@/lib/readiness";
import { fmtDay, fmtTime, sessionPhase } from "@/lib/format";

export default function StudentDashboard({ eventId }: { eventId: string }) {
  const { session } = useSession();
  const { event } = useActiveEvent();
  const profileId = session?.profileId ?? "";
  const firstName = session?.name?.split(" ")[0] ?? "there";
  const { data, loading, patch } = useStudentData(profileId, eventId);
  const [liveChecklist, setLiveChecklist] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const onChecklist = useCallback((pct: number) => setLiveChecklist(pct), []);

  if (loading || !data) {
    return <GlassPanel><LoadingBlock label="Loading your dashboard…" /></GlassPanel>;
  }

  const me: Partial<StudentRow> = data.me ?? {};
  const activity = { ...activityOf(data, profileId), checklistPct: liveChecklist ?? data.checklistPct };
  const comps = competencies(me, activity);
  const rd = readinessOf(me, activity, comps);
  const plan = actionPlan(me, activity);
  const fr = fairReadyOf(plan);
  const evalr = evaluateResume(me);
  const tone = scoreTone(evalr.score);

  const eventDate = event?.start_date
    ? new Date(event.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : null;
  const eventLabel = [event?.title ?? "Your event", eventDate].filter(Boolean).join(" · ");

  const booked = data.sessions
    .filter((s) => (s.my_status === "booked" || s.my_status === "waitlisted") && sessionPhase(s) !== "ended")
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const next = booked.find((s) => s.my_status === "booked") ?? booked[0];
  const upcoming = data.sessions.filter((s) => sessionPhase(s) !== "ended").length;

  const pendingInvites = data.invites.filter((i) => i.status === "pending");
  const called = data.queues.filter((q) => q.status === "called");
  const savedMap = new Map(data.saved.map((s) => [s.company_id, s]));
  const matches = matchCompanies(me, data.companies);
  const shown = showAll ? matches : matches.slice(0, 6);

  async function toggleSave(companyId: string) {
    setSaveError(null);
    const current = savedMap.get(companyId)?.saved ?? false;
    const res = await saveCompany(eventId, companyId, { saved: !current });
    if (!res.ok) { setSaveError(res.error); return; }
    patch((d) => ({ ...d, saved: [...d.saved.filter((s) => s.company_id !== companyId), res.saved] }));
  }

  const scannerLabel = (id: string | null) => {
    const n = id ? data.names[id] : undefined;
    return n?.org || n?.name || "A company";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Hero + QR */}
      <div className="dash-2col" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>
        <Reveal>
          <GlassPanel style={{ border: "1px solid var(--border-strong)", height: "100%" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <Badge tone="cyan">{eventLabel}</Badge>
              {fr.ready && <Badge tone="teal"><Award size={12} /> Fair-Ready</Badge>}
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px,3vw,32px)", fontWeight: 700, color: "var(--text)", margin: "14px 0 6px", letterSpacing: "-0.02em" }}>
              Welcome back, {firstName}.
            </h2>
            <p style={{ fontSize: 15, color: "var(--text-2)", marginBottom: 22 }}>
              {fr.ready
                ? <>You are <strong style={{ color: "var(--text)" }}>Fair-Ready</strong>. Keep booking sessions and saving companies to raise your readiness.</>
                : <>{fr.remaining} required {fr.remaining === 1 ? "step" : "steps"} left before you are <strong style={{ color: "var(--text)" }}>Fair-Ready</strong>. Your action plan below shows which.</>}
            </p>
            <div className="dash-stats" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
              <StatCard label="Career readiness" value={rd.score} suffix="%" delay={0.05} />
              <StatCard label="Résumé score" value={evalr.score} suffix="%" accent delay={0.1} />
              <StatCard label="Profile complete" value={rd.profile} suffix="%" delay={0.15} />
            </div>
            <Link href="/dashboard/student/schedule" className="dash-next" style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", textDecoration: "none" }}>
              <CalendarClock size={18} color="var(--accent)" />
              <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--text-2)" }}>
                {next
                  ? <>Up next: <strong style={{ color: "var(--text)" }}>{next.title}</strong> · {fmtDay(next.starts_at)}, {fmtTime(next.starts_at)}{next.location ? ` · ${next.location}` : ""}{next.my_status === "waitlisted" ? " · waitlisted" : ""}</>
                  : upcoming
                    ? <>{upcoming} upcoming {upcoming === 1 ? "session is" : "sessions are"} on the schedule. Open it to book a place.</>
                    : <>No upcoming sessions on the schedule yet.</>}
              </span>
              <ArrowRight size={15} color="var(--text-muted)" />
            </Link>
          </GlassPanel>
        </Reveal>

        <Reveal delay={0.1}>
          <GlassPanel id="qr" style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <PanelTitle>My QR</PanelTitle>
            <QRCard
              payload={`/scan/student/${profileId}?eventId=${eventId}`}
              caption={session?.name ?? "Your profile"}
              sub={session?.org ?? data.me?.university ?? ""}
              accent="var(--accent)"
              filename="gradlink-student-qr"
            />
          </GlassPanel>
        </Reveal>
      </div>

      {/* Things that need the student now */}
      {(pendingInvites.length > 0 || called.length > 0) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }} role="region" aria-label="Needs your attention">
          {called.map((q) => (
            <Link key={q.company_id} href="/dashboard/student/schedule" className="dash-next" style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "rgba(255,255,255,0.08)", border: "1px solid var(--border-strong)", borderRadius: "var(--r-md)", textDecoration: "none" }}>
              <Users size={18} color="var(--accent)" />
              <span style={{ flex: 1, fontSize: 13.5, color: "var(--text)" }}>
                <strong>It&apos;s your turn at {q.company_name}.</strong> {q.booth_number ? `Head to booth ${q.booth_number} now.` : "Head to their booth now."}
              </span>
              <ArrowRight size={15} color="var(--text-muted)" />
            </Link>
          ))}
          {pendingInvites.map((i) => (
            <Link key={i.id} href="/dashboard/student/applications" className="dash-next" style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "rgba(255,255,255,0.08)", border: "1px solid var(--border-strong)", borderRadius: "var(--r-md)", textDecoration: "none" }}>
              <CalendarCheck size={18} color="var(--accent)" />
              <span style={{ flex: 1, fontSize: 13.5, color: "var(--text)" }}>
                <strong>{i.company_name} invited you to interview</strong> for {i.role_title}. Pick a time.
              </span>
              <ArrowRight size={15} color="var(--text-muted)" />
            </Link>
          ))}
        </div>
      )}

      {/* Shortcuts to the other student pages */}
      <div className="dash-shortcuts" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <Shortcut href="/dashboard/student/schedule" icon={<CalendarClock size={17} />} title="Schedule and plan" sub={`${booked.length} booked · ${data.saved.filter((s) => s.saved).length} companies saved`} />
        <Shortcut href="/dashboard/student/passport" icon={<Stamp size={17} />} title="Digital passport" sub={data.insights?.me ? `Engagement ${data.insights.me.score}/100 · rank ${data.insights.me.rank} of ${data.insights.total}` : "Your event journey"} />
        <Shortcut href="/dashboard/student/applications" icon={<Briefcase size={17} />} title="Applications" sub={pendingInvites.length ? `${pendingInvites.length} interview ${pendingInvites.length === 1 ? "invite" : "invites"} waiting` : "Track interviews and offers"} />
      </div>

      <StudentReadiness comps={comps} plan={plan} readiness={rd} fairReady={fr} />

      {/* Checklist + Résumé check */}
      <div className="dash-2col" id="checklist" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Checklist role="student" profileId={profileId} eventId={eventId} onProgress={onChecklist} />

        <SectionCard
          title="Résumé check"
          right={<span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)" }}><Sparkles size={13} /> Rule-based</span>}
        >
          <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
            <ScoreRing score={evalr.score} tone={tone} label="/ 100" />
            <div style={{ flex: 1, minWidth: 180 }}>
              <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5, marginBottom: 10 }}>{evalr.summary}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {evalr.breakdown.map((b) => (
                  <div key={b.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginBottom: 3 }}>
                      <span>{b.label}</span><span>{Math.round(b.earned)}/{b.max}</span>
                    </div>
                    <Meter value={(b.earned / b.max) * 100} tone={tone} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
              <Sparkles size={15} color="var(--amber)" />
              <span style={{ fontFamily: "var(--font-display)", fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>To improve</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {evalr.improvements.slice(0, 4).map((s) => (
                <div key={s} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <AlertTriangle size={13} color="var(--amber)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.45 }}>{s}</span>
                </div>
              ))}
            </div>
            <Link href="/dashboard/profile" style={{ display: "inline-block", marginTop: 12, fontSize: 12.5, fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}>Edit career profile →</Link>
          </div>
        </SectionCard>
      </div>

      {/* Matched companies */}
      <GlassPanel id="companies">
        <PanelTitle hint={(me.skills?.length || me.target_roles?.length) ? "Matched on your skills and target roles" : "Add skills and target roles for matches"}>
          Matched companies
        </PanelTitle>
        {saveError && <p role="alert" style={{ fontSize: 12.5, color: "var(--danger)", marginBottom: 10 }}>{saveError}</p>}
        {matches.length === 0 ? (
          <p style={{ fontSize: 13.5, color: "var(--text-muted)" }}>No companies registered yet.</p>
        ) : (
          <>
            <div className="dash-companies" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {shown.map(({ company: c, score, skills, roles }) => {
                const id = c.profile_id ?? c.id;
                const isSaved = savedMap.get(id)?.saved ?? false;
                return (
                  <div key={c.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <Link href={`/scan/company/${id}?eventId=${eventId}`} style={{ fontFamily: "var(--font-display)", fontSize: 14.5, fontWeight: 700, color: "var(--text)", textDecoration: "none" }}>
                        {c.company_name ?? c.company ?? c.full_name}
                      </Link>
                      {score !== null && <span style={{ fontSize: 12.5, fontWeight: 700, color: score >= 60 ? "var(--accent)" : "var(--text-2)", flexShrink: 0 }}>{score}% match</span>}
                    </div>
                    <p style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.5 }}>
                      {[c.sector, c.booth_number ? `Booth ${c.booth_number}` : null, `${(c.hiring_roles ?? []).length} open roles`].filter(Boolean).join(" · ")}
                    </p>
                    <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.5, flex: 1 }}>
                      {skills.length || roles.length
                        ? [skills.length ? `Skills: ${skills.slice(0, 3).join(", ")}` : null, roles.length ? `Hiring: ${roles.slice(0, 2).join(", ")}` : null].filter(Boolean).join(" · ")
                        : score === null ? "Hasn't listed skills or roles yet" : "No overlap with your profile yet"}
                    </p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <SmallButton onClick={() => toggleSave(id)} icon={isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />} tone={isSaved ? "primary" : "default"}>
                        {isSaved ? "In your plan" : "Save to plan"}
                      </SmallButton>
                      <Link href={`/scan/company/${id}?eventId=${eventId}`} style={{ display: "inline-flex", alignItems: "center", height: 34, padding: "0 10px", fontSize: 12.5, fontWeight: 600, color: "var(--text-2)", textDecoration: "none" }}>View</Link>
                    </div>
                  </div>
                );
              })}
            </div>
            {matches.length > 6 && (
              <div style={{ marginTop: 14 }}>
                <SmallButton onClick={() => setShowAll((v) => !v)}>{showAll ? "Show fewer" : `Show all ${matches.length} companies`}</SmallButton>
              </div>
            )}
          </>
        )}
      </GlassPanel>

      {/* Who scanned me */}
      <GlassPanel style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "18px 22px 4px" }}>
          <PanelTitle hint={`${data.scansIn.length} scans · ${data.shortlists.filter((s) => s.status === "shortlisted" || s.status === "priority").length} shortlists`}>Recruiter activity</PanelTitle>
        </div>
        {data.scansIn.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "30px 24px 36px", textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: "var(--r-lg)", background: "rgba(255,255,255,0.08)", border: "1px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
              <ScanLine size={22} />
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text)" }}>No scans yet</div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 360, lineHeight: 1.55 }}>
              Show your QR at company booths. When a recruiter scans you, they appear here.
            </p>
            <Link href="/dashboard/student#qr" style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 4, fontSize: 13, fontWeight: 600, color: "#0A0A0A", background: "var(--accent)", padding: "9px 16px", borderRadius: "var(--r-md)", textDecoration: "none" }}>
              <ScanLine size={15} /> Open my QR
            </Link>
          </div>
        ) : (
          data.scansIn.map((s) => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "13px 22px", borderTop: "1px solid var(--border)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                {s.scanner_role === "company" ? <Building2 size={15} color="var(--accent-2)" style={{ flexShrink: 0 }} /> : <History size={15} color="var(--accent)" style={{ flexShrink: 0 }} />}
                <span style={{ fontSize: 13, color: "var(--text-2)" }}>
                  {s.scanner_role === "company" ? `${scannerLabel(s.scanner_profile_id)} scanned your profile` : "Checked in by the event team"}
                </span>
              </span>
              <span style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>{fmtDay(s.created_at)}, {fmtTime(s.created_at)}</span>
            </div>
          ))
        )}
      </GlassPanel>

      <div id="manual"><ManualSection defaultRole="student" /></div>

      <style>{`
        .dash-next:hover, .dash-shortcut:hover, .rd-action:hover { border-color: var(--border-strong) !important; }
        .gl-small-btn:hover:not(:disabled) { filter: brightness(1.15); }
        @media (max-width: 1000px) { .dash-companies { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 900px) { .dash-2col { grid-template-columns: minmax(0, 1fr) !important; } }
        @media (max-width: 720px) { .dash-shortcuts { grid-template-columns: 1fr !important; } }
        @media (max-width: 560px) { .dash-companies { grid-template-columns: 1fr !important; } }
        @media (max-width: 420px) { .dash-stats { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}

function Shortcut({ href, icon, title, sub }: { href: string; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <Link href={href} className="dash-shortcut" style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "var(--glass)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", textDecoration: "none" }}>
      <span style={{ width: 36, height: 36, borderRadius: "var(--r-sm)", background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", flexShrink: 0 }}>{icon}</span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{title}</span>
        <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)", marginTop: 1 }}>{sub}</span>
      </span>
    </Link>
  );
}

