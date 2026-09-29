"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { SmallButton } from "./cards";
import { joinQueue, leaveQueue, type MyQueueRow } from "@/lib/db";

/**
 * Join, follow and leave a company's booth queue. Only shown while the event
 * is live, because that is the only time the server accepts a queue.
 */
export default function QueueControl({ eventId, companyId, queue, live, onChange }: {
  eventId: string;
  companyId: string;
  queue?: MyQueueRow;
  live: boolean;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!live && !queue) return null;

  async function join() {
    setBusy(true);
    setError(null);
    const res = await joinQueue(eventId, companyId);
    if (!res.ok) setError(res.error);
    setBusy(false);
    onChange();
  }
  async function leave() {
    setBusy(true);
    setError(null);
    await leaveQueue(eventId, companyId);
    setBusy(false);
    onChange();
  }

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      {!queue ? (
        <SmallButton icon={<Users size={13} />} disabled={busy} onClick={join}>{busy ? "Joining…" : "Join queue"}</SmallButton>
      ) : (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: queue.status === "called" ? "var(--text)" : "var(--amber)", whiteSpace: "nowrap" }}>
            {queue.status === "called" ? "Your turn, go now" : `#${queue.position} in queue`}
          </span>
          <SmallButton disabled={busy} onClick={leave}>{busy ? "Leaving…" : "Leave"}</SmallButton>
        </span>
      )}
      {error && <span role="alert" style={{ fontSize: 11.5, color: "var(--danger)", maxWidth: 220, textAlign: "right" }}>{error}</span>}
    </span>
  );
}
