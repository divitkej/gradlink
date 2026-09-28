"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * The code students and companies type to join an event. Tapping copies it.
 * `labelled` adds a caption for places where the code needs explaining.
 */
export default function JoinCode({ code, labelled = false }: { code: string; labelled?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked: the code is on screen to read anyway */
    }
  }

  const button = (
    <button
      type="button"
      onClick={copy}
      title="Copy join code"
      aria-label={copied ? `Join code ${code} copied` : `Copy join code ${code}`}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px",
        borderRadius: "var(--r-sm)", cursor: "pointer",
        background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.28)",
        color: "var(--accent-2)", fontFamily: "var(--font-display)", fontWeight: 700,
        fontSize: 13, letterSpacing: "0.14em",
      }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {code}
    </button>
  );

  if (!labelled) return button;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
      <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Join code for students and companies</span>
      {button}
    </div>
  );
}
