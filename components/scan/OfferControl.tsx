"use client";

import { useEffect, useState } from "react";
import { Award } from "lucide-react";
import { SectionCard, SmallButton, Labeled, fieldStyle } from "@/components/dashboard/cards";
import { getCompanyByProfile, listOffersForCompany, recordOffer, withdrawOffer, type OfferRow } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";

/**
 * A company recording an offer it made to a student it met at the event. The
 * student sees it in their applications, and it counts toward the event's
 * offers and placement rate on the college's report.
 */
export default function OfferControl({ eventId, companyId, studentId, firstName }: {
  eventId: string; companyId: string; studentId: string; firstName: string;
}) {
  const [offer, setOffer] = useState<OfferRow | null | undefined>(undefined);
  const [roles, setRoles] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listOffersForCompany(eventId), getCompanyByProfile(companyId)]).then(([list, me]) => {
      if (cancelled) return;
      // A failed load hides the card rather than offering to record a second offer.
      setOffer(list ? list.find((o) => o.student_id === studentId) ?? null : undefined);
      setRoles(me?.hiring_roles ?? []);
    });
    return () => { cancelled = true; };
  }, [eventId, companyId, studentId]);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await recordOffer({ eventId, studentId, roleTitle: role });
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setOffer(res.offer);
    setOpen(false);
  }

  async function withdraw() {
    if (!offer || !window.confirm(`Withdraw the ${offer.role_title} offer to ${firstName}? They will be told.`)) return;
    setBusy(true);
    const ok = await withdrawOffer(eventId, studentId);
    setBusy(false);
    if (ok) setOffer(null);
    else setError("Couldn't withdraw the offer. Please try again.");
  }

  if (offer === undefined) return null;

  return (
    <SectionCard title="Offer">
      {offer && !open ? (
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <Award size={17} color="var(--accent-2)" />
          <span style={{ flex: 1, minWidth: 200, fontSize: 13.5, color: "var(--text)" }}>
            Offer made for <strong>{offer.role_title}</strong> on {fmtDateTime(offer.created_at)}.
          </span>
          <SmallButton onClick={() => { setError(null); setRole(offer.role_title); setOpen(true); }}>Change role</SmallButton>
          <SmallButton tone="danger" disabled={busy} onClick={withdraw}>Withdraw</SmallButton>
        </div>
      ) : !open ? (
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ flex: 1, minWidth: 200, fontSize: 13, color: "var(--text-2)" }}>
            Made {firstName} an offer? Record it so it shows in their applications and in the event&apos;s results.
          </span>
          <SmallButton tone="primary" icon={<Award size={13} />} onClick={() => { setError(null); setRole(""); setOpen(true); }}>Record an offer</SmallButton>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Labeled label="Role offered">
            <input value={role} maxLength={200} list="offer-roles" onChange={(e) => setRole(e.target.value)} placeholder="Graduate Analyst" style={fieldStyle} />
            <datalist id="offer-roles">{roles.map((r) => <option key={r} value={r} />)}</datalist>
          </Labeled>
          {error && <p role="alert" style={{ fontSize: 12.5, color: "var(--danger)" }}>{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <SmallButton tone="primary" disabled={busy || !role.trim()} onClick={save}>{busy ? "Saving…" : offer ? "Save role" : "Record offer"}</SmallButton>
            <SmallButton onClick={() => setOpen(false)}>Cancel</SmallButton>
          </div>
        </div>
      )}
      {error && !open && <p role="alert" style={{ fontSize: 12.5, color: "var(--danger)", marginTop: 8 }}>{error}</p>}
    </SectionCard>
  );
}
