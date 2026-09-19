"use client";

import { useEffect, useRef, useState } from "react";
import { GlassPanel, PanelTitle } from "./widgets";
import { Badge, Button } from "@/components/ui/primitives";
import { Avatar, LoadingBlock, FlagPill } from "./cards";
import { Check, FileText, Save, UploadCloud, Loader2 } from "lucide-react";
import { getCompanyByProfile, updateCompanyProfile, uploadPublicFile } from "@/lib/db";
import type { GLSession } from "@/lib/session";
import GsapReveal from "@/components/anim/GsapReveal";

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12, color: "var(--text-2)" }}>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ height: 42, padding: "0 12px", fontSize: 13.5, color: "var(--text)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", outline: "none" }} />
    </div>
  );
}

export default function CompanyProfileEditor({ session }: { session: GLSession }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [companyName, setCompanyName] = useState("");
  const [sector, setSector] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [booth, setBooth] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [roles, setRoles] = useState("");
  const [skillsWanted, setSkillsWanted] = useState("");
  const [description, setDescription] = useState("");
  const [brochureUrl, setBrochureUrl] = useState("");

  function flash(t: string) { setToast(t); setTimeout(() => setToast(null), 2600); }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const m = await getCompanyByProfile(session.profileId);
      if (cancelled) return;
      setCompanyName(m?.company_name ?? m?.company ?? session.org ?? "");
      setSector(m?.sector ?? "");
      setIndustry(m?.industry ?? "");
      setWebsite(m?.website ?? "");
      setBooth(m?.booth_number ?? "");
      setLogoUrl(m?.logo_url ?? "");
      setRoles((m?.hiring_roles ?? []).join(", "));
      setSkillsWanted((m?.skills_wanted ?? []).join(", "));
      setDescription(m?.description ?? "");
      setBrochureUrl(m?.brochure_url ?? "");
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [session.profileId, session.org]);

  const profileComplete = !!(sector && description && (website || logoUrl));
  const filled = [companyName, sector, industry, website, booth, roles, skillsWanted, description].filter(Boolean).length;
  const pct = Math.round((filled / 8) * 100);

  async function onPickBrochure(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadPublicFile("brochures", session.profileId, file);
    if (url) {
      setBrochureUrl(url);
      await updateCompanyProfile(session.profileId, { brochure_url: url });
      flash("Brochure attached");
    } else {
      flash("Upload failed, try again");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function save() {
    setSaving(true);
    const ok = await updateCompanyProfile(session.profileId, {
      company_name: companyName || null,
      sector: sector || null,
      industry: industry || null,
      website: website || null,
      booth_number: booth || null,
      logo_url: logoUrl || null,
      hiring_roles: roles ? roles.split(",").map((s) => s.trim()).filter(Boolean) : [],
      skills_wanted: skillsWanted ? skillsWanted.split(",").map((s) => s.trim()).filter(Boolean) : [],
      description: description || null,
    });
    setSaving(false);
    flash(ok ? "Company profile saved — checklist updated" : "Couldn't save, try again");
  }

  if (loading) return <GlassPanel><LoadingBlock label="Loading your company profile…" /></GlassPanel>;

  return (
    <GsapReveal style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <GlassPanel style={{ border: "1px solid var(--border-strong)" }}>
        <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
          <Avatar name={companyName || "C"} size={64} tone="var(--teal)" />
          <div style={{ flex: 1, minWidth: 200 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--text)" }}>{companyName || "Your company"}</h2>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)" }}>{[sector, industry, booth ? `Booth ${booth}` : null].filter(Boolean).join(" · ") || "Complete your booth profile below"}</p>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <FlagPill label={`Profile ${pct}%`} tone={pct >= 70 ? "teal" : "amber"} />
              {profileComplete ? <Badge tone="teal">Booth ready</Badge> : <Badge tone="amber">Finish your profile</Badge>}
              {brochureUrl && <Badge tone="cyan">Brochure attached</Badge>}
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* Brochure attach */}
      <GlassPanel>
        <PanelTitle hint={brochureUrl ? "Attached" : "Optional — students can view it"}>Company brochure</PanelTitle>
        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "12px 18px", borderRadius: "var(--r-md)", cursor: uploading ? "default" : "pointer", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, color: "#021016", background: "linear-gradient(100deg, var(--cyan), var(--teal))", border: "none" }}>
            {uploading ? <Loader2 size={16} className="gl-spin" /> : <UploadCloud size={16} />}
            {uploading ? "Uploading…" : brochureUrl ? "Replace brochure" : "Attach brochure (PDF)"}
          </button>
          <input ref={fileRef} type="file" accept="application/pdf,.pdf" onChange={onPickBrochure} style={{ display: "none" }} />
          {brochureUrl && (
            <a href={brochureUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600, color: "var(--text-2)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "11px 16px", textDecoration: "none" }}>
              <FileText size={15} /> View attached brochure
            </a>
          )}
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 10 }}>Students who scan your booth QR can view and download your brochure.</p>
        <style>{`.gl-spin{animation:glspin 0.9s linear infinite}@keyframes glspin{to{transform:rotate(360deg)}}`}</style>
      </GlassPanel>

      <GlassPanel>
        <PanelTitle hint="Edits update your booth QR & checklist">Edit your booth profile</PanelTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="cp-grid">
          <Field label="Company name" value={companyName} onChange={setCompanyName} placeholder="Careem" />
          <Field label="Booth number" value={booth} onChange={setBooth} placeholder="B12" />
          <Field label="Sector" value={sector} onChange={setSector} placeholder="Technology" />
          <Field label="Industry" value={industry} onChange={setIndustry} placeholder="Ride-hailing & Delivery" />
          <Field label="Website" value={website} onChange={setWebsite} placeholder="https://careem.com" />
          <Field label="Logo URL (optional)" value={logoUrl} onChange={setLogoUrl} placeholder="https://…/logo.png" />
        </div>
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, color: "var(--text-2)" }}>Hiring roles (comma-separated)</label>
            <input value={roles} onChange={(e) => setRoles(e.target.value)} placeholder="Product Manager, Data Analyst, Backend Engineer"
              style={{ height: 42, padding: "0 12px", fontSize: 13.5, color: "var(--text)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", outline: "none" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, color: "var(--text-2)" }}>Skills you&apos;re looking for (comma-separated)</label>
            <input value={skillsWanted} onChange={(e) => setSkillsWanted(e.target.value)} placeholder="Analytics, SQL, Communication"
              style={{ height: 42, padding: "0 12px", fontSize: 13.5, color: "var(--text)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", outline: "none" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, color: "var(--text-2)" }}>About your company</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="What your company does, your mission, and why students should visit your booth."
              style={{ resize: "vertical", padding: "10px 12px", fontSize: 13.5, color: "var(--text)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", outline: "none", fontFamily: "var(--font-body)" }} />
          </div>
          <div><Button variant="primary" onClick={save} icon={<Save size={15} />}>{saving ? "Saving…" : "Save company profile"}</Button></div>
        </div>
      </GlassPanel>

      {toast && (
        <div style={{ position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)", zIndex: 50, display: "inline-flex", alignItems: "center", gap: 8, background: "var(--surface-elev)", border: "1px solid var(--border-strong)", borderRadius: "var(--r-full)", padding: "10px 18px", color: "var(--text)", fontSize: 13.5, fontWeight: 600, boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}>
          <Check size={15} color="var(--teal)" /> {toast}
        </div>
      )}
      <style>{`@media (max-width: 640px) { .cp-grid { grid-template-columns: 1fr !important; } }`}</style>
    </GsapReveal>
  );
}
