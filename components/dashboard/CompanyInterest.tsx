"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GlassPanel, PanelTitle } from "./widgets";
import { Badge } from "@/components/ui/primitives";
import { listStudentInterest, type StudentInterestRow } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";

/**
 * Students who tapped "Interested" or "Request follow-up" on the company's
 * page. Follow-up requests come first: they are asking to be contacted.
 */
export default function CompanyInterest({ eventId }: { eventId: string }) {
  const [rows, setRows] = useState<StudentInterestRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = () => listStudentInterest(eventId).then((r) => { if (!cancelled) setRows(r); });
    run();
    const t = window.setInterval(() => { if (document.visibilityState === "visible") run(); }, 60_000);
    return () => { cancelled = true; window.clearInterval(t); };
  }, [eventId]);

  const followUps = rows?.filter((r) => r.follow_up).length ?? 0;

  return (
    <GlassPanel id="interest">
      <PanelTitle hint={rows ? `${followUps} follow-up ${followUps === 1 ? "request" : "requests"}` : undefined}>Students interested in you</PanelTitle>
      {!rows ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Loading…</p>
      ) : rows.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55 }}>
          When a student opens your company page and taps Interested or Request follow-up, they appear here.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((r) => (
            <div key={r.student_id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)" }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{r.full_name}</span>
                <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)" }}>
                  {[r.degree, r.university].filter(Boolean).join(" · ") || `Updated ${fmtDateTime(r.updated_at)}`}
                </span>
              </span>
              <Badge tone={r.follow_up ? "amber" : "teal"}>{r.follow_up ? "Wants a follow-up" : "Interested"}</Badge>
              <Link href={`/scan/student/${r.student_id}?eventId=${eventId}`} style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", textDecoration: "none", whiteSpace: "nowrap" }}>View</Link>
            </div>
          ))}
        </div>
      )}
    </GlassPanel>
  );
}
