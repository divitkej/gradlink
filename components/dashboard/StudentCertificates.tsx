"use client";

import { useEffect, useState } from "react";
import { Award, BadgeCheck, ExternalLink } from "lucide-react";
import { GlassPanel, PanelTitle } from "./widgets";
import { SmallButton, RemoveButton, fieldStyle } from "./cards";
import {
  addCredlyBadge, addCertificate, listStudentCertificates, setStudentCertificateVisible, deleteStudentCertificate,
  type StudentCertificateRow,
} from "@/lib/db";
import { certificateDates, isExpired } from "@/lib/scores";

type Msg = { tone: "ok" | "error"; text: string } | null;
const EMPTY = { name: "", issuer: "", issuedOn: "", expiresOn: "", credentialUrl: "", credentialId: "" };
const muted: React.CSSProperties = { fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 };
const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "var(--text-2)" };

/**
 * Professional certificates on the career profile. A Credly badge (AWS,
 * Google Cloud, IBM, Cisco and many more) is checked with Credly and shown
 * as verified; any other certificate is shown as self-reported with the
 * credential link the student gives. The student chooses what employers see.
 */
export default function StudentCertificates({ profileId }: { profileId: string }) {
  const [rows, setRows] = useState<StudentCertificateRow[] | null>(null);
  const [version, setVersion] = useState(0);
  const [badge, setBadge] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState<"badge" | "manual" | null>(null);
  const [message, setMessage] = useState<Msg>(null);

  useEffect(() => {
    let cancelled = false;
    listStudentCertificates(profileId).then((r) => { if (!cancelled) setRows(r); });
    return () => { cancelled = true; };
  }, [profileId, version]);

  async function addBadge() {
    setBusy("badge");
    setMessage(null);
    const res = await addCredlyBadge(badge);
    setBusy(null);
    if (!res.ok) { setMessage({ tone: "error", text: res.error }); return; }
    setBadge("");
    setMessage({ tone: "ok", text: `Verified with Credly: ${res.certificate.name}${res.certificate.issuer ? ` by ${res.certificate.issuer}` : ""}.` });
    setVersion((v) => v + 1);
  }

  async function addManual() {
    setBusy("manual");
    setMessage(null);
    const res = await addCertificate(form);
    setBusy(null);
    if (!res.ok) { setMessage({ tone: "error", text: res.error }); return; }
    setForm(EMPTY);
    setMessage({ tone: "ok", text: `Added ${res.certificate.name}.` });
    setVersion((v) => v + 1);
  }

  async function toggle(c: StudentCertificateRow) {
    const next = !c.visible_to_employers;
    const flip = (value: boolean) => setRows((r) => (r ?? []).map((x) => (x.id === c.id ? { ...x, visible_to_employers: value } : x)));
    flip(next);
    if (!(await setStudentCertificateVisible(c.id, next))) {
      flip(!next);
      setMessage({ tone: "error", text: "Couldn't save that. Please try again." });
    }
  }

  async function remove(c: StudentCertificateRow) {
    if (!window.confirm(`Remove ${c.name} from your profile?`)) return;
    if (await deleteStudentCertificate(c.id)) setVersion((v) => v + 1);
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <GlassPanel id="certificates">
      <PanelTitle hint="Employers see the ones you choose">Certificates</PanelTitle>

      <form onSubmit={(e) => { e.preventDefault(); addBadge(); }} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor="cert-credly" style={{ fontSize: 12, color: "var(--text-2)" }}>Have a Credly badge? Paste its link</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input id="cert-credly" value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="credly.com/badges/..." style={fieldStyle} />
          <SmallButton type="submit" tone="primary" disabled={!badge.trim() || busy !== null}>{busy === "badge" ? "Checking…" : "Verify"}</SmallButton>
        </div>
        <span style={muted}>AWS, Google Cloud, IBM, Cisco, Oracle, CompTIA and many other issuers give certificates as Credly badges. We check the badge with Credly, and it must be issued to you.</span>
      </form>

      <form onSubmit={(e) => { e.preventDefault(); addManual(); }} style={{ marginTop: 18 }}>
        <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 8 }}>Any other certificate, like NPTEL, Microsoft or a university course. Employers see it marked as self-reported, with your credential link so they can check it.</div>
        <div className="cert-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <label style={labelStyle}>Certificate name
            <input value={form.name} maxLength={200} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Azure Fundamentals (AZ-900)" style={fieldStyle} />
          </label>
          <label style={labelStyle}>Issued by
            <input value={form.issuer} maxLength={200} onChange={(e) => setForm({ ...form, issuer: e.target.value })} placeholder="Microsoft" style={fieldStyle} />
          </label>
          <label style={labelStyle}>Credential link (optional)
            <input value={form.credentialUrl} maxLength={2000} onChange={(e) => setForm({ ...form, credentialUrl: e.target.value })} placeholder="https://" style={fieldStyle} />
          </label>
          <label style={labelStyle}>Credential ID (optional)
            <input value={form.credentialId} maxLength={120} onChange={(e) => setForm({ ...form, credentialId: e.target.value })} style={fieldStyle} />
          </label>
          <label style={labelStyle}>Date earned (optional)
            <input type="date" value={form.issuedOn} max={today} onChange={(e) => setForm({ ...form, issuedOn: e.target.value })} style={{ ...fieldStyle, colorScheme: "dark" }} />
          </label>
          <label style={labelStyle}>Expires (optional)
            <input type="date" value={form.expiresOn} onChange={(e) => setForm({ ...form, expiresOn: e.target.value })} style={{ ...fieldStyle, colorScheme: "dark" }} />
          </label>
        </div>
        <div style={{ marginTop: 10 }}>
          <SmallButton type="submit" disabled={!form.name.trim() || !form.issuer.trim() || busy !== null}>{busy === "manual" ? "Saving…" : "Add certificate"}</SmallButton>
        </div>
      </form>

      {message && <p role={message.tone === "error" ? "alert" : "status"} style={{ fontSize: 12.5, marginTop: 12, color: message.tone === "error" ? "var(--danger)" : "var(--text)" }}>{message.text}</p>}

      {rows && rows.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
          {rows.map((c) => (
            <div key={c.id} className="cert-row" style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-md)" }}>
              {c.verified_at ? <BadgeCheck size={17} color="var(--accent)" style={{ flexShrink: 0, marginTop: 1 }} /> : <Award size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 1 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{c.name}</div>
                <div style={{ ...muted, marginTop: 2 }}>
                  {[c.issuer, c.verified_at ? "Verified by Credly" : "Self-reported", certificateDates(c, today)].filter(Boolean).join(" · ")}
                </div>
                {isExpired(c, today) && <div style={{ fontSize: 12, color: "var(--amber)", marginTop: 2 }}>Expired. Renew it, or remove it if it no longer applies.</div>}
                <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-2)", cursor: "pointer" }}>
                    <input type="checkbox" checked={!!c.visible_to_employers} onChange={() => toggle(c)} /> Show to employers
                  </label>
                  {c.credential_url && (
                    <a href={c.credential_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-2)" }}>
                      <ExternalLink size={12} /> View credential
                    </a>
                  )}
                </div>
              </div>
              <RemoveButton label={`Remove ${c.name}`} onClick={() => remove(c)} />
            </div>
          ))}
        </div>
      )}
      <style>{`@media (max-width: 760px) { .cert-grid { grid-template-columns: minmax(0, 1fr) !important; } }`}</style>
    </GlassPanel>
  );
}
