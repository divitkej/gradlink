"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, Check, Search } from "lucide-react";
import { GlassPanel } from "./widgets";
import { SectionCard, LoadingBlock, SmallButton, fieldStyle } from "./cards";
import { Badge } from "@/components/ui/primitives";
import { useSession } from "@/lib/session";
import { useStudentData } from "@/lib/use-student-data";
import { listApplications, saveApplication, type ApplicationRow, type StudentRow } from "@/lib/db";
import { matchCompanies } from "@/lib/readiness";

const INTERNSHIP = /\b(intern|internship|placement|trainee|co-?op|summer)\b/i;
const words = (s: string) => s.toLowerCase().split(/[^a-z0-9+#.]+/).filter((w) => w.length >= 3);

/**
 * Every open role at the event, ranked for this student: roles that match
 * their target roles first, then companies that want their skills.
 */
export default function StudentOpportunities({ eventId }: { eventId: string }) {
  const { session } = useSession();
  const { data, loading } = useStudentData(session?.profileId ?? "", eventId);
  const [apps, setApps] = useState<ApplicationRow[]>([]);
  const [q, setQ] = useState("");
  const [onlyInternships, setOnlyInternships] = useState(false);
  const [onlyMatches, setOnlyMatches] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listApplications().then((a) => { if (!cancelled) setApps(a); });
    return () => { cancelled = true; };
  }, []);

  if (loading || !data) return <GlassPanel><LoadingBlock label="Loading opportunities…" /></GlassPanel>;

  const me: Partial<StudentRow> = data.me ?? {};
  const targetWords = new Set((me.target_roles ?? []).flatMap(words));
  const skillsBy = new Map(matchCompanies(me, data.companies).map((m) => [m.company.id, m.skills]));
  const tracked = new Set(apps.map((a) => `${a.company_id}|${a.role_title.toLowerCase()}`));

  const roles = data.companies.flatMap((c) =>
    (c.hiring_roles ?? []).map((role) => {
      const companyId = c.profile_id ?? c.id;
      const roleMatch = words(role).some((w) => targetWords.has(w));
      const skills = skillsBy.get(c.id) ?? [];
      return {
        key: `${companyId}|${role}`, role, companyId, company: c.company_name ?? c.company ?? c.full_name,
        booth: c.booth_number, sector: c.sector, internship: INTERNSHIP.test(role), roleMatch, skills,
        rank: (roleMatch ? 2 : 0) + (skills.length ? 1 : 0),
        isTracked: tracked.has(`${companyId}|${role.toLowerCase()}`),
      };
    }),
  ).sort((a, b) => b.rank - a.rank || a.company.localeCompare(b.company));

  const internships = roles.filter((r) => r.internship).length;
  const needle = q.trim().toLowerCase();
  const shown = roles.filter((r) =>
    (!onlyInternships || r.internship) &&
    (!onlyMatches || r.roleMatch) &&
    (!needle || `${r.role} ${r.company} ${r.sector ?? ""}`.toLowerCase().includes(needle)),
  );

  async function track(r: (typeof roles)[number]) {
    setBusy(r.key);
    setError(null);
    const res = await saveApplication({ eventId, companyId: r.companyId, companyName: r.company, roleTitle: r.role, status: "applied" });
    setBusy(null);
    if (!res.ok) { setError(res.error); return; }
    setApps((a) => [res.application, ...a]);
  }

  return (
    <SectionCard title="Opportunities at this event" hint={`${roles.length} open ${roles.length === 1 ? "role" : "roles"} · ${internships} ${internships === 1 ? "internship" : "internships"}`}>
      {roles.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "26px 16px", textAlign: "center" }}>
          <Briefcase size={22} color="var(--accent)" />
          <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 380, lineHeight: 1.55 }}>No company at this event has listed open roles yet. They appear here as soon as they do.</p>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Search size={14} style={{ position: "absolute", left: 11, color: "var(--text-muted)" }} />
              <input aria-label="Search roles" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search role, company or sector" style={{ ...fieldStyle, paddingLeft: 32 }} />
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--text-2)", cursor: "pointer" }}>
                <input type="checkbox" checked={onlyInternships} onChange={(e) => setOnlyInternships(e.target.checked)} /> Internships only
              </label>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--text-2)", cursor: "pointer" }}>
                <input type="checkbox" checked={onlyMatches} onChange={(e) => setOnlyMatches(e.target.checked)} disabled={!targetWords.size} /> Matches my target roles
              </label>
              {!targetWords.size && <Link href="/dashboard/profile" style={{ fontSize: 12.5, color: "var(--text)" }}>Set target roles for better matches →</Link>}
            </div>
          </div>
          {error && <p role="alert" style={{ fontSize: 12.5, color: "var(--danger)", marginBottom: 10 }}>{error}</p>}
          {shown.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No roles match these filters.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {shown.map((r) => (
                <div key={r.key} className="opp-row" style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-md)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{r.role}</span>
                      {r.internship && <Badge tone="muted">Internship</Badge>}
                      {r.roleMatch && <Badge tone="teal">Matches your target roles</Badge>}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>
                      {[r.company, r.sector, r.booth ? `Booth ${r.booth}` : null].filter(Boolean).join(" · ")}
                    </div>
                    {r.skills.length > 0 && <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 3 }}>They want: {r.skills.slice(0, 3).join(", ")}</div>}
                  </div>
                  <Link href={`/scan/company/${r.companyId}?eventId=${eventId}`} style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-2)", textDecoration: "none" }}>Company</Link>
                  {r.isTracked
                    ? <Link href="/dashboard/student/applications" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600, color: "var(--accent)", textDecoration: "none", whiteSpace: "nowrap" }}><Check size={13} /> Tracking</Link>
                    : <SmallButton tone="primary" disabled={busy === r.key} onClick={() => track(r)}>{busy === r.key ? "Adding…" : "I applied"}</SmallButton>}
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <style>{`@media (max-width: 560px) { .opp-row { flex-wrap: wrap; } }`}</style>
    </SectionCard>
  );
}
