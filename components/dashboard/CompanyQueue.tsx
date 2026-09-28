"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { GlassPanel, PanelTitle } from "./widgets";
import { SmallButton } from "./cards";
import { listBoothQueue, callNextInQueue, markQueueEntry, type BoothQueueRow } from "@/lib/db";
import { fmtTime } from "@/lib/format";

/**
 * The company's live booth queue. Calling the next student sends them an
 * alert that it is their turn. Shows what students chose to share only.
 */
export default function CompanyQueue({ eventId, live }: { eventId: string; live: boolean }) {
  const [rows, setRows] = useState<BoothQueueRow[]>([]);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    const run = () => listBoothQueue(eventId).then((r) => { if (!cancelled) setRows(r); });
    run();
    const t = window.setInterval(() => { if (document.visibilityState === "visible") run(); }, 20_000);
    return () => { cancelled = true; window.clearInterval(t); };
  }, [eventId, version]);

  const waiting = rows.filter((r) => r.status === "waiting").length;

  async function callNext() {
    setBusy(true);
    await callNextInQueue(eventId);
    setBusy(false);
    reload();
  }
  async function mark(studentId: string, status: "seen" | "left") {
    await markQueueEntry(eventId, studentId, status);
    reload();
  }

  return (
    <GlassPanel id="queue">
      <PanelTitle hint={live ? `${waiting} waiting` : "Opens when the event is live"}>Booth queue</PanelTitle>
      {rows.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55 }}>
          {live ? "Nobody is waiting. Students join your queue from their plan or by scanning your QR." : "Students can queue for your booth once the event is live."}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((r, i) => (
            <div key={r.student_id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", background: r.status === "called" ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.02)", border: `1px solid ${r.status === "called" ? "var(--border-strong)" : "var(--border)"}`, borderRadius: "var(--r-sm)" }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 12.5, fontWeight: 700, color: "var(--text-muted)", width: 18 }}>{r.status === "called" ? "" : i + 1 - rows.filter((x) => x.status === "called").length}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{r.full_name}</span>
                <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)" }}>
                  {r.status === "called" ? `Called at ${fmtTime(r.called_at ?? r.created_at)}` : [r.degree, r.target_roles?.length ? `Looking for ${r.target_roles.slice(0, 2).join(", ")}` : null].filter(Boolean).join(" · ") || `Joined ${fmtTime(r.created_at)}`}
                </span>
              </span>
              {r.status === "called" && (
                <>
                  <SmallButton tone="primary" onClick={() => mark(r.student_id, "seen")}>Seen</SmallButton>
                  <SmallButton onClick={() => mark(r.student_id, "left")}>Not here</SmallButton>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      {live && (
        <div style={{ marginTop: 12 }}>
          <SmallButton tone="primary" icon={<BellRing size={13} />} disabled={busy || waiting === 0} onClick={callNext}>
            {busy ? "Calling…" : "Call next student"}
          </SmallButton>
        </div>
      )}
    </GlassPanel>
  );
}
