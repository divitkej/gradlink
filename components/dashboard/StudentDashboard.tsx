"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, AlertTriangle, ScanLine, Building2, History } from "lucide-react";
import { GlassPanel, PanelTitle, StatCard } from "./widgets";
import { SectionCard, MeterBar, FlagPill, ScoreRing, LoadingBlock } from "./cards";
import { Badge } from "@/components/ui/primitives";
import { Reveal } from "@/components/anim/primitives";
import QRCard from "./QRCard";
import Checklist from "./Checklist";
import ManualSection from "./ManualSection";
import { useSession } from "@/lib/session";
import { useActiveEvent } from "@/lib/use-active-event";
import {
  getStudentByProfile, getScans, getRegisteredCompanies, listShortlistsForStudent,
  getChecklistItems, getChecklistProgress,
  type StudentRow, type ScanRow, type CompanyRow, type ShortlistRow,
} from "@/lib/db";
import { evaluateResume, scoreTone } from "@/lib/resume";

export default function StudentDashboard({ eventId }: { eventId: string }) {
  const { session } = useSession();
  const { event } = useActiveEvent();
  const profileId = session?.profileId ?? "";
  const firstName = session?.name?.split(" ")[0] ?? "there";

  const [me, setMe] = useState<StudentRow | null>(null);
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [shortlists, setShortlists] = useState<ShortlistRow[]>([]);
  const [readiness, setReadiness] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [m, sc, co, sl, items, prog] = await Promise.all([
        getStudentByProfile(profileId),
        getScans({ eventId, scannedProfileId: profileId }),
        getRegisteredCompanies(eventId),
        listShortlistsForStudent(profileId, eventId),
        getChecklistItems("student", eventId),
        getChecklistProgress(profileId),
      ]);
      if (cancelled) return;
      setMe(m);
      setScans(sc);
      setCompanies(co);
      setShortlists(sl);
      const done = items.filter((i) => prog[i.id]).length;
      setReadiness(items.length ? Math.round((done / items.length) * 100) : 0);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [profileId, eventId]);

  if (loading) {
    return <GlassPanel><LoadingBlock label="Loading your profile…" /></GlassPanel>;
  }

  const eventDate = event?.start_date
    ? new Date(event.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : null;
  const eventLabel = [event?.title ?? "Your event", eventDate].filter(Boolean).join(" · ");

  const evalr = evaluateResume(me ?? {});
  const resumeScore = evalr.score;
  const tone = scoreTone(resumeScore);

  // profile completeness
  const checks = [
    !!me?.degree, !!me?.graduation_year, (me?.skills?.length ?? 0) > 0,
    !!me?.resume_url, !!(me?.linkedin_url || me?.github_url || me?.portfolio_url), !!me?.bio,
  ];
  const profileComplete = Math.round((checks.filter(Boolean).length / checks.length) * 100);

  // matched companies by skill overlap
  const mySkills = (me?.skills ?? []).map((s) => s.toLowerCase());
  const matched = companies
    .map((c) => {
      const wanted = [...(c.skills_wanted ?? []), ...(c.hiring_roles ?? [])].map((x) => x.toLowerCase());
      const overlap = mySkills.filter((s) => wanted.some((w) => w.includes(s) || s.includes(w))).length;
      return { c, overlap };
    })
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 5);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Hero + QR */}
      <div className="dash-2col" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>
        <Reveal>
          <GlassPanel style={{ border: "1px solid var(--border-strong)", height: "100%" }}>
            <Badge tone="cyan" pulse>{eventLabel}</Badge>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px,3vw,32px)", fontWeight: 700, color: "var(--text)", margin: "14px 0 6px", letterSpacing: "-0.02em" }}>
              Welcome back, {firstName}.
            </h2>
            <p style={{ fontSize: 15, color: "var(--text-2)", marginBottom: 22 }}>
              {profileComplete >= 80
                ? <>Your event profile is <strong style={{ color: "var(--teal)" }}>{profileComplete}% complete.</strong> You&apos;re fair-ready.</>
                : <>Your event profile is <strong style={{ color: "var(--cyan)" }}>{profileComplete}% complete.</strong> Finish it to stand out.</>}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
              <StatCard label="Readiness" value={readiness} suffix="%" delay={0.05} />
              <StatCard label="Resume score" value={resumeScore} suffix="%" accent delay={0.1} />
              <StatCard label="Profile complete" value={profileComplete} suffix="%" delay={0.15} />
            </div>
          </GlassPanel>
        </Reveal>

        <Reveal delay={0.1}>
          <GlassPanel id="qr" style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <PanelTitle>My QR</PanelTitle>
            <QRCard
              payload={`/scan/student/${profileId}?eventId=${eventId}`}
              caption={session?.name ?? "Your profile"}
              sub={session?.org ?? me?.university ?? ""}
              accent="var(--cyan)"
              filename="gradlink-student-qr"
            />
          </GlassPanel>
        </Reveal>
      </div>

      {/* Checklist + Resume analysis */}
      <div className="dash-2col" id="checklist" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Checklist role="student" profileId={profileId} eventId={eventId} />

        <SectionCard
          title="AI resume analysis"
          right={<span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)" }}><Sparkles size={13} /> Auto-evaluated</span>}
        >
          <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
            <ScoreRing score={resumeScore} tone={tone} label="/ 100" />
            <div style={{ flex: 1, minWidth: 180 }}>
              <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5, marginBottom: 10 }}>{evalr.summary}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {evalr.breakdown.slice(0, 4).map((b) => (
                  <div key={b.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginBottom: 3 }}>
                      <span>{b.label}</span><span>{Math.round(b.earned)}/{b.max}</span>
                    </div>
                    <MeterBar value={(b.earned / b.max) * 100} tone={tone} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
              <Sparkles size={15} color="var(--amber)" />
              <span style={{ fontFamily: "var(--font-display)", fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>Recommended next</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {evalr.improvements.slice(0, 4).map((s) => (
                <div key={s} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <AlertTriangle size={13} color="var(--amber)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.45 }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Matched companies */}
      <GlassPanel id="companies">
        <PanelTitle hint={mySkills.length ? "Based on your skills" : "Add skills for personalized matches"}>
          Companies at this event
        </PanelTitle>
        {matched.length === 0 ? (
          <p style={{ fontSize: 13.5, color: "var(--text-muted)" }}>No companies registered yet.</p>
        ) : (
          <div className="dash-companies" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
            {matched.map(({ c, overlap }) => (
              <Link
                key={c.id}
                href={`/scan/company/${c.profile_id}?eventId=${eventId}`}
                className="dash-company"
                style={{ textDecoration: "none", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: 16, height: "100%", display: "flex", flexDirection: "column", gap: 10, transition: "all 0.18s" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 14.5, fontWeight: 700, color: "var(--text)" }}>{c.company_name ?? c.company}</span>
                  {overlap > 0
                    ? <span style={{ fontSize: 12, fontWeight: 700, color: "var(--teal)" }}>{overlap}★</span>
                    : null}
                </div>
                <p style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.5, flex: 1 }}>{c.sector} · Booth {c.booth_number}</p>
                <span style={{ fontSize: 11.5, color: "var(--text-2)" }}>{(c.hiring_roles ?? []).length} open roles</span>
                {overlap > 0
                  ? <FlagPill label={`${overlap} skill match`} tone="teal" />
                  : <span style={{ fontSize: 12, fontWeight: 600, color: "var(--cyan)" }}>Explore →</span>}
              </Link>
            ))}
          </div>
        )}
      </GlassPanel>

      {/* Who viewed / scanned me */}
      <GlassPanel style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "18px 22px 4px" }}>
          <PanelTitle hint={`${scans.length} interactions · ${shortlists.length} shortlists`}>Recruiter activity</PanelTitle>
        </div>
        {scans.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "30px 24px 36px", textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: "var(--r-lg)", background: "rgba(53,211,255,0.08)", border: "1px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--cyan)" }}>
              <ScanLine size={22} />
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text)" }}>No scans yet</div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 360, lineHeight: 1.55 }}>
              Show your QR at company booths — when a recruiter scans you, they&apos;ll appear here.
            </p>
            <Link href="/scan" style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 4, fontSize: 13, fontWeight: 600, color: "#021016", background: "linear-gradient(100deg, var(--cyan), var(--teal))", padding: "9px 16px", borderRadius: "var(--r-md)", textDecoration: "none" }}>
              <ScanLine size={15} /> Open my QR
            </Link>
          </div>
        ) : (
          scans.map((s) => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 22px", borderTop: "1px solid var(--border)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                {s.scanner_role === "company" ? <Building2 size={15} color="var(--teal)" /> : <History size={15} color="var(--cyan)" />}
                <span style={{ fontSize: 13, color: "var(--text-2)" }}>
                  {s.scanner_role === "company" ? "A company scanned your profile" : "Event check-in"}
                  {s.notes ? ` · "${s.notes}"` : ""}
                </span>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Badge tone={s.scanner_role === "company" ? "teal" : "cyan"}>{s.scan_context ?? "scan"}</Badge>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date(s.created_at).toLocaleDateString()}</span>
              </span>
            </div>
          ))
        )}
      </GlassPanel>

      <div id="manual"><ManualSection defaultRole="student" /></div>

      <style>{`
        .dash-company:hover { transform: translateY(-3px); border-color: var(--border-strong); box-shadow: 0 12px 30px rgba(0,0,0,0.3); }
        @media (max-width: 1000px) { .dash-companies { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 900px) { .dash-2col { grid-template-columns: 1fr !important; } }
        @media (max-width: 560px) { .dash-companies { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
