"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, ExternalLink } from "lucide-react";
import { SectionCard } from "@/components/dashboard/cards";
import { listStudentScores, codingProfileUrl, type StudentScoreRow } from "@/lib/db";
import { CODING_SITE_LABEL, scoreLines } from "@/lib/scores";

/**
 * The coding profiles a student chose to show, each verified with LeetCode
 * or Codeforces (the student proved the account is theirs).
 */
export default function VerifiedScores({ studentId }: { studentId: string }) {
  const [rows, setRows] = useState<StudentScoreRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listStudentScores(studentId).then((r) => { if (!cancelled) setRows(r); });
    return () => { cancelled = true; };
  }, [studentId]);

  if (!rows || rows.length === 0) return null;
  const box: React.CSSProperties = { display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)" };

  return (
    <SectionCard title="Coding profiles">
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((r) => (
          <div key={r.id} style={box}>
            <BadgeCheck size={16} color="var(--accent)" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{CODING_SITE_LABEL[r.kind]} <span style={{ fontWeight: 500, color: "var(--text-2)" }}>{r.handle}</span></div>
              {scoreLines(r).map((l) => <div key={l} style={{ fontSize: 12.5, color: "var(--text-2)", marginTop: 2 }}>{l}</div>)}
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Verified with {CODING_SITE_LABEL[r.kind]}</div>
            </div>
            {r.handle && (
              <a href={codingProfileUrl(r.kind, r.handle)} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--text-2)", whiteSpace: "nowrap" }}>
                <ExternalLink size={12} /> View profile
              </a>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
