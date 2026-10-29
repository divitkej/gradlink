"use client";

import { Check, X } from "lucide-react";

export interface PwRule {
  label: string;
  test: (v: string) => boolean;
}

export const PASSWORD_RULES: PwRule[] = [
  { label: "At least 8 characters", test: (v) => v.length >= 8 },
  { label: "An uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { label: "A lowercase letter", test: (v) => /[a-z]/.test(v) },
  { label: "A number", test: (v) => /[0-9]/.test(v) },
  { label: "A symbol (!@#$…)", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export function passwordIsStrong(v: string) {
  return PASSWORD_RULES.every((r) => r.test(v));
}

/** Live checklist — each rule ticks teal as the typed password satisfies it. */
export default function PasswordChecklist({ value }: { value: string }) {
  return (
    <ul
      style={{
        listStyle: "none",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "6px 12px",
        margin: "10px 0 0",
        padding: 0,
      }}
    >
      {PASSWORD_RULES.map((r) => {
        const ok = r.test(value);
        return (
          <li key={r.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                background: ok ? "var(--accent-2)" : "rgba(255,255,255,0.06)",
                border: ok ? "none" : "1px solid var(--border)",
                transition: "all 0.18s",
              }}
            >
              {ok ? (
                <Check size={11} color="#0A0A0A" strokeWidth={3} />
              ) : (
                <X size={10} color="var(--text-muted)" strokeWidth={2.5} />
              )}
            </span>
            <span style={{ fontSize: 12, color: ok ? "var(--text-2)" : "var(--text-muted)", transition: "color 0.18s" }}>
              {r.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
