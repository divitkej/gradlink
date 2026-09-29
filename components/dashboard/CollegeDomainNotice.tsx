"use client";

import { useEffect, useState } from "react";
import { myCollegeDomain, type DomainStatus } from "@/lib/college-domains";
import { OPERATOR } from "@/lib/site";

const COPY: Record<DomainStatus, (d: string) => string> = {
  pending: (d) => `Your students' email domain @${d} is being reviewed. Students with @${d} addresses can sign up once it's approved. Employers and events are unaffected.`,
  approved: (d) => `@${d} is approved. Students with @${d} addresses can sign up.`,
  rejected: (d) => `@${d} wasn't approved, so students can't sign up with it. Email ${OPERATOR.email} from your official address to have it reviewed again.`,
};

/** Shows a college whether its students' email domain is approved for sign-up. */
export default function CollegeDomainNotice() {
  const [reg, setReg] = useState<{ domain: string; status: DomainStatus } | null>(null);

  useEffect(() => {
    let cancelled = false;
    myCollegeDomain().then((r) => { if (!cancelled) setReg(r); }, () => undefined);
    return () => { cancelled = true; };
  }, []);

  // Approved is the normal state, so it stays quiet.
  if (!reg || reg.status === "approved") return null;
  return (
    <div role="status" style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--text)", padding: "12px 14px", marginBottom: 20, border: `1px solid ${reg.status === "pending" ? "rgba(247,201,72,0.35)" : "var(--border-strong)"}`, borderRadius: "var(--r-md)", background: "rgba(255,255,255,0.03)" }}>
      {COPY[reg.status](reg.domain)}
    </div>
  );
}
