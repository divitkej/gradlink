"use client";

import { useState } from "react";
import { CalendarPlus, AlertCircle, Loader2 } from "lucide-react";
import { createEvent, type EventStatus } from "@/lib/events";
import { useSession } from "@/lib/session";
import { useActiveEvent } from "@/lib/use-active-event";

function Field({
  id, label, value, onChange, placeholder, type = "text",
}: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 160 }}>
      <label htmlFor={id} style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-2)" }}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          height: 44, padding: "0 13px", fontSize: 14, color: "var(--text)",
          background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
          borderRadius: "var(--r-md)", outline: "none", colorScheme: "dark",
        }}
      />
    </div>
  );
}

/** Colleges create their own events. The join code is generated server-side. */
export default function CreateEventForm({ onCreated }: { onCreated?: (eventId: string) => void }) {
  const { session, selectEvent } = useSession();
  const { refresh } = useActiveEvent();

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<EventStatus>("upcoming");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!session) return;
    if (endDate && startDate && endDate < startDate) {
      setError("The end date can't be before the start date.");
      return;
    }

    setBusy(true);
    const res = await createEvent({
      title, location, startDate, endDate, description, status,
      createdBy: session.profileId,
      hostOrg: session.org,
    });
    setBusy(false);

    if (!res.ok || !res.event) {
      setError(res.error ?? "Couldn't create the event.");
      return;
    }
    selectEvent(res.event.id);
    refresh();
    onCreated?.(res.event.id);
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Field id="ev-title" label="Event name" value={title} onChange={setTitle} placeholder="Spring Career Fair 2027" />

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Field id="ev-loc" label="Location" value={location} onChange={setLocation} placeholder="Main Auditorium" />
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 160 }}>
          <label htmlFor="ev-status" style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-2)" }}>Status</label>
          <select
            id="ev-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as EventStatus)}
            style={{
              height: 44, padding: "0 13px", fontSize: 14, color: "var(--text)",
              background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
              borderRadius: "var(--r-md)", outline: "none", colorScheme: "dark",
            }}
          >
            <option value="draft">Draft — not visible yet</option>
            <option value="upcoming">Upcoming</option>
            <option value="live">Live now</option>
          </select>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Field id="ev-start" label="Starts" value={startDate} onChange={setStartDate} type="date" />
        <Field id="ev-end" label="Ends" value={endDate} onChange={setEndDate} type="date" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor="ev-desc" style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-2)" }}>
          Description <span style={{ color: "var(--text-muted)" }}>(optional)</span>
        </label>
        <textarea
          id="ev-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Who it's for, which employers are attending, what students should bring."
          style={{
            padding: "11px 13px", fontSize: 14, color: "var(--text)", resize: "vertical",
            background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
            borderRadius: "var(--r-md)", outline: "none", fontFamily: "var(--font-body)",
          }}
        />
      </div>

      {error && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: "var(--danger)" }}>
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={busy || !title.trim()}
        style={{
          alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 8,
          height: 46, padding: "0 22px", borderRadius: "var(--r-md)",
          fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14.5,
          border: "none", color: "#021016",
          background: "linear-gradient(100deg, var(--cyan), var(--teal))",
          cursor: busy || !title.trim() ? "default" : "pointer",
          opacity: busy || !title.trim() ? 0.6 : 1,
        }}
      >
        {busy ? <Loader2 size={15} className="gl-spin" /> : <CalendarPlus size={16} />}
        {busy ? "Creating…" : "Create event"}
      </button>

      <style>{`
        .gl-spin { animation: gl-spin 0.9s linear infinite; }
        @keyframes gl-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .gl-spin { animation: none; } }
      `}</style>
    </form>
  );
}
