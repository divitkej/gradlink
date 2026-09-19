"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ScanLine, Sparkles } from "lucide-react";
import { SectionCard, StatTile, FlagPill, Avatar, LoadingBlock, MeterBar } from "./cards";
import { Badge } from "@/components/ui/primitives";
import Checklist from "./Checklist";
import ManualSection from "./ManualSection";
import OutcomeReportCard from "./OutcomeReportCard";
import { useSession } from "@/lib/session";
import {
  getEvent, getRegisteredStudents, getRegisteredCompanies, listAnalytics, getScans, listShortlists,
  type EventRow, type StudentRow, type CompanyRow, type AnalyticsRow, type ScanRow, type ShortlistRow,
} from "@/lib/db";
import { scoreTone } from "@/lib/resume";

export default function EventManagerDashboard({ eventId }: { eventId: string }) {
  const { session, ready } = useSession();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsRow[]>([]);
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [shortlists, setShortlists] = useState<ShortlistRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [ev, st, co, an, sc, sl] = await Promise.all([
        getEvent(eventId), getRegisteredStudents(eventId), getRegisteredCompanies(eventId),
        listAnalytics(eventId), getScans({ eventId }), listShortlists(eventId),
      ]);
      if (cancelled) return;
      setEvent(ev); setStudents(st); setCompanies(co); setAnalytics(an); setScans(sc); setShortlists(sl);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [ready, eventId]);

  if (loading) return <LoadingBlock label="Loading live event data…" />;

  const avg = analytics.length ? Math.round(analytics.reduce((s, a) => s + a.resume_score, 0) / analytics.length) : 0;
  const ready70 = analytics.filter((a) => a.resume_score >= 70).length;
  const needHelp = analytics.filter((a) => a.engagement_score < 40);
  const nameOf = (pid: string | null) => students.find((s) => s.profile_id === pid)?.full_name ?? companies.find((c) => c.profile_id === pid)?.company_name ?? "Someone";

  const companyEng = companies.map((c) => {
    const sc = scans.filter((s) => s.scanned_profile_id === c.profile_id && s.scanner_role === "student").length
      || scans.filter((s) => s.scanner_profile_id === c.profile_id).length;
    const shl = shortlists.filter((s) => s.company_id === c.profile_id && (s.status === "shortlisted" || s.status === "priority")).length;
    return { c, sc, shl };
  }).sort((a, b) => b.sc - a.sc);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionCard accent="var(--border-strong)">
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <Badge tone="amber" pulse>{event?.title ?? "Career Fair"} · Live Monitor</Badge>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(22px,3vw,30px)", fontWeight: 700, color: "var(--text)", margin: "14px 0 6px" }}>{session?.org ?? "Career Center"}</h2>
            <p style={{ fontSize: 14.5, color: "var(--text-2)", maxWidth: 560 }}>Track readiness, live scans, employer activity, and placement outcomes — connected to your event database.</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <Link href="/scan" style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 44, padding: "0 16px", borderRadius: "var(--r-md)", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, color: "#021016", background: "linear-gradient(100deg, var(--cyan), var(--teal))", textDecoration: "none" }}><ScanLine size={16} /> Scanner</Link>
          </div>
        </div>
        <div className="dash-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginTop: 20 }}>
          <StatTile label="Registered students" value={students.length} />
          <StatTile label="Companies" value={companies.length} accent />
          <StatTile label="Total scans" value={scans.length} accent />
          <StatTile label="Shortlists" value={shortlists.length} />
        </div>
      </SectionCard>

      {scans.length === 0 && (
        <SectionCard accent="rgba(53,211,255,0.25)" style={{ background: "rgba(53,211,255,0.05)" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ width: 44, height: 44, flexShrink: 0, borderRadius: "var(--r-md)", background: "rgba(53,211,255,0.10)", border: "1px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--cyan)" }}>
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 15.5, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>No activity yet</div>
              <p style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.55, maxWidth: 620 }}>
                Your event is live. As students check in and companies scan QR codes at booths, live scans, readiness analytics, and engagement will appear here in real time.
              </p>
            </div>
          </div>
        </SectionCard>
      )}

      <div className="dash-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <SectionCard title="Readiness analytics">
          <div id="analytics" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            <StatTile label="Avg resume" value={avg} tone={scoreTone(avg)} />
            <StatTile label="Resume-ready" value={ready70} accent />
            <StatTile label="Need help" value={needHelp.length} tone="var(--amber)" />
          </div>
          <div style={{ marginTop: 14 }}><MeterBar value={avg} tone={scoreTone(avg)} /></div>
        </SectionCard>

        <SectionCard title="Live scan monitor" hint={`${scans.length} scans`}>
          <div id="scans" />
          {scans.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No scans recorded yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 240, overflowY: "auto" }}>
              {scans.slice(0, 12).map((s) => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)" }}>
                  <span style={{ fontSize: 12.5, color: "var(--text-2)" }}>
                    {nameOf(s.scanner_profile_id)} → {nameOf(s.scanned_profile_id)}
                  </span>
                  <Badge tone={s.scanner_role === "event_manager" ? "teal" : "cyan"}>{s.scan_context ?? "scan"}</Badge>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Company engagement" hint="Top employers by booth activity">
        <div id="employers" />
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 380 }}>
            <thead><tr>{["Company", "Booth", "Student scans", "Shortlisted"].map((h, i) => (
              <th key={h} style={{ padding: "10px 12px", textAlign: i === 0 ? "left" : "right", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-muted)" }}>{h}</th>
            ))}</tr></thead>
            <tbody>
              {companyEng.map(({ c, sc, shl }) => (
                <tr key={c.id}>
                  <td style={{ padding: "11px 12px", fontSize: 13, fontWeight: 600, color: "var(--text)", borderTop: "1px solid var(--border)" }}>{c.company_name ?? c.company}</td>
                  <td style={{ padding: "11px 12px", fontSize: 13, color: "var(--text-2)", textAlign: "right", borderTop: "1px solid var(--border)" }}>{c.booth_number}</td>
                  <td style={{ padding: "11px 12px", fontSize: 13, color: "var(--cyan)", fontWeight: 600, textAlign: "right", borderTop: "1px solid var(--border)" }}>{sc}</td>
                  <td style={{ padding: "11px 12px", fontSize: 13, color: "var(--teal)", fontWeight: 600, textAlign: "right", borderTop: "1px solid var(--border)" }}>{shl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Students needing attention" hint="Low or no engagement" accent="rgba(247,201,72,0.22)">
        <div id="students" />
        {needHelp.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{students.length === 0 ? "No students have registered yet." : "All students are engaged 🎉"}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {needHelp.map((a) => (
              <Link key={a.id} href={`/scan/student/${a.student_id}?eventId=${eventId}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 13px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", textDecoration: "none" }}>
                <Avatar name={nameOf(a.student_id)} size={34} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{nameOf(a.student_id)}</span>
                  <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)" }}>Engagement {a.engagement_score}/100 · {a.company_scans} company scans · resume {a.resume_score}</span>
                </span>
                <FlagPill label="Help" tone="amber" icon={<Activity size={13} />} />
              </Link>
            ))}
          </div>
        )}
      </SectionCard>

      {session && (
        <div id="report">
          <OutcomeReportCard
            event={event}
            students={students}
            companies={companies}
            scans={scans}
            shortlists={shortlists}
            profileId={session.profileId}
            organization={session.org}
          />
        </div>
      )}

      {session && <div id="checklist"><Checklist role="event_manager" profileId={session.profileId} eventId={eventId} /></div>}

      <div id="manual"><ManualSection defaultRole="event_manager" /></div>

      <style>{`
        @media (max-width: 1000px) { .dash-stats { grid-template-columns: repeat(2,1fr) !important; } }
        @media (max-width: 900px) { .dash-2col { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
