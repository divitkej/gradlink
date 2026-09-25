"use client";

import { useState } from "react";
import { Ticket, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { joinEventByCode } from "@/lib/events";
import { useSession } from "@/lib/session";
import { useActiveEvent } from "@/lib/use-active-event";

/**
 * Students and employers join an event with the short code their college
 * shares. Codes are case-insensitive and ignore spaces, because people type
 * them off a slide.
 */
export default function JoinEventForm({ onJoined }: { onJoined?: (eventId: string) => void }) {
  const { session, selectEvent } = useSession();
  const { refresh } = useActiveEvent();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!session) return;

    setBusy(true);
    const res = await joinEventByCode(code, session.profileId, session.role);
    setBusy(false);

    if (!res.ok || !res.event) {
      setError(res.error ?? "Couldn't join that event.");
      return;
    }
    selectEvent(res.event.id);
    refresh();
    onJoined?.(res.event.id);
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <label htmlFor="join-code" style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-2)" }}>
        Event code
      </label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 180, display: "flex", alignItems: "center" }}>
          <Ticket size={16} style={{ position: "absolute", left: 13, color: "var(--text-muted)" }} />
          <input
            id="join-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
            placeholder="ABC123"
            autoComplete="off"
            spellCheck={false}
            maxLength={8}
            style={{
              width: "100%", height: 46, padding: "0 14px 0 40px",
              fontSize: 16, letterSpacing: "0.18em", fontFamily: "var(--font-display)", fontWeight: 600,
              color: "var(--text)", background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--border)", borderRadius: "var(--r-md)", outline: "none",
            }}
          />
        </div>
        <button
          type="submit"
          disabled={busy || !code.trim()}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8, height: 46, padding: "0 20px",
            borderRadius: "var(--r-md)", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14.5,
            border: "none", color: "#0A0A0A",
            background: "linear-gradient(100deg, var(--accent), var(--accent-2))",
            cursor: busy || !code.trim() ? "default" : "pointer",
            opacity: busy || !code.trim() ? 0.6 : 1,
          }}
        >
          {busy ? <Loader2 size={15} className="gl-spin" /> : <ArrowRight size={15} />}
          {busy ? "Joining…" : "Join event"}
        </button>
      </div>

      {error && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: "var(--danger)" }}>
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      <style>{`
        .gl-spin { animation: gl-spin 0.9s linear infinite; }
        @keyframes gl-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .gl-spin { animation: none; } }
      `}</style>
    </form>
  );
}
