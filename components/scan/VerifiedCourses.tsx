"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, BookOpen, ExternalLink } from "lucide-react";
import { SectionCard } from "@/components/dashboard/cards";
import { listStudentCourses, courseraVerifyUrl, type StudentCourseRow } from "@/lib/db";
import { fmtMonthYear } from "@/lib/format";

/**
 * The Coursera courses a student chose to show: finished ones verified with
 * Coursera (anyone can re-check them there), and ones they are taking now.
 */
export default function VerifiedCourses({ studentId }: { studentId: string }) {
  const [rows, setRows] = useState<StudentCourseRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listStudentCourses(studentId).then((r) => { if (!cancelled) setRows(r); });
    return () => { cancelled = true; };
  }, [studentId]);

  if (!rows || rows.length === 0) return null;
  const done = rows.filter((c) => c.status === "certificate");
  const taking = rows.filter((c) => c.status === "in_progress");

  return (
    <SectionCard title="Courses" hint={[done.length ? `${done.length} completed` : null, taking.length ? `${taking.length} in progress` : null].filter(Boolean).join(" · ")}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {done.map((c) => (
          <div key={c.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)" }}>
            <BadgeCheck size={16} color="var(--accent)" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{c.course_name}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                {[c.partner_name, `Verified by Coursera${c.completed_at ? `, completed ${fmtMonthYear(c.completed_at)}` : ""}`].filter(Boolean).join(" · ")}
              </div>
              {c.skills.length > 0 && <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 3 }}>{c.skills.slice(0, 6).join(", ")}</div>}
            </div>
            {c.certificate_code && (
              <a href={courseraVerifyUrl(c.certificate_code)} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--text-2)", whiteSpace: "nowrap" }}>
                <ExternalLink size={12} /> Check on Coursera
              </a>
            )}
          </div>
        ))}
        {taking.map((c) => (
          <div key={c.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)" }}>
            <BookOpen size={15} color="var(--text-muted)" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 13, color: "var(--text)" }}>{c.course_name}</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.partner_name ? ` · ${c.partner_name}` : ""} · Currently taking</span>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
