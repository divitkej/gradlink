"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { GlassPanel, PanelTitle, StatCard, Pipeline } from "@/components/dashboard/widgets";
import { Badge } from "@/components/ui/primitives";
import { Reveal } from "@/components/anim/primitives";
import { ScanLine } from "lucide-react";
import QRCard from "@/components/dashboard/QRCard";
import Checklist from "@/components/dashboard/Checklist";
import ManualSection from "@/components/dashboard/ManualSection";
import { useSession } from "@/lib/session";
import { useActiveEvent } from "@/lib/use-active-event";
import EventGate from "@/components/events/EventGate";
import {
  getCompanyByProfile, getScans, listShortlistsForCompany, getStudentByProfile, listInterviewInvitesForCompany,
  type CompanyRow, type ShortlistRow, type StudentRow, type ScanRow, type InterviewInviteRow,
} from "@/lib/db";
import CompanyCandidates from "@/components/dashboard/CompanyCandidates";
import CompanyQueue from "@/components/dashboard/CompanyQueue";
import { EVENT_STATUS_LABEL } from "@/lib/events";

function CompanyOverview({ eventId }: { eventId: string }) {
  const { session } = useSession();
  const { event } = useActiveEvent();
  const profileId = session?.profileId ?? "";
  const orgName = session?.org || "Your company";
  const eventTitle = event?.title ?? "This event";
  const isLive = event?.status === "live";

  const [me, setMe] = useState<CompanyRow | null>(null);
  const [shortlists, setShortlists] = useState<ShortlistRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [invites, setInvites] = useState<InterviewInviteRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [c, sc, sl, inv] = await Promise.all([
        getCompanyByProfile(profileId),
        getScans({ eventId, scannerProfileId: profileId }),
        listShortlistsForCompany(profileId, eventId),
        listInterviewInvitesForCompany(eventId),
      ]);
      const ids = Array.from(new Set([
        ...sc.map((s) => s.scanned_profile_id).filter(Boolean) as string[],
        ...sl.map((s) => s.student_id).filter(Boolean) as string[],
      ]));
      const rows = (await Promise.all(ids.map((id) => getStudentByProfile(id)))).filter(Boolean) as StudentRow[];
      if (cancelled) return;
      setMe(c); setShortlists(sl); setScans(sc); setInvites(inv); setStudents(rows); setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [profileId, eventId]);

  const scannedCount = students.length;
  const shortlisted = shortlists.filter((s) => s.status === "shortlisted" || s.status === "priority").length;
  const priority = shortlists.filter((s) => s.status === "priority").length;
  const maybe = shortlists.filter((s) => s.status === "maybe").length;
  const rejected = shortlists.filter((s) => s.status === "rejected").length;

  const pipeline = [
    { label: "Scanned", count: scannedCount, color: "var(--text-muted)" },
    { label: "Shortlisted", count: shortlisted, color: "var(--accent-2)" },
    { label: "Priority", count: priority, color: "var(--accent)" },
    { label: "Maybe", count: maybe, color: "#D4D4D4" },
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
                <Badge tone={isLive ? "amber" : "muted"} pulse={isLive}>{eventTitle} · Booth {me?.booth_number ?? "not set"}</Badge>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(22px,3vw,30px)", fontWeight: 700, color: "var(--text)", margin: "14px 0 6px" }}>{orgName} Recruiting</h2>
                <p style={{ fontSize: 14.5, color: "var(--text-2)", maxWidth: 460 }}>Scan students at your booth, shortlist your best matches, and follow up, all from here.</p>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <Link href="/scan" style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 48, padding: "0 22px", borderRadius: "var(--r-md)", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "#0A0A0A", background: "linear-gradient(100deg, var(--accent), var(--accent-2))", textDecoration: "none" }}><ScanLine size={16} /> Scan students</Link>
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
            <QRCard payload={`/scan/company/${profileId}?eventId=${eventId}`} caption={orgName} sub="Scan to view company & open roles" accent="var(--accent-2)" filename="gradlink-company-qr" />
          </GlassPanel>
          <Checklist role="company" profileId={profileId} eventId={eventId} />
        </div>

        <div className="dash-2col" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
          <CompanyCandidates eventId={eventId} eventTitle={eventTitle} loading={loading} students={students} shortlists={shortlists} scans={scans} invites={invites} />

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <CompanyQueue eventId={eventId} live={isLive} />
            <GlassPanel id="pipeline">
              <PanelTitle>Candidate pipeline</PanelTitle>
              {hasPipeline ? <Pipeline stages={pipeline} /> : <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Your pipeline fills up as you scan and shortlist students.</p>}
            </GlassPanel>
            <GlassPanel>
              <PanelTitle>This event</PanelTitle>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{eventTitle}</span>
                  {event?.status && <Badge tone={isLive ? "amber" : "muted"} pulse={isLive}>{EVENT_STATUS_LABEL[event.status]}</Badge>}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Booth {me?.booth_number ?? "not set"} · {me?.hiring_roles?.length ?? 0} roles posted</div>
              </div>
              <div style={{ marginTop: 12 }}>
                <Link href={`/events/${eventId}`} style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}>Open event console →</Link>
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
