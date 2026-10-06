"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { GlassPanel, PanelTitle } from "./widgets";
import { LoadingBlock } from "./cards";
import { Button } from "@/components/ui/primitives";
import { getCollegeProfile, updateCollegeProfile } from "@/lib/db";
import { setSession, type GLSession } from "@/lib/session";

function Field({ id, label, value, onChange, placeholder, hint }: {
  id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={id} style={{ fontSize: 12, color: "var(--text-2)" }}>{label}</label>
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ height: 42, padding: "0 12px", fontSize: 13.5, color: "var(--text)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", outline: "none" }} />
      {hint && <span style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{hint}</span>}
    </div>
  );
}

/** A college's own name and organisation. The organisation is what students and employers see on its events. */
export default function CollegeProfileEditor({ session }: { session: GLSession }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState(session.name);
  const [organization, setOrganization] = useState(session.org);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCollegeProfile().then((p) => {
      if (cancelled) return;
      if (p) {
        setFullName(p.full_name);
        setOrganization(p.organization ?? "");
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  async function save() {
    if (saving) return;
    setSaving(true);
    setStatus(null);
    const res = await updateCollegeProfile({ full_name: fullName, organization });
    setSaving(false);
    if (!res.ok) {
      setStatus({ ok: false, text: res.error });
      return;
    }
    setFullName(res.profile.full_name);
    setOrganization(res.profile.organization ?? "");
    // Keep the cached session in step so the sidebar and new events use the new name.
    setSession({ ...session, name: res.profile.full_name, org: res.profile.organization ?? "" });
    setStatus({ ok: true, text: "Saved. Your events now show the new name." });
  }

  if (loading) return <GlassPanel><LoadingBlock label="Loading your profile…" /></GlassPanel>;

  return (
    <GlassPanel style={{ maxWidth: 720 }}>
      <PanelTitle hint="Shown on your events">Organisation details</PanelTitle>
      <div className="clp-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field id="clp-name" label="Your full name" value={fullName} onChange={setFullName} placeholder="Your name" />
        <Field id="clp-org" label="College or organisation" value={organization} onChange={setOrganization} placeholder="Your college"
          hint="Students and employers see this on your events." />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginTop: 16 }}>
        <Button variant="primary" onClick={save} icon={<Save size={15} />}>{saving ? "Saving…" : "Save details"}</Button>
        {status && (
          <span role="status" style={{ fontSize: 13, color: status.ok ? "var(--accent-2)" : "var(--danger)" }}>{status.text}</span>
        )}
      </div>
      <style>{`@media (max-width: 640px) { .clp-grid { grid-template-columns: 1fr !important; } }`}</style>
    </GlassPanel>
  );
}
