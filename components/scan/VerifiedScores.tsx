"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, ExternalLink, FileText } from "lucide-react";
import { SectionCard } from "@/components/dashboard/cards";
import { listStudentScores, codingProfileUrl, type StudentScoreRow } from "@/lib/db";
import { CODING_SITE_LABEL, scoreLines, testScoreText, takenOnText } from "@/lib/scores";

/**
 * The coding profiles and test scores a student chose to show. Coding
 * profiles were verified with LeetCode or Codeforces (the student proved the
 * account is theirs); test scores are the student's own report and say so.
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
    <SectionCard title="Coding and test scores">
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((r) => r.kind === "test" ? (
          <div key={r.id} style={box}>
            <FileText size={15} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{r.test_name} <span style={{ fontWeight: 500, color: "var(--text-2)" }}>{testScoreText(r)}</span></div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{["Self-reported", takenOnText(r.taken_on) ? `taken ${takenOnText(r.taken_on)}` : null].filter(Boolean).join(" · ")}</div>
            </div>
          </div>
        ) : (
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
