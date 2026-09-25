"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays, MapPin, QrCode, ListChecks, BookOpen, Users, LayoutGrid,
  Star, HelpCircle, Bookmark, ScanLine, Search,
} from "lucide-react";
import { SectionCard, StatTile, FlagPill, Avatar, TagRow, LoadingBlock } from "./cards";
import { Badge } from "@/components/ui/primitives";
import QRCard from "./QRCard";
import Checklist from "./Checklist";
import ManualSection from "./ManualSection";
import { useSession, type AppRole } from "@/lib/session";
import {
  getEvent, getRegisteredStudents, getRegisteredCompanies, getStudentByProfile, getCompanyByProfile,
  listAnalytics, listShortlistsForCompany, upsertShortlist,
  type EventRow, type StudentRow, type CompanyRow, type AnalyticsRow, type ShortlistRow,
} from "@/lib/db";
import { evaluateResume, scoreTone } from "@/lib/resume";
import GsapReveal from "@/components/anim/GsapReveal";

type Tab = "overview" | "people" | "qr" | "checklist" | "manual";

export default function EventConsole({ eventId }: { eventId: string }) {
  const { session, ready } = useSession();
  const role = (session?.role ?? "student") as AppRole;

  const [tab, setTab] = useState<Tab>("overview");
  const [event, setEvent] = useState<EventRow | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsRow[]>([]);
  const [me, setMe] = useState<StudentRow | CompanyRow | null>(null);
  const [shortlists, setShortlists] = useState<ShortlistRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !session) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [ev, st, co] = await Promise.all([getEvent(eventId), getRegisteredStudents(eventId), getRegisteredCompanies(eventId)]);
      if (cancelled) return;
      setEvent(ev); setStudents(st); setCompanies(co);
      if (role === "event_manager") setAnalytics(await listAnalytics(eventId));
      if (role === "student") setMe(await getStudentByProfile(session.profileId));
      if (role === "company") {
        setMe(await getCompanyByProfile(session.profileId));
        setShortlists(await listShortlistsForCompany(session.profileId, eventId));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [ready, session, role, eventId]);

  if (!ready || !session) return <LoadingBlock label="Loading event…" />;

  const tabs: { key: Tab; label: string; icon: React.ComponentType<{ size?: number }>; hide?: boolean }[] = [
    { key: "overview", label: "Overview", icon: LayoutGrid },
    { key: "people", label: role === "student" ? "Companies" : role === "company" ? "Students" : "People", icon: Users },
    { key: "qr", label: "My QR", icon: QrCode, hide: role === "event_manager" },
    { key: "checklist", label: "Checklist", icon: ListChecks },
    { key: "manual", label: "Manual", icon: BookOpen },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <EventHeader event={event} role={role} studentCount={students.length} companyCount={companies.length} />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {tabs.filter((t) => !t.hide).map((t) => {
          const Icon = t.icon; const on = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600, padding: "8px 15px", borderRadius: "var(--r-full)", cursor: "pointer", color: on ? "#0A0A0A" : "var(--text-2)", background: on ? "linear-gradient(100deg, var(--accent), var(--accent-2))" : "rgba(255,255,255,0.04)", border: `1px solid ${on ? "transparent" : "var(--border)"}`, transition: "all 0.18s" }}>
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <LoadingBlock />
      ) : (
        <GsapReveal key={tab} style={{ display: "block" }}>
          {tab === "overview" && <Overview role={role} me={me} students={students} companies={companies} analytics={analytics} eventId={eventId} />}
          {tab === "people" && <People role={role} students={students} companies={companies} shortlists={shortlists} eventId={eventId} myId={session.profileId} onShortlist={setShortlists} />}
          {tab === "qr" && role !== "event_manager" && (
            <SectionCard title="My event QR" accent="var(--border-strong)">
              <QRCard
                payload={role === "student" ? `/scan/student/${session.profileId}?eventId=${eventId}` : `/scan/company/${session.profileId}?eventId=${eventId}`}
                caption={session.name} sub={`${session.org}`} accent={role === "company" ? "var(--accent-2)" : "var(--accent)"} filename={`gradlink-${role}-qr`}
              />
            </SectionCard>
          )}
          {tab === "checklist" && <Checklist role={role} profileId={session.profileId} eventId={eventId} />}
          {tab === "manual" && <ManualSection defaultRole={role} />}
        </GsapReveal>
      )}
    </div>
  );
}

function EventHeader({ event, role, studentCount, companyCount }: { event: EventRow | null; role: AppRole; studentCount: number; companyCount: number }) {
  const status = event?.status ?? "live";
  return (
    <SectionCard accent="var(--border-strong)">
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
        <div>
          <Badge tone={status === "live" ? "amber" : "cyan"} pulse={status === "live"}>{status === "live" ? "Live now" : status}</Badge>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(22px,3vw,30px)", fontWeight: 700, color: "var(--text)", margin: "12px 0 6px" }}>
            {event?.title ?? "Event"}
          </h1>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "var(--text-muted)" }}>
            {event?.location && <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><MapPin size={14} /> {event.location}</span>}
            {event?.start_date && <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><CalendarDays size={14} /> {new Date(event.start_date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span>}
          </div>
        </div>
        <Link href="/scan" style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 44, padding: "0 18px", borderRadius: "var(--r-md)", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, color: "#0A0A0A", background: "linear-gradient(100deg, var(--accent), var(--accent-2))", textDecoration: "none", alignSelf: "flex-start" }}>
          <ScanLine size={16} /> Open scanner
        </Link>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 18 }} className="ec-stats">
        <StatTile label="Companies" value={companyCount} />
        <StatTile label="Students" value={studentCount} accent />
        <StatTile label="Your role" value={role === "event_manager" ? "Manager" : role[0].toUpperCase() + role.slice(1)} />
      </div>
      <style>{`@media (max-width:560px){.ec-stats{grid-template-columns:1fr !important}}`}</style>
    </SectionCard>
  );
}

function Overview({ role, me, students, companies, analytics, eventId }: { role: AppRole; me: StudentRow | CompanyRow | null; students: StudentRow[]; companies: CompanyRow[]; analytics: AnalyticsRow[]; eventId: string }) {
  if (role === "student") {
    const mySkills = ((me as StudentRow)?.skills ?? []).map((s) => s.toLowerCase());
    const ranked = companies
      .map((c) => {
        const wanted = [...(c.skills_wanted ?? []), ...(c.hiring_roles ?? [])].map((x) => x.toLowerCase());
        const overlap = mySkills.filter((s) => wanted.some((w) => w.includes(s) || s.includes(w))).length;
        return { c, overlap };
      })
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, 4);
    return (
      <SectionCard title="Companies to visit first" hint="Matched to your skills">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ranked.map(({ c, overlap }) => (
            <Link key={c.id} href={`/scan/company/${c.profile_id}?eventId=${eventId}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", textDecoration: "none" }}>
              <Avatar name={c.company_name ?? c.company ?? "C"} size={38} tone="var(--accent-2)" />
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{c.company_name ?? c.company}</span>
                <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)" }}>Booth {c.booth_number} · {c.sector}</span>
              </span>
              {overlap > 0 ? <FlagPill label={`${overlap} match`} tone="teal" /> : <FlagPill label="Explore" tone="muted" />}
            </Link>
          ))}
        </div>
      </SectionCard>
    );
  }
  if (role === "company") {
    const wanted = ([...(((me as CompanyRow)?.skills_wanted) ?? []), ...(((me as CompanyRow)?.hiring_roles) ?? [])]).map((x) => x.toLowerCase());
    const ranked = students
      .map((s) => {
        const sk = (s.skills ?? []).map((x) => x.toLowerCase());
        const overlap = sk.filter((x) => wanted.some((w) => w.includes(x) || x.includes(w))).length;
        return { s, overlap };
      })
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, 4);
    return (
      <SectionCard title="Recommended students" hint="Matched to your hiring needs">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ranked.map(({ s, overlap }) => (
            <Link key={s.id} href={`/scan/student/${s.profile_id}?eventId=${eventId}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", textDecoration: "none" }}>
              <Avatar name={s.full_name} size={38} />
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{s.full_name}</span>
                <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)" }}>{[s.degree, s.university].filter(Boolean).join(" · ")}</span>
              </span>
              {overlap > 0 && <FlagPill label={`${overlap} match`} tone="teal" />}
            </Link>
          ))}
        </div>
      </SectionCard>
    );
  }
  // event manager
  const avg = analytics.length ? Math.round(analytics.reduce((s, a) => s + a.resume_score, 0) / analytics.length) : 0;
  const needsHelp = analytics.filter((a) => a.engagement_score < 40).length;
  const ready = analytics.filter((a) => a.resume_score >= 70).length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionCard title="Readiness & engagement overview">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }} className="ec-stats">
          <StatTile label="Avg resume score" value={avg} tone={scoreTone(avg)} />
          <StatTile label="Resume-ready" value={ready} accent />
          <StatTile label="Need attention" value={needsHelp} tone="var(--amber)" />
          <StatTile label="Companies" value={companies.length} />
        </div>
      </SectionCard>
      <SectionCard title="Students needing attention" hint="Low engagement">
        {analytics.filter((a) => a.engagement_score < 40).length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Everyone is engaged 🎉</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {analytics.filter((a) => a.engagement_score < 40).map((a) => {
              const s = students.find((x) => x.profile_id === a.student_id);
              return (
                <Link key={a.id} href={`/scan/student/${a.student_id}?eventId=${eventId}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 13px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", textDecoration: "none" }}>
                  <Avatar name={s?.full_name ?? "Student"} size={34} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{s?.full_name ?? "Student"}</span>
                    <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)" }}>Engagement {a.engagement_score}/100 · {a.company_scans} company scans</span>
                  </span>
                  <FlagPill label="Help" tone="amber" />
                </Link>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function People({
  role, students, companies, shortlists, eventId, myId, onShortlist,
}: {
  role: AppRole; students: StudentRow[]; companies: CompanyRow[];
  shortlists: ShortlistRow[]; eventId: string; myId: string; onShortlist: (s: ShortlistRow[]) => void;
}) {
  const [q, setQ] = useState("");
  const [sector, setSector] = useState<string>("all");
  const [year, setYear] = useState<string>("all");
  const sectors = useMemo(() => Array.from(new Set(companies.map((c) => c.sector).filter(Boolean))) as string[], [companies]);
  const years = useMemo(() => (Array.from(new Set(students.map((s) => s.graduation_year).filter(Boolean))).sort() as number[]), [students]);

  // STUDENT viewing COMPANIES
  if (role === "student") {
    const filtered = companies.filter((c) =>
      (sector === "all" || c.sector === sector) &&
      (q === "" || (c.company_name ?? c.company ?? "").toLowerCase().includes(q.toLowerCase()) || (c.hiring_roles ?? []).join(" ").toLowerCase().includes(q.toLowerCase()))
    );
    return (
      <SectionCard title="Registered companies" hint={`${filtered.length} of ${companies.length}`}>
        <FilterBar q={q} setQ={setQ} placeholder="Search company or role…" chips={["all", ...sectors]} active={sector} setActive={setSector} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
          {filtered.map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 13px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-md)" }}>
              <Avatar name={c.company_name ?? c.company ?? "C"} size={40} tone="var(--accent-2)" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{c.company_name ?? c.company}</div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Booth {c.booth_number} · {c.sector} · {(c.hiring_roles ?? []).length} roles</div>
              </div>
              <Link href={`/scan/company/${c.profile_id}?eventId=${eventId}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--accent)", textDecoration: "none", padding: "7px 12px", border: "1px solid var(--border-strong)", borderRadius: "var(--r-sm)", background: "rgba(255,255,255,0.06)" }}>View</Link>
            </div>
          ))}
        </div>
      </SectionCard>
    );
  }

  if (role === "company") {
    const slMap = new Map(shortlists.map((s) => [s.student_id, s.status]));
    const filtered = students.filter((s) =>
      (year === "all" || String(s.graduation_year) === year) &&
      (q === "" || s.full_name.toLowerCase().includes(q.toLowerCase()) || (s.skills ?? []).join(" ").toLowerCase().includes(q.toLowerCase()) || (s.degree ?? "").toLowerCase().includes(q.toLowerCase()) || (s.university ?? "").toLowerCase().includes(q.toLowerCase()))
    );
    async function mark(studentId: string, status: ShortlistRow["status"]) {
      await upsertShortlist({ eventId, companyId: myId, studentId, status });
      const next = await listShortlistsForCompany(myId, eventId);
      onShortlist(next);
    }
    return (
      <SectionCard title="Registered students" hint={`${filtered.length} of ${students.length} · pre-shortlist before the event`}>
        <FilterBar q={q} setQ={setQ} placeholder="Search name, skill, degree…" chips={["all", ...years.map(String)]} active={year} setActive={setYear} chipLabel={(c) => (c === "all" ? "All years" : c)} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
          {filtered.map((s) => {
            const status = slMap.get(s.profile_id ?? "");
            const score = evaluateResume(s).score;
            return (
              <div key={s.id} style={{ padding: "12px 13px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-md)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar name={s.full_name} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{s.full_name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{[s.degree, s.graduation_year, s.university].filter(Boolean).join(" · ")}</div>
                  </div>
                  <FlagPill label={`Resume ${score}`} tone={score >= 70 ? "teal" : score >= 50 ? "cyan" : "amber"} />
                </div>
                {s.skills?.length ? <div style={{ marginTop: 10 }}><TagRow items={s.skills.slice(0, 6)} /></div> : null}
                <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <SlBtn on={status === "priority"} onClick={() => mark(s.profile_id!, "priority")} icon={<Star size={13} />} label="Priority" tone="var(--amber)" />
                  <SlBtn on={status === "shortlisted"} onClick={() => mark(s.profile_id!, "shortlisted")} icon={<Bookmark size={13} />} label="Shortlist" tone="var(--accent-2)" />
                  <SlBtn on={status === "maybe"} onClick={() => mark(s.profile_id!, "maybe")} icon={<HelpCircle size={13} />} label="Maybe" tone="var(--accent)" />
                  <Link href={`/scan/student/${s.profile_id}?eventId=${eventId}`} style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}>View profile →</Link>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    );
  }

  // event manager — both lists
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionCard title="Students" hint={`${students.length} registered`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {students.map((s) => (
            <Link key={s.id} href={`/scan/student/${s.profile_id}?eventId=${eventId}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 13px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", textDecoration: "none" }}>
              <Avatar name={s.full_name} size={34} />
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{s.full_name}</span><span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)" }}>{[s.degree, s.university].filter(Boolean).join(" · ")}</span></span>
              <FlagPill label={`Resume ${evaluateResume(s).score}`} tone="muted" />
            </Link>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Companies" hint={`${companies.length} registered`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {companies.map((c) => (
            <Link key={c.id} href={`/scan/company/${c.profile_id}?eventId=${eventId}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 13px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", textDecoration: "none" }}>
              <Avatar name={c.company_name ?? c.company ?? "C"} size={34} tone="var(--accent-2)" />
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{c.company_name ?? c.company}</span><span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)" }}>Booth {c.booth_number} · {c.sector}</span></span>
            </Link>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function FilterBar({ q, setQ, placeholder, chips, active, setActive, chipLabel }: { q: string; setQ: (v: string) => void; placeholder: string; chips: string[]; active: string; setActive: (v: string) => void; chipLabel?: (c: string) => string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <Search size={15} style={{ position: "absolute", left: 12, color: "var(--text-muted)" }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder}
          style={{ width: "100%", height: 40, padding: "0 12px 0 34px", fontSize: 13.5, color: "var(--text)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", outline: "none" }} />
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {chips.map((c) => {
          const on = active === c;
          return (
            <button key={c} onClick={() => setActive(c)}
              style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: "var(--r-full)", cursor: "pointer", color: on ? "var(--accent)" : "var(--text-2)", background: on ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.03)", border: `1px solid ${on ? "var(--border-strong)" : "var(--border)"}` }}>
              {chipLabel ? chipLabel(c) : c === "all" ? "All" : c}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SlBtn({ on, onClick, icon, label, tone }: { on: boolean; onClick: () => void; icon: React.ReactNode; label: string; tone: string }) {
  return (
    <button onClick={onClick}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "6px 11px", borderRadius: "var(--r-sm)", color: on ? "#0A0A0A" : tone, background: on ? tone : "rgba(255,255,255,0.04)", border: `1px solid ${on ? tone : "var(--border)"}`, transition: "all 0.15s" }}>
      {icon} {label}
    </button>
  );
}
