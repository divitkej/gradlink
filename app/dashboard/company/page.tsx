"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { GlassPanel, PanelTitle, StatCard, Pipeline } from "@/components/dashboard/widgets";
import { Badge, Button } from "@/components/ui/primitives";
import { Reveal } from "@/components/anim/primitives";
import { Download, ScanLine, Users } from "lucide-react";
import QRCard from "@/components/dashboard/QRCard";
import Checklist from "@/components/dashboard/Checklist";
import ManualSection from "@/components/dashboard/ManualSection";
import { Avatar, LoadingBlock } from "@/components/dashboard/cards";
import { useSession } from "@/lib/session";
import { useActiveEvent } from "@/lib/use-active-event";
import EventGate from "@/components/events/EventGate";
import {
  getCompanyByProfile, getScans, listShortlistsForCompany, getStudentByProfile,
  type CompanyRow, type ShortlistRow, type StudentRow,
} from "@/lib/db";
import { evaluateResume } from "@/lib/resume";

const filters = ["Degree", "Graduation Year", "Skills", "Readiness", "Resume", "Stage"];

const statusTone = (s?: string) =>
  s === "priority" ? "amber" : s === "shortlisted" ? "teal" : s === "maybe" ? "cyan" : s === "rejected" ? "danger" : "muted";

function CompanyOverview({ eventId }: { eventId: string }) {
  const { session } = useSession();
  const { event } = useActiveEvent();
  const profileId = session?.profileId ?? "";
  const orgName = session?.org || "Your company";
  const eventTitle = event?.title ?? "This event";

  const [me, setMe] = useState<CompanyRow | null>(null);
  const [shortlists, setShortlists] = useState<ShortlistRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [c, sc, sl] = await Promise.all([
        getCompanyByProfile(profileId),
        getScans({ eventId, scannerProfileId: profileId }),
        listShortlistsForCompany(profileId, eventId),
      ]);
      const ids = Array.from(new Set([
        ...sc.map((s) => s.scanned_profile_id).filter(Boolean) as string[],
        ...sl.map((s) => s.student_id).filter(Boolean) as string[],
      ]));
      const rows = (await Promise.all(ids.map((id) => getStudentByProfile(id)))).filter(Boolean) as StudentRow[];
      if (cancelled) return;
      setMe(c); setShortlists(sl); setStudents(rows); setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [profileId, eventId]);

  const slByStudent = new Map(shortlists.map((s) => [s.student_id, s.status]));
  const scannedCount = students.length;
  const shortlisted = shortlists.filter((s) => s.status === "shortlisted" || s.status === "priority").length;
  const priority = shortlists.filter((s) => s.status === "priority").length;
  const maybe = shortlists.filter((s) => s.status === "maybe").length;
  const rejected = shortlists.filter((s) => s.status === "rejected").length;

  const pipeline = [
    { label: "Scanned", count: scannedCount, color: "var(--text-muted)" },
    { label: "Shortlisted", count: shortlisted, color: "var(--teal)" },
    { label: "Priority", count: priority, color: "var(--cyan)" },
    { label: "Maybe", count: maybe, color: "#2BB8E8" },
    { label: "Not a fit", count: rejected, color: "var(--amber)" },
  ];
  const hasPipeline = scannedCount + shortlists.length > 0;

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Reveal>
          <GlassPanel style={{ border: "1px solid var(--border-strong)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
              <div>
                <Badge tone="amber" pulse>{eventTitle} · Booth {me?.booth_number ?? "—"}</Badge>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(22px,3vw,30px)", fontWeight: 700, color: "var(--text)", margin: "14px 0 6px" }}>{orgName} Recruiting</h2>
                <p style={{ fontSize: 14.5, color: "var(--text-2)", maxWidth: 460 }}>Scan students at your booth, shortlist your best matches, and follow up — all from here.</p>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <Link href="/scan" style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 48, padding: "0 22px", borderRadius: "var(--r-md)", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "#021016", background: "linear-gradient(100deg, var(--cyan), var(--teal))", textDecoration: "none" }}><ScanLine size={16} /> Scan students</Link>
                <Button variant="secondary" icon={<Download size={15} />}>Export</Button>
              </div>
            </div>
            <div className="dash-stats" style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginTop: 20 }}>
              <StatCard label="Students scanned" value={scannedCount} accent delay={0.05} />
              <StatCard label="Shortlisted" value={shortlisted} accent delay={0.1} />
              <StatCard label="Priority" value={priority} delay={0.15} />
              <StatCard label="Maybe" value={maybe} delay={0.2} />
              <StatCard label="Open roles" value={me?.hiring_roles?.length ?? 0} delay={0.25} />
            </div>
          </GlassPanel>
        </Reveal>

        <div className="dash-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <GlassPanel id="qr">
            <PanelTitle>Company QR</PanelTitle>
            <QRCard payload={`/scan/company/${profileId}?eventId=${eventId}`} caption={orgName} sub="Scan to view company & open roles" accent="var(--teal)" filename="gradlink-company-qr" />
          </GlassPanel>
          <Checklist role="company" profileId={profileId} eventId={eventId} />
        </div>

        <div className="dash-2col" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
          <GlassPanel id="students" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "18px 22px 0" }}><PanelTitle hint={`${scannedCount} scanned`}>Scanned students</PanelTitle></div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "0 22px 14px" }}>
              {filters.map((f) => <span key={f} style={{ fontSize: 11.5, color: "var(--text-2)", background: "rgba(53,211,255,0.06)", border: "1px solid var(--border)", borderRadius: "var(--r-full)", padding: "4px 10px" }}>{f}</span>)}
            </div>
            {loading ? (
              <LoadingBlock label="Loading candidates…" />
            ) : students.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "26px 24px 34px", textAlign: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: "var(--r-lg)", background: "rgba(0,194,168,0.08)", border: "1px solid rgba(0,194,168,0.25)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--teal)" }}><Users size={22} /></div>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text)" }}>No students scanned yet</div>
                <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 360, lineHeight: 1.55 }}>Open the scanner and scan a student&apos;s QR at your booth — they&apos;ll show up here with their portfolio and resume score.</p>
                <Link href="/scan" style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 4, fontSize: 13, fontWeight: 600, color: "#021016", background: "linear-gradient(100deg, var(--cyan), var(--teal))", padding: "9px 16px", borderRadius: "var(--r-md)", textDecoration: "none" }}><ScanLine size={15} /> Open scanner</Link>
              </div>
            ) : (
              students.map((s) => {
                const status = slByStudent.get(s.profile_id ?? "");
                const score = evaluateResume(s).score;
                return (
                  <div key={s.id} className="dash-row" style={{ padding: "14px 22px", borderTop: "1px solid var(--border)", transition: "background 0.15s" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 10 }}>
                      <div style={{ display: "flex", gap: 11, alignItems: "center" }}>
                        <Avatar name={s.full_name} size={34} />
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{s.full_name}</div>
                          <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{[s.degree, s.university].filter(Boolean).join(" · ")}{s.skills?.length ? ` · ${s.skills.slice(0, 3).join(", ")}` : ""}</div>
                        </div>
                      </div>
                      <Badge tone={statusTone(status) as "teal" | "cyan" | "amber" | "muted"}>{status ?? "scanned"}</Badge>
                    </div>
                    <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Resume <strong style={{ color: "var(--text)" }}>{score}</strong></span>
                      <Link href={`/scan/student/${s.profile_id}?eventId=${eventId}`} style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, color: "var(--cyan)", textDecoration: "none" }}>View profile →</Link>
                    </div>
                  </div>
                );
              })
            )}
          </GlassPanel>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <GlassPanel id="pipeline">
              <PanelTitle>Candidate pipeline</PanelTitle>
              {hasPipeline ? <Pipeline stages={pipeline} /> : <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Your pipeline fills up as you scan and shortlist students.</p>}
            </GlassPanel>
            <GlassPanel>
              <PanelTitle>This event</PanelTitle>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{eventTitle}</span>
                  <Badge tone="amber" pulse>Live</Badge>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Booth {me?.booth_number ?? "—"} · {me?.hiring_roles?.length ?? 0} roles posted</div>
              </div>
              <div style={{ marginTop: 12 }}>
                <Link href={`/events/${eventId}`} style={{ fontSize: 13, fontWeight: 600, color: "var(--cyan)", textDecoration: "none" }}>Open event console →</Link>
              </div>
            </GlassPanel>
          </div>
        </div>
        <div id="manual"><ManualSection defaultRole="company" /></div>
      </div>
      <style>{`
        .dash-row:hover { background: rgba(255,255,255,0.02); }
        @media (max-width: 1000px) { .dash-stats { grid-template-columns: repeat(3,1fr) !important; } }
        @media (max-width: 900px) { .dash-2col { grid-template-columns: 1fr !important; } }
        @media (max-width: 520px) { .dash-stats { grid-template-columns: repeat(2,1fr) !important; } }
      `}</style>
    </>
  );
}

export default function CompanyPage() {
  return (
    <DashboardShell role="company" title="Company Overview">
      <EventGate>{(eventId) => <CompanyOverview eventId={eventId} />}</EventGate>
    </DashboardShell>
  );
}
