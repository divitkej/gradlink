"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Lock, Sparkles, TrendingUp, Loader2 } from "lucide-react";
import { SectionCard } from "./cards";
import { Badge, Button } from "@/components/ui/primitives";
import { buildReport, downloadReportCsv, type OutcomeReport } from "@/lib/report";
import { getSubscription, isPro, startCheckout, PRO_FEATURES_BLURB } from "@/lib/billing";
import type { StudentRow, CompanyRow, EventRow, ScanRow, ShortlistRow } from "@/lib/db";

/**
 * The post-event outcome report — GradLink's paid feature.
 *
 * Free colleges see the headline numbers (enough to know the report is worth
 * having) but the full tables and the export are behind Placement Pro.
 */
export default function OutcomeReportCard({
  event, students, companies, scans, shortlists, profileId, email, organization,
}: {
  event: EventRow | null;
  students: StudentRow[];
  companies: CompanyRow[];
  scans: ScanRow[];
  shortlists: ShortlistRow[];
  profileId: string;
  email?: string;
  organization?: string;
}) {
  const [pro, setPro] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sub = await getSubscription(profileId);
      if (!cancelled) setPro(isPro(sub));
    })();
    return () => { cancelled = true; };
  }, [profileId]);

  const report: OutcomeReport = buildReport({ event, students, companies, scans, shortlists });

  async function upgrade() {
    setError(null);
    setBusy(true);
    const err = await startCheckout({ profileId, email: email ?? "", organization: organization ?? "" });
    if (err) {
      setError(err);
      setBusy(false);
    }
    // On success the browser navigates to Stripe, so no need to clear `busy`.
  }

  const headline = [
    { label: "Students engaged", value: `${report.studentsEngaged}/${report.studentsRegistered}`, sub: `${report.engagementRate}% engagement` },
    { label: "Students shortlisted", value: report.uniqueStudentsShortlisted, sub: `${report.shortlistRate}% of registrations` },
    { label: "Employer scans", value: report.totalScans, sub: `across ${report.employers} employers` },
    { label: "Avg resume score", value: report.avgResumeScore, sub: `${report.resumeReady} resume-ready` },
  ];

  return (
    <SectionCard
      title="Post-event outcome report"
      right={
        pro ? (
          <Button variant="secondary" icon={<Download size={14} />} onClick={() => downloadReportCsv(report)}>
            Export CSV
          </Button>
        ) : (
          <Badge tone="amber">Placement Pro</Badge>
        )
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }} className="report-stats">
        {headline.map((h) => (
          <div key={h.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: "11px 13px" }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 5 }}>{h.label}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 21, fontWeight: 700, color: "var(--text)", lineHeight: 1.1 }}>{h.value}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>{h.sub}</div>
          </div>
        ))}
      </div>

      {pro === null ? (
        <p style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-muted)" }}>
          <Loader2 size={14} className="gl-spin" /> Checking your plan…
        </p>
      ) : pro ? (
        <>
          <p style={{ display: "inline-flex", gap: 8, alignItems: "flex-start", fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.6 }}>
            <Sparkles size={15} color="var(--teal)" style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              {report.resumeReady} of {report.studentsRegistered} students are resume-ready, {report.totalScans} scans
              recorded across {report.employers} employers, and {report.shortlists} shortlists created.
              Export the full breakdown — every student, every employer, every outcome.
            </span>
          </p>

          {report.employerTable.length > 0 && (
            <div style={{ marginTop: 14, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 360 }}>
                <thead>
                  <tr>{["Top employers", "Scans", "Shortlisted"].map((h, i) => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: i === 0 ? "left" : "right", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-muted)" }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {report.employerTable.slice(0, 5).map((e) => (
                    <tr key={e.name}>
                      <td style={{ padding: "9px 10px", fontSize: 13, fontWeight: 600, color: "var(--text)", borderTop: "1px solid var(--border)" }}>{e.name}</td>
                      <td style={{ padding: "9px 10px", fontSize: 13, color: "var(--cyan)", fontWeight: 600, textAlign: "right", borderTop: "1px solid var(--border)" }}>{e.studentScans}</td>
                      <td style={{ padding: "9px 10px", fontSize: 13, color: "var(--teal)", fontWeight: 600, textAlign: "right", borderTop: "1px solid var(--border)" }}>{e.shortlisted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <div style={{ background: "rgba(247,201,72,0.05)", border: "1px solid rgba(247,201,72,0.22)", borderRadius: "var(--r-md)", padding: "16px 18px" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ width: 40, height: 40, flexShrink: 0, borderRadius: "var(--r-md)", background: "rgba(247,201,72,0.10)", border: "1px solid rgba(247,201,72,0.25)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--amber)" }}>
              <Lock size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 15.5, fontWeight: 700, color: "var(--text)", marginBottom: 5 }}>
                Unlock the full report
              </div>
              <p style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 14, maxWidth: 560 }}>
                {PRO_FEATURES_BLURB} Placement Pro adds the per-student and per-employer breakdown,
                CSV exports, unlimited events and year-over-year comparison.
              </p>

              {error && (
                <p style={{ fontSize: 12.5, color: "var(--danger)", marginBottom: 12 }}>{error}</p>
              )}

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <button
                  onClick={upgrade}
                  disabled={busy}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 8, height: 42, padding: "0 18px",
                    borderRadius: "var(--r-md)", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14,
                    color: "#021016", background: "linear-gradient(100deg, var(--cyan), var(--teal))",
                    border: "none", cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1,
                  }}
                >
                  {busy ? <Loader2 size={15} className="gl-spin" /> : <TrendingUp size={15} />}
                  {busy ? "Opening checkout…" : "Upgrade to Placement Pro"}
                </button>
                <Link href="/pricing" style={{ fontSize: 13, fontWeight: 600, color: "var(--cyan)", textDecoration: "none" }}>
                  See what&apos;s included →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .gl-spin { animation: gl-spin 0.9s linear infinite; }
        @keyframes gl-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .gl-spin { animation: none; } }
        @media (max-width: 900px) { .report-stats { grid-template-columns: repeat(2,1fr) !important; } }
      `}</style>
    </SectionCard>
  );
}
