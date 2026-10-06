"use client";

import { useEffect, useState } from "react";
import { Award, BadgeCheck, ExternalLink } from "lucide-react";
import { SectionCard } from "@/components/dashboard/cards";
import { listStudentCertificates, type StudentCertificateRow } from "@/lib/db";
import { certificateDates } from "@/lib/scores";

/**
 * The certificates a student chose to show. Credly badges were checked with
 * Credly; the rest are the student's own report and say so, with the
 * credential link so the employer can check it themselves.
 */
export default function VerifiedCertificates({ studentId }: { studentId: string }) {
  const [rows, setRows] = useState<StudentCertificateRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listStudentCertificates(studentId).then((r) => { if (!cancelled) setRows(r); });
    return () => { cancelled = true; };
  }, [studentId]);

  if (!rows || rows.length === 0) return null;
  const verified = rows.filter((c) => c.verified_at).length;

  return (
    <SectionCard title="Certificates" hint={[verified ? `${verified} verified` : null, rows.length - verified ? `${rows.length - verified} self-reported` : null].filter(Boolean).join(" · ")}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((c) => (
          <div key={c.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)" }}>
            {c.verified_at ? <BadgeCheck size={16} color="var(--accent)" style={{ flexShrink: 0, marginTop: 1 }} /> : <Award size={15} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 1 }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{c.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                {[c.issuer, c.verified_at ? "Verified by Credly" : "Self-reported", certificateDates(c)].filter(Boolean).join(" · ")}
              </div>
            </div>
            {c.credential_url && (
              <a href={c.credential_url} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--text-2)", whiteSpace: "nowrap" }}>
                <ExternalLink size={12} /> {c.verified_at ? "Check on Credly" : "View credential"}
              </a>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
