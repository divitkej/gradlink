"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import Logo from "@/components/Logo";
import { Badge } from "@/components/ui/primitives";
import { SectionCard, LoadingBlock } from "@/components/dashboard/cards";
import { ApiError } from "@/lib/api-client";
import { listCollegeDomains, decideCollegeDomain, type CollegeDomain, type DomainStatus } from "@/lib/college-domains";

/* ============================================================
   Owner page (/admin/colleges): approve the email domains colleges
   sign up with. Students can only register on approved domains.
   Only the emails in ADMIN_EMAILS get data; everyone else sees 404.
   ============================================================ */

const STATUS: Record<DomainStatus, { label: string; tone: "amber" | "teal" | "muted" }> = {
  pending: { label: "Pending", tone: "amber" },
  approved: { label: "Approved", tone: "teal" },
  rejected: { label: "Rejected", tone: "muted" },
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const btn = (primary: boolean, disabled: boolean): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 13px", borderRadius: "var(--r-sm)",
  fontSize: 13, fontWeight: 600, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.6 : 1,
  color: primary ? "#0A0A0A" : "var(--text-2)",
  background: primary ? "var(--accent)" : "rgba(255,255,255,0.04)",
  border: primary ? "1px solid var(--accent)" : "1px solid var(--border)",
});

function Row({ d, busy, onDecide }: {
  d: CollegeDomain; busy: boolean;
  onDecide: (action: "approve" | "reject", approveAs?: string) => void;
}) {
  const [approveAs, setApproveAs] = useState(d.domain);
  const s = STATUS[d.status];
  return (
    <div style={{ padding: "16px 0", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", overflowWrap: "anywhere" }}>{d.institution}</div>
          <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 2, overflowWrap: "anywhere" }}>Students: @{d.domain}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, overflowWrap: "anywhere" }}>
            {`Requested ${fmtDate(d.created_at)}${d.requested_by_email ? ` by ${d.requested_by_email}` : ""}`}
            {d.decided_at ? ` · ${s.label} ${fmtDate(d.decided_at)}` : ""}
          </div>
          {d.requested_by_email && !d.staff_domain_matches && d.status === "pending" && (
            <div style={{ fontSize: 12, color: "var(--amber)", marginTop: 4 }}>
              The staff email is on a different domain from the students. Check this college is who it says before approving.
            </div>
          )}
        </div>
        <Badge tone={s.tone}>{s.label}</Badge>
      </div>

      {d.status !== "approved" && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <label htmlFor={`as-${d.domain}`} style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Approve as @</label>
          <input
            id={`as-${d.domain}`}
            value={approveAs}
            onChange={(e) => setApproveAs(e.target.value)}
            spellCheck={false}
            autoCapitalize="off"
            style={{ flex: "1 1 160px", minWidth: 0, height: 36, padding: "0 10px", borderRadius: "var(--r-sm)", fontSize: 13, color: "var(--text)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}
          />
          <button type="button" disabled={busy} onClick={() => onDecide("approve", approveAs)} style={btn(true, busy)}>
            <Check size={14} /> Approve
          </button>
          {d.status === "pending" && (
            <button type="button" disabled={busy} onClick={() => onDecide("reject")} style={btn(false, busy)}>
              <X size={14} /> Reject
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function CollegeApprovals() {
  const [domains, setDomains] = useState<CollegeDomain[] | null>(null);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setDomains(await listCollegeDomains());
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? { status: e.status, message: e.message } : { status: 0, message: "Couldn't reach the server." });
    }
  }, []);

  useEffect(() => {
    const first = requestAnimationFrame(() => { void load(); });
    return () => cancelAnimationFrame(first);
  }, [load]);

  async function decide(d: CollegeDomain, action: "approve" | "reject", approveAs?: string) {
    setBusy(d.domain);
    setNotice(null);
    try {
      setDomains(await decideCollegeDomain(d.domain, action, approveAs));
      setNotice(action === "approve"
        ? `Approved. Students with @${(approveAs || d.domain).trim().toLowerCase()} addresses can now sign up.`
        : `Rejected @${d.domain}.`);
    } catch (e) {
      setNotice(e instanceof ApiError ? e.message : "Couldn't reach the server.");
    } finally {
      setBusy(null);
    }
  }

  const pending = (domains ?? []).filter((d) => d.status === "pending");
  const decided = (domains ?? []).filter((d) => d.status !== "pending");

  let body: React.ReactNode;
  if (error?.status === 404 || error?.status === 401) {
    body = (
      <SectionCard title="Not available">
        <p style={{ fontSize: 13.5, color: "var(--text-2)" }}>
          This page is only for the GradLink owner. <Link href="/sign-in" style={{ color: "var(--text)" }}>Sign in</Link> with the owner account to continue.
        </p>
      </SectionCard>
    );
  } else if (error) {
    body = <SectionCard title="Couldn't load requests"><p style={{ fontSize: 13.5, color: "var(--text-2)" }}>{error.message}</p></SectionCard>;
  } else if (!domains) {
    body = <LoadingBlock label="Loading college requests…" />;
  } else {
    body = (
      <>
        {notice && <div role="status" style={{ fontSize: 13.5, color: "var(--text)", padding: "12px 14px", border: "1px solid var(--border-strong)", borderRadius: "var(--r-md)" }}>{notice}</div>}
        <SectionCard title={`Waiting for approval (${pending.length})`}>
          <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text-muted)", marginBottom: 4 }}>
            Approving a domain lets students with that email sign up. Approve it exactly as given unless you are sure: widening dubai.bits-pilani.ac.in to bits-pilani.ac.in would also admit the other campuses.
          </p>
          {pending.length === 0
            ? <p style={{ fontSize: 13.5, color: "var(--text-muted)" }}>No colleges are waiting.</p>
            : pending.map((d) => <Row key={d.domain} d={d} busy={busy === d.domain} onDecide={(a, as) => void decide(d, a, as)} />)}
        </SectionCard>
        <SectionCard title={`Decided (${decided.length})`}>
          {decided.length === 0
            ? <p style={{ fontSize: 13.5, color: "var(--text-muted)" }}>Nothing decided yet.</p>
            : decided.map((d) => <Row key={d.domain} d={d} busy={busy === d.domain} onDecide={(a, as) => void decide(d, a, as)} />)}
        </SectionCard>
      </>
    );
  }

  return (
    <div style={{ minHeight: "100svh", position: "relative", zIndex: 1 }}>
      <header style={{ position: "sticky", top: 0, zIndex: 30, display: "flex", alignItems: "center", gap: 14, padding: "14px clamp(16px, 3vw, 32px)", background: "rgba(10,10,10,0.7)", backdropFilter: "blur(16px)", borderBottom: "1px solid var(--border)" }}>
        <Link href="/" style={{ textDecoration: "none" }}><Logo size={20} /></Link>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "var(--text)" }}>College approvals</h1>
      </header>
      <main style={{ padding: "clamp(16px, 3vw, 32px)", maxWidth: 880, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        {body}
      </main>
    </div>
  );
}
