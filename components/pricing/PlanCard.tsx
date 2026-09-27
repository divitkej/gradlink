import type { ReactNode } from "react";
import { Check, Loader2, ArrowRight } from "lucide-react";

/** One plan on the pricing page. Pure layout: the caller decides what the button does. */
export default function PlanCard({
  name, tagline, price, listPrice, cadence, note, features, cta, onCta, busy, disabled, highlight, badge, children,
}: {
  name: string;
  tagline: string;
  price: string;
  /** Crossed-out price shown next to a discounted one. */
  listPrice?: string;
  cadence: string;
  /** A short line under the price, for the rule that makes this plan worth it. */
  note?: ReactNode;
  features: string[];
  cta: string;
  onCta: () => void;
  busy?: boolean;
  disabled?: boolean;
  highlight?: boolean;
  badge?: string;
  /** Extra controls between the price and the button, such as a campus picker. */
  children?: ReactNode;
}) {
  const inactive = busy || disabled;
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        background: "var(--glass)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: highlight ? "1px solid var(--border-strong)" : "1px solid var(--border)",
        borderRadius: "var(--r-xl)",
        padding: "clamp(22px, 3vw, 30px)",
        boxShadow: highlight
          ? "0 30px 90px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.10)"
          : "0 20px 60px rgba(0,0,0,0.35)",
      }}
    >
      {badge && (
        <div style={{ position: "absolute", top: -11, left: "clamp(22px, 3vw, 30px)", padding: "3px 10px", borderRadius: "var(--r-sm)", fontSize: 11, fontWeight: 700, letterSpacing: "0.03em", color: "#0A0A0A", background: "var(--accent)" }}>
          {badge}
        </div>
      )}

      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>{name}</h3>
      <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 18, lineHeight: 1.55 }}>{tagline}</p>

      <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "4px 8px", marginBottom: note ? 8 : 20 }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px, 3.6vw, 34px)", fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>{price}</span>
        {listPrice && (
          <span style={{ fontSize: 15, color: "var(--text-muted)", textDecoration: "line-through" }}>{listPrice}</span>
        )}
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{cadence}</span>
      </div>
      {note && <p style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.55, marginBottom: 20 }}>{note}</p>}

      {children}

      <button
        onClick={onCta}
        disabled={inactive}
        style={{
          width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
          height: 46, borderRadius: "var(--r-md)", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14.5,
          marginBottom: 22, cursor: inactive ? "default" : "pointer",
          border: highlight ? "none" : "1px solid var(--border)",
          color: highlight ? "#0A0A0A" : "var(--text)",
          background: highlight ? "var(--accent)" : "rgba(255,255,255,0.04)",
          opacity: inactive ? 0.6 : 1,
        }}
      >
        {busy ? <Loader2 size={15} className="gl-spin" /> : null}
        {busy ? "Opening checkout…" : cta}
        {!inactive && highlight ? <ArrowRight size={15} /> : null}
      </button>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {features.map((f) => (
          <li key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.5 }}>
            <Check size={15} color="var(--accent-2)" style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
