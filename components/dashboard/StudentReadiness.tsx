"use client";

import { useState } from "react";
import Link from "next/link";
import { Award, Check, ChevronDown, Circle, Clock, Minus } from "lucide-react";
import { SectionCard } from "./cards";
import { Meter } from "@/components/ui/primitives";
import { READINESS_WEIGHTS, type ActionItem, type Competency, type Readiness } from "@/lib/readiness";

/**
 * The Career Readiness Hub: competency breakdown, how the overall score is
 * made up, and the personalised action plan that leads to Fair-Ready.
 */
export default function StudentReadiness({
  comps, plan, readiness, fairReady,
}: {
  comps: Competency[];
  plan: ActionItem[];
  readiness: Readiness;
  fairReady: { ready: boolean; remaining: number };
}) {
  const [open, setOpen] = useState<string | null>(null);
  const parts: { label: string; value: number; weight: number }[] = [
    { label: "Résumé score", value: readiness.resume, weight: READINESS_WEIGHTS.resume },
    { label: "Profile complete", value: readiness.profile, weight: READINESS_WEIGHTS.profile },
    { label: "Competencies", value: readiness.competency, weight: READINESS_WEIGHTS.competency },
    { label: "Event checklist", value: readiness.checklist, weight: READINESS_WEIGHTS.checklist },
  ];

  return (
    <div className="dash-2col" id="readiness" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <SectionCard title="Competencies" hint="From your profile and event activity">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {comps.map((c) => {
            const isOpen = open === c.key;
            return (
              <div key={c.key} style={{ borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                <button
                  onClick={() => setOpen(isOpen ? null : c.key)}
                  aria-expanded={isOpen}
                  style={{ width: "100%", background: "transparent", border: "none", padding: "6px 0", cursor: "pointer", textAlign: "left" }}
                >
                  <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 13.5, color: "var(--text-2)" }}>{c.label}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{c.value}%</span>
                      <ChevronDown size={14} color="var(--text-muted)" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                    </span>
                  </span>
                  <Meter value={c.value} tone={c.value >= 70 ? "var(--accent)" : c.value >= 40 ? "var(--accent-2)" : "var(--text-muted)"} height={6} />
                </button>
                {isOpen && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 0 4px" }}>
                    {c.evidence.map((e) => {
                      const done = e.earned >= e.max;
                      const partial = !done && e.earned > 0;
                      return (
                        <div key={e.label} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12.5 }}>
                          {done ? <Check size={14} color="var(--accent)" /> : partial ? <Clock size={13} color="var(--accent-2)" /> : <Circle size={12} color="var(--text-muted)" />}
                          {done ? (
                            <span style={{ flex: 1, color: "var(--text-2)" }}>{e.label}</span>
                          ) : (
                            <Link href={e.href} style={{ flex: 1, color: "var(--text)", textDecoration: "underline", textDecorationColor: "var(--border-strong)", textUnderlineOffset: 3 }}>{e.label}</Link>
                          )}
                          <span style={{ color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{Math.round(e.earned)}/{e.max}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 8 }}>How your readiness score of {readiness.score}% is worked out</div>
          <div className="rd-parts" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {parts.map((p) => (
              <div key={p.label} style={{ padding: "8px 10px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", fontFamily: "var(--font-display)" }}>{p.value}%</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{p.label} · {Math.round(p.weight * 100)}%</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.5 }}>
            An estimate from what is on your profile and what you have done at this event. It is not a test score.
          </p>
        </div>
      </SectionCard>

      <SectionCard title="Your action plan" hint={`${plan.filter((i) => i.status === "complete").length} of ${plan.filter((i) => i.status !== "unavailable").length} done`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {plan.map((a) => <ActionRow key={a.key} item={a} />)}
        </div>
        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: fairReady.ready ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${fairReady.ready ? "var(--border-strong)" : "var(--border)"}`, borderRadius: "var(--r-md)" }}>
          <Award size={18} color={fairReady.ready ? "var(--accent)" : "var(--text-muted)"} />
          <span style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.45 }}>
            {fairReady.ready
              ? <>You have earned the <strong style={{ color: "var(--text)" }}>Fair-Ready</strong> badge for this event.</>
              : <>Complete {fairReady.remaining} more required {fairReady.remaining === 1 ? "item" : "items"} to unlock the <strong style={{ color: "var(--text)" }}>Fair-Ready</strong> badge.</>}
          </span>
        </div>
      </SectionCard>

      <style>{`@media (max-width: 520px) { .rd-parts { grid-template-columns: repeat(2, 1fr) !important; } }`}</style>
    </div>
  );
}

const STATUS: Record<ActionItem["status"], { label: string; color: string }> = {
  complete: { label: "Complete", color: "var(--accent)" },
  pending: { label: "Required", color: "var(--text)" },
  recommended: { label: "Recommended", color: "var(--accent-2)" },
  unavailable: { label: "Not scheduled", color: "var(--text-muted)" },
};

function ActionRow({ item }: { item: ActionItem }) {
  const st = STATUS[item.status];
  const done = item.status === "complete";
  const Icon = done ? Check : item.status === "unavailable" ? Minus : Clock;
  const body = (
    <>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13.5, color: done ? "var(--text-2)" : "var(--text)" }}>{item.label}</span>
        {item.detail && <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)", marginTop: 1 }}>{item.detail}</span>}
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, color: st.color, flexShrink: 0 }}>
        <Icon size={13} /> {st.label}
      </span>
    </>
  );
  const style: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", textDecoration: "none",
    background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)",
  };
  return done || item.status === "unavailable"
    ? <div style={style}>{body}</div>
    : <Link href={item.href} className="rd-action" style={style}>{body}</Link>;
}
