"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { SectionCard, LoadingBlock, Labeled, SmallButton, fieldStyle } from "./cards";
import { getAlumniProfile, updateAlumniProfile } from "@/lib/db";
import { setSession, type GLSession } from "@/lib/session";

/**
 * An alumni mentor's profile. Students and the college at the mentor's
 * events see it next to their mentoring sessions; the email never shows.
 */
export default function AlumniProfileEditor({ session }: { session: GLSession }) {
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({ graduation_year: "", degree: "", current_title: "", current_company: "", linkedin_url: "", bio: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAlumniProfile(session.profileId).then((p) => {
      if (cancelled) return;
      if (p) {
        setForm({
          graduation_year: p.graduation_year ? String(p.graduation_year) : "", degree: p.degree ?? "",
          current_title: p.current_title ?? "", current_company: p.current_company ?? "",
          linkedin_url: p.linkedin_url ?? "", bio: p.bio ?? "",
        });
      }
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [session.profileId]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const res = await updateAlumniProfile({
      graduation_year: form.graduation_year ? Number(form.graduation_year) : null,
      degree: form.degree || null, current_title: form.current_title || null, current_company: form.current_company || null,
      linkedin_url: form.linkedin_url || null, bio: form.bio || null,
    });
    setSaving(false);
    if (!res.ok) { setMsg({ ok: false, text: res.error }); return; }
    // The company is the organisation shown next to your name.
    setSession({ ...session, org: res.profile.current_company ?? "" });
    setMsg({ ok: true, text: "Saved." });
  }

  if (!loaded) return <SectionCard title="Mentor profile"><LoadingBlock /></SectionCard>;

  return (
    <SectionCard title="Mentor profile" hint="Students at your events see this next to your sessions. Your email stays private.">
      <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="alumni-form" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Labeled label="Year you graduated">
            <input type="number" min={1950} max={2100} value={form.graduation_year} onChange={set("graduation_year")} placeholder="2019" style={fieldStyle} />
          </Labeled>
          <Labeled label="Degree">
            <input value={form.degree} maxLength={200} onChange={set("degree")} placeholder="BE Computer Science" style={fieldStyle} />
          </Labeled>
          <Labeled label="Current role">
            <input value={form.current_title} maxLength={200} onChange={set("current_title")} placeholder="Software Engineer" style={fieldStyle} />
          </Labeled>
          <Labeled label="Company">
            <input value={form.current_company} maxLength={200} onChange={set("current_company")} placeholder="Where you work now" style={fieldStyle} />
          </Labeled>
        </div>
        <Labeled label="LinkedIn">
          <input value={form.linkedin_url} maxLength={500} onChange={set("linkedin_url")} placeholder="https://linkedin.com/in/you" style={fieldStyle} />
        </Labeled>
        <Labeled label="What you can help with">
          <textarea value={form.bio} maxLength={1000} rows={3} onChange={set("bio")} placeholder="CV reviews, breaking into product roles, life after graduation…"
            style={{ ...fieldStyle, height: "auto", padding: "10px 12px", resize: "vertical", fontFamily: "var(--font-body)" }} />
        </Labeled>
        {msg && <p role={msg.ok ? "status" : "alert"} style={{ fontSize: 12.5, color: msg.ok ? "var(--accent-2)" : "var(--danger)" }}>{msg.text}</p>}
        <div><SmallButton type="submit" tone="primary" icon={<Save size={13} />} disabled={saving}>{saving ? "Saving…" : "Save profile"}</SmallButton></div>
      </form>
      <style>{`@media (max-width: 640px) { .alumni-form { grid-template-columns: 1fr !important; } }`}</style>
    </SectionCard>
  );
}
