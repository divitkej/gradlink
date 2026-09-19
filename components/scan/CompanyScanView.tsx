"use client";

import { useEffect, useRef, useState } from "react";
import {
  Globe, MapPin, Briefcase, Bookmark, Heart, Send, Check, CheckCircle2,
  Users, Star, MessageSquare, Building2, Sparkles, FileText,
} from "lucide-react";
import ScanLayout from "./ScanLayout";
import ViewerGate from "./ViewerGate";
import { SectionCard, StatTile, FlagPill, TagRow, Avatar, LoadingBlock, ErrorBlock } from "@/components/dashboard/cards";
import { Button } from "@/components/ui/primitives";
import { useSession } from "@/lib/session";
import {
  getCompanyByProfile, getScans, listShortlistsForCompany, sendMessage, recordScan,
  getStudentByProfile,
  type CompanyRow, type ScanRow, type ShortlistRow,
} from "@/lib/db";
import GsapReveal from "@/components/anim/GsapReveal";

type Saves = { saved: boolean; interested: boolean; visited: boolean; followUp: boolean; note: string };
const empty: Saves = { saved: false, interested: false, visited: false, followUp: false, note: "" };

function loadSaves(studentId: string, companyId: string): Saves {
  try {
    const all = JSON.parse(localStorage.getItem(`gradlink.saves.${studentId}`) || "{}");
    return { ...empty, ...(all[companyId] || {}) };
  } catch { return empty; }
}
function persistSaves(studentId: string, companyId: string, s: Saves) {
  try {
    const all = JSON.parse(localStorage.getItem(`gradlink.saves.${studentId}`) || "{}");
    all[companyId] = s;
    localStorage.setItem(`gradlink.saves.${studentId}`, JSON.stringify(all));
  } catch { /* ignore */ }
}

export default function CompanyScanView({ companyProfileId, eventId }: { companyProfileId: string; eventId: string }) {
  const { session, ready } = useSession();
  const viewer = session?.role ?? null;

  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [shortlists, setShortlists] = useState<ShortlistRow[]>([]);
  const [topSkills, setTopSkills] = useState<string[]>([]);
  const [saves, setSaves] = useState<Saves>(empty);
  const [msg, setMsg] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const scanned = useRef(false);

  function flash(t: string) { setToast(t); setTimeout(() => setToast(null), 2200); }

  useEffect(() => {
    if (!viewer || !companyProfileId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const c = await getCompanyByProfile(companyProfileId);
      if (cancelled) return;
      setCompany(c);

      if (viewer === "student" && session) {
        setSaves(loadSaves(session.profileId, companyProfileId));
      } else if (viewer === "event_manager") {
        const inbound = await getScans({ eventId, scannedProfileId: companyProfileId });
        const sl = await listShortlistsForCompany(companyProfileId, eventId);
        if (!cancelled) { setScans(inbound); setShortlists(sl); }
        // aggregate top skills among shortlisted students
        const counts: Record<string, number> = {};
        for (const s of sl) {
          if (!s.student_id) continue;
          const st = await getStudentByProfile(s.student_id);
          (st?.skills ?? []).forEach((sk) => (counts[sk] = (counts[sk] || 0) + 1));
        }
        if (!cancelled) setTopSkills(Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k]) => k));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [viewer, companyProfileId, eventId, session]);

  // record student→company scan once
  useEffect(() => {
    if (!viewer || !session || !company || scanned.current) return;
    if (viewer === "student") {
      scanned.current = true;
      recordScan({ eventId, scannerProfileId: session.profileId, scannedProfileId: companyProfileId, scannerRole: "student", scannedRole: "company", scanContext: "qr" });
    }
  }, [viewer, session, company, companyProfileId, eventId]);

  function toggle(key: keyof Saves, label: string) {
    if (!session) return;
    const next = { ...saves, [key]: !saves[key] } as Saves;
    setSaves(next); persistSaves(session.profileId, companyProfileId, next);
    flash(next[key] ? label : `${label} removed`);
  }

  if (!ready) return <div style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center" }}><LoadingBlock /></div>;
  if (!viewer) return <ViewerGate onPick={() => {}} hint="Choose your role to view this company the right way." />;

  return (
    <ScanLayout viewerRole={viewer}>
      {loading ? (
        <LoadingBlock label="Loading company…" />
      ) : !company ? (
        <ErrorBlock title="Company not found" body="This QR code doesn't match a registered company for this event." />
      ) : (
        <GsapReveal style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <CompanyHeader company={company} />
          {viewer === "student" && (
            <StudentView
              company={company} saves={saves} msg={msg} setMsg={setMsg}
              onToggle={toggle}
              onSend={async () => {
                if (!msg.trim()) return;
                await sendMessage({ eventId, senderProfileId: session!.profileId, receiverProfileId: companyProfileId, message: msg.trim() });
                setMsg(""); flash("Message sent");
              }}
              onNote={(v) => { const next = { ...saves, note: v }; setSaves(next); persistSaves(session!.profileId, companyProfileId, next); }}
            />
          )}
          {viewer === "event_manager" && <ManagerCompanyView company={company} scans={scans} shortlists={shortlists} topSkills={topSkills} />}
          {viewer === "company" && (
            <SectionCard title="Company profile"><p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.6 }}>{company.description}</p></SectionCard>
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

function CompanyHeader({ company }: { company: CompanyRow }) {
  const name = company.company_name ?? company.company ?? "Company";
  return (
    <SectionCard accent="var(--border-strong)">
      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <Avatar name={name} size={60} tone="var(--teal)" />
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--text)" }}>{name}</h1>
          <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 2 }}>{[company.sector, company.industry].filter(Boolean).join(" · ")}</p>
        </div>
        {company.booth_number && <FlagPill label={`Booth ${company.booth_number}`} tone="amber" icon={<MapPin size={13} />} />}
      </div>
      {company.description && <p style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.6, marginTop: 14 }}>{company.description}</p>}
    </SectionCard>
  );
}

function StudentView({
  company, saves, msg, setMsg, onToggle, onSend, onNote,
}: {
  company: CompanyRow; saves: Saves; msg: string; setMsg: (v: string) => void;
  onToggle: (k: keyof Saves, label: string) => void; onSend: () => void; onNote: (v: string) => void;
}) {
  return (
    <>
      {company.hiring_roles?.length ? (
        <SectionCard title="Open roles" hint={`${company.hiring_roles.length} hiring`}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {company.hiring_roles.map((r) => (
              <div key={r} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 13px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)" }}>
                <Briefcase size={15} color="var(--teal)" />
                <span style={{ fontSize: 13.5, color: "var(--text)", fontWeight: 500 }}>{r}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {company.skills_wanted?.length ? (
        <SectionCard title="Skills they're looking for"><TagRow items={company.skills_wanted} tone="teal" /></SectionCard>
      ) : null}

      <SectionCard title="Your actions">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Toggle on={saves.saved} onClick={() => onToggle("saved", "Saved company")} icon={<Bookmark size={15} />} label="Save company" />
          <Toggle on={saves.interested} onClick={() => onToggle("interested", "Marked interested")} icon={<Heart size={15} />} label="Interested" />
          <Toggle on={saves.visited} onClick={() => onToggle("visited", "Booth visited")} icon={<CheckCircle2 size={15} />} label="Visited booth" />
          <Toggle on={saves.followUp} onClick={() => onToggle("followUp", "Follow-up requested")} icon={<Send size={15} />} label="Request follow-up" />
        </div>
        <div style={{ marginTop: 14 }}>
          <label style={{ fontSize: 12, color: "var(--text-2)", display: "block", marginBottom: 6 }}>Personal note</label>
          <textarea value={saves.note} onChange={(e) => onNote(e.target.value)} rows={2} placeholder="Who I spoke to, what to follow up on…"
            style={{ width: "100%", resize: "vertical", fontSize: 13.5, color: "var(--text)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "10px 12px", outline: "none", fontFamily: "var(--font-body)" }} />
        </div>
      </SectionCard>

      <SectionCard title="Recommended before you approach">
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
          {["Have your QR ready to share", "Prepare a 30-second intro", `Skim ${company.hiring_roles?.length ? "the open roles above" : "their website"}`, "Note one question to ask the recruiter"].map((t) => (
            <li key={t} style={{ display: "flex", gap: 9, alignItems: "center", fontSize: 13, color: "var(--text-2)" }}>
              <Check size={14} color="var(--cyan)" /> {t}
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="Contact / links">
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginBottom: 14 }}>
          {company.website && (
            <a href={company.website} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 600, color: "var(--text-2)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: "8px 13px", textDecoration: "none" }}>
              <Globe size={14} /> Website
            </a>
          )}
          {company.brochure_url && (
            <a href={company.brochure_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 600, color: "var(--teal)", background: "rgba(0,194,168,0.08)", border: "1px solid rgba(0,194,168,0.25)", borderRadius: "var(--r-sm)", padding: "8px 13px", textDecoration: "none" }}>
              <FileText size={14} /> View brochure
            </a>
          )}
        </div>
        <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} placeholder={`Message ${company.company_name ?? "the company"}…`}
          style={{ width: "100%", resize: "vertical", fontSize: 13.5, color: "var(--text)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "10px 12px", outline: "none", fontFamily: "var(--font-body)" }} />
        <div style={{ marginTop: 8 }}><Button variant="primary" onClick={onSend} icon={<Send size={14} />}>Send message</Button></div>
      </SectionCard>
    </>
  );
}

function Toggle({ on, onClick, icon, label }: { on: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "9px 15px", borderRadius: "var(--r-md)", color: on ? "#021016" : "var(--teal)", background: on ? "var(--teal)" : "rgba(255,255,255,0.04)", border: `1px solid ${on ? "var(--teal)" : "var(--border)"}`, transition: "all 0.15s" }}>
      {icon} {label}
    </button>
  );
}

function ManagerCompanyView({ company, scans, shortlists, topSkills }: { company: CompanyRow; scans: ScanRow[]; shortlists: ShortlistRow[]; topSkills: string[] }) {
  const studentScans = scans.filter((s) => s.scanner_role === "student").length;
  const totalInbound = scans.length;
  const shortlisted = shortlists.filter((s) => s.status === "shortlisted" || s.status === "priority").length;
  const maybes = shortlists.filter((s) => s.status === "maybe").length;
  const followUp = shortlisted > 0 ? "In progress" : "Not started";

  return (
    <>
      <SectionCard title="Company analytics">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }} className="mgr-stats">
          <StatTile label="Student scans" value={studentScans} accent />
          <StatTile label="Total interactions" value={totalInbound} />
          <StatTile label="Shortlisted" value={shortlisted} accent />
          <StatTile label="Maybe" value={maybes} />
          <StatTile label="Booth" value={company.booth_number ?? "—"} />
          <StatTile label="Follow-up" value={followUp} tone={shortlisted > 0 ? "var(--teal)" : "var(--amber)"} />
        </div>
        <style>{`@media (max-width:560px){.mgr-stats{grid-template-columns:repeat(2,1fr) !important}}`}</style>
      </SectionCard>

      <SectionCard title="Top skills among interested students">
        {topSkills.length ? <TagRow items={topSkills} tone="teal" /> : <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No shortlisted students yet.</p>}
      </SectionCard>

      <SectionCard title="Booth engagement">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Line icon={<Users size={15} color="var(--cyan)" />} label="Students who scanned this booth" value={studentScans} />
          <Line icon={<Star size={15} color="var(--teal)" />} label="Candidates shortlisted" value={shortlisted} />
          <Line icon={<MessageSquare size={15} color="var(--amber)" />} label="Maybe / under review" value={maybes} />
          <Line icon={<Building2 size={15} color="var(--text-2)" />} label="Hiring roles posted" value={company.hiring_roles?.length ?? 0} />
        </div>
      </SectionCard>

      <SectionCard title="Manager note" accent="rgba(0,194,168,0.22)" style={{ background: "rgba(0,194,168,0.05)" }}>
        <p style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.55 }}>
          <Sparkles size={15} color="var(--teal)" />
          {studentScans === 0 ? "Low booth traffic — consider promoting this employer to students." : "Healthy engagement. Encourage post-event follow-ups with shortlisted students."}
        </p>
      </SectionCard>
    </>
  );
}

function Line({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 13px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 9, fontSize: 13, color: "var(--text-2)" }}>{icon}{label}</span>
      <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{value}</span>
    </div>
  );
}
