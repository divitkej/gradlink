"use client";

import { useState } from "react";
import { Check, Copy, RefreshCw, GraduationCap, Briefcase } from "lucide-react";
import { regenerateEventCode, type EventRow } from "@/lib/events";

type CodeRole = "student" | "company";

const LABEL: Record<CodeRole, string> = { student: "Student code", company: "Employer code" };

function CodeRow({
  eventId, role, code, onChanged,
}: {
  eventId: string; role: CodeRole; code: string | null; onChanged: (code: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const Icon = role === "student" ? GraduationCap : Briefcase;

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked; the code is on screen to read anyway */
    }
  }

  async function replace() {
    const who = role === "student" ? "Students" : "Employers";
    if (!window.confirm(`Make a new ${LABEL[role].toLowerCase()}? The current one stops working straight away. ${who} who already joined stay in the event.`)) return;
    setBusy(true);
    setError(null);
    const next = await regenerateEventCode(eventId, role);
    setBusy(false);
    if (next) onChanged(next);
    else setError("Couldn't make a new code. Please try again.");
  }

  const btn: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, height: 34, padding: "0 11px",
    borderRadius: "var(--r-sm)", cursor: "pointer", fontSize: 12.5, fontWeight: 600,
    color: "var(--text-2)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "10px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-md)" }}>
      <Icon size={16} color="var(--text-muted)" />
      <span style={{ fontSize: 12.5, color: "var(--text-muted)", minWidth: 96 }}>{LABEL[role]}</span>
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, letterSpacing: "0.16em", color: "var(--text)", flex: 1 }}>
        {code ?? "Not set"}
      </span>
      <button type="button" onClick={copy} disabled={!code} style={btn} aria-label={`Copy ${LABEL[role].toLowerCase()}`}>
        {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
      </button>
      <button type="button" onClick={replace} disabled={busy} style={{ ...btn, opacity: busy ? 0.6 : 1 }}>
        <RefreshCw size={13} /> New code
      </button>
      {error && <span style={{ width: "100%", fontSize: 12, color: "var(--danger)" }}>{error}</span>}
    </div>
  );
}

/**
 * The two codes an organiser hands out: one for students, a different one for
 * employers. Each only works for its own account type.
 */
export default function EventCodes({ event, onChange }: { event: EventRow; onChange?: (event: EventRow) => void }) {
  const [codes, setCodes] = useState({ student: event.student_code ?? null, company: event.company_code ?? null });

  function changed(role: CodeRole, code: string) {
    const next = { ...codes, [role]: code };
    setCodes(next);
    onChange?.({ ...event, student_code: next.student, company_code: next.company });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <CodeRow eventId={event.id} role="student" code={codes.student} onChanged={(c) => changed("student", c)} />
      <CodeRow eventId={event.id} role="company" code={codes.company} onChanged={(c) => changed("company", c)} />
    </div>
  );
}
