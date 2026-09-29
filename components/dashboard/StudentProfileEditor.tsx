"use client";

import { useEffect, useId, useRef, useState } from "react";
import { GlassPanel, PanelTitle } from "./widgets";
import { Badge, Button } from "@/components/ui/primitives";
import { Avatar, ScoreRing, LoadingBlock, FlagPill } from "./cards";
import { Check, FileText, Link as LinkIcon, Save, UploadCloud, Loader2, Plus, Trash2 } from "lucide-react";
import { getStudentByProfile, updateStudentProfile, uploadPublicFile, type StudentRow, type StudentProject } from "@/lib/db";
import { evaluateResume, scoreTone } from "@/lib/resume";
import type { GLSession } from "@/lib/session";
import GsapReveal from "@/components/anim/GsapReveal";
import StudentCourses from "./StudentCourses";

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  const id = useId();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={id} style={{ fontSize: 12, color: "var(--text-2)" }}>{label}</label>
      <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ height: 42, padding: "0 12px", fontSize: 13.5, color: "var(--text)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", outline: "none" }} />
    </div>
  );
}

export default function StudentProfileEditor({ session }: { session: GLSession }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [degree, setDegree] = useState("");
  const [year, setYear] = useState("");
  const [university, setUniversity] = useState("");
  const [skills, setSkills] = useState("");
  const [bio, setBio] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [careerGoal, setCareerGoal] = useState("");
  const [targetRoles, setTargetRoles] = useState("");
  const [projects, setProjects] = useState<StudentProject[]>([]);

  function flash(t: string) { setToast(t); setTimeout(() => setToast(null), 2600); }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const m = await getStudentByProfile(session.profileId);
      if (cancelled) return;
      setDegree(m?.degree ?? "");
      setYear(m?.graduation_year ? String(m.graduation_year) : "");
      setUniversity(m?.university ?? session.org ?? "");
      setSkills((m?.skills ?? []).join(", "));
      setBio(m?.bio ?? "");
      setResumeUrl(m?.resume_url ?? "");
      setPortfolioUrl(m?.portfolio_url ?? "");
      setLinkedinUrl(m?.linkedin_url ?? "");
      setGithubUrl(m?.github_url ?? "");
      setCareerGoal(m?.career_goal ?? "");
      setTargetRoles((m?.target_roles ?? []).join(", "));
      setProjects(m?.projects ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [session.profileId, session.org]);

  const cleanProjects = projects
    .map((p) => ({ title: p.title.trim(), url: (p.url ?? "").trim(), description: (p.description ?? "").trim() }))
    .filter((p) => p.title);
  const splitList = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);

  /** Skills from a verified course: added to the form and saved straight away. */
  async function addSkills(extra: string[]) {
    const current = splitList(skills);
    const have = new Set(current.map((x) => x.toLowerCase()));
    const merged = [...current, ...extra.filter((x) => !have.has(x.toLowerCase()))];
    setSkills(merged.join(", "));
    const ok = await updateStudentProfile(session.profileId, { skills: merged });
    flash(ok ? `${merged.length - current.length} skills added to your profile` : "Couldn't save, try again");
  }

  const preview: Partial<StudentRow> = {
    full_name: session.name, email: "x@y.z",
    degree: degree || null, graduation_year: year ? parseInt(year, 10) : null,
    skills: skills ? skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
    bio: bio || null, resume_url: resumeUrl || null, portfolio_url: portfolioUrl || null,
    linkedin_url: linkedinUrl || null, github_url: githubUrl || null,
  };
  const evalr = evaluateResume(preview);

  async function onPickResume(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadPublicFile("resumes", session.profileId, file);
    if (url) {
      setResumeUrl(url);
      await updateStudentProfile(session.profileId, { resume_url: url });
      flash("Résumé attached, score unlocked");
    } else {
      flash("Upload failed, try again");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function save() {
    setSaving(true);
    const ok = await updateStudentProfile(session.profileId, {
      degree: degree || null,
      graduation_year: year ? parseInt(year, 10) : null,
      university: university || null,
      skills: skills ? skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
      bio: bio || null,
      resume_url: resumeUrl || null,
      portfolio_url: portfolioUrl || null,
      linkedin_url: linkedinUrl || null,
      github_url: githubUrl || null,
      career_goal: careerGoal.trim() || null,
      target_roles: splitList(targetRoles),
      projects: cleanProjects,
    });
    setSaving(false);
    flash(ok ? "Profile saved, checklist updated" : "Couldn't save, try again");
  }

  if (loading) return <GlassPanel><LoadingBlock label="Loading your profile…" /></GlassPanel>;

  return (
    <GsapReveal style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <GlassPanel style={{ border: "1px solid var(--border-strong)" }}>
        <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
          <Avatar name={session.name} size={64} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--text)" }}>{session.name}</h2>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)" }}>{[degree, year, university].filter(Boolean).join(" · ") || "Complete your profile below"}</p>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <FlagPill label={`Resume ${evalr.score}`} tone={evalr.score >= 70 ? "teal" : evalr.score >= 50 ? "cyan" : "amber"} />
              {resumeUrl ? <Badge tone="teal">Résumé attached</Badge> : <Badge tone="amber">No résumé yet</Badge>}
            </div>
          </div>
          <ScoreRing score={evalr.score} tone={scoreTone(evalr.score)} label="resume" />
        </div>
      </GlassPanel>

      {/* Résumé attach */}
      <GlassPanel style={{ border: resumeUrl ? "1px solid var(--border)" : "1px solid rgba(247,201,72,0.3)", background: resumeUrl ? undefined : "rgba(247,201,72,0.04)" }}>
        <PanelTitle hint={resumeUrl ? "Attached" : "Required for your résumé score"}>Your résumé</PanelTitle>
        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "12px 18px", borderRadius: "var(--r-md)", cursor: uploading ? "default" : "pointer", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, color: "#0A0A0A", background: "linear-gradient(100deg, var(--accent), var(--accent-2))", border: "none" }}>
            {uploading ? <Loader2 size={16} className="gl-spin" /> : <UploadCloud size={16} />}
            {uploading ? "Uploading…" : resumeUrl ? "Replace résumé" : "Attach résumé (PDF)"}
          </button>
          <input ref={fileRef} type="file" accept="application/pdf,.pdf,.doc,.docx" onChange={onPickResume} style={{ display: "none" }} />
          {resumeUrl && (
            <a href={resumeUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600, color: "var(--text-2)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "11px 16px", textDecoration: "none" }}>
              <FileText size={15} /> View attached résumé
            </a>
          )}
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 10 }}>PDF or Word. Companies can view & download it when they scan you. Your résumé score stays 0 until a résumé is attached.</p>
        <style>{`.gl-spin{animation:glspin 0.9s linear infinite}@keyframes glspin{to{transform:rotate(360deg)}}`}</style>
      </GlassPanel>

      <div className="dash-2col" style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 20 }}>
        <GlassPanel>
          <PanelTitle hint="Edits auto-update your checklist & QR">Edit your profile</PanelTitle>
          <div className="sp-fields" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
            <Field label="Degree" value={degree} onChange={setDegree} placeholder="Business Administration" />
            <Field label="Graduation year" value={year} onChange={setYear} placeholder="2026" type="number" />
            <Field label="University" value={university} onChange={setUniversity} placeholder="Your university" />
            <Field label="LinkedIn URL" value={linkedinUrl} onChange={setLinkedinUrl} placeholder="https://linkedin.com/in/…" />
            <Field label="Portfolio URL" value={portfolioUrl} onChange={setPortfolioUrl} placeholder="https://…" />
            <Field label="GitHub URL" value={githubUrl} onChange={setGithubUrl} placeholder="https://github.com/…" />
          </div>
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label htmlFor="sp-skills" style={{ fontSize: 12, color: "var(--text-2)" }}>Skills (comma-separated)</label>
              <input id="sp-skills" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Marketing, Analytics, Python"
                style={{ height: 42, padding: "0 12px", fontSize: 13.5, color: "var(--text)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", outline: "none" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label htmlFor="sp-targetRoles" style={{ fontSize: 12, color: "var(--text-2)" }}>Target roles (comma-separated)</label>
              <input id="sp-targetRoles" value={targetRoles} onChange={(e) => setTargetRoles(e.target.value)} placeholder="Business Analyst, Product Intern"
                style={{ height: 42, padding: "0 12px", fontSize: 13.5, color: "var(--text)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", outline: "none" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label htmlFor="sp-careerGoal" style={{ fontSize: 12, color: "var(--text-2)" }}>Career goal</label>
              <input id="sp-careerGoal" value={careerGoal} onChange={(e) => setCareerGoal(e.target.value)} maxLength={500} placeholder="Join a fintech team as an analyst after graduating"
                style={{ height: 42, padding: "0 12px", fontSize: 13.5, color: "var(--text)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", outline: "none" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label htmlFor="sp-bio" style={{ fontSize: 12, color: "var(--text-2)" }}>Bio</label>
              <textarea id="sp-bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder="A short summary of who you are and what you're looking for. Mention internships, projects, and measurable wins."
                style={{ resize: "vertical", padding: "10px 12px", fontSize: 13.5, color: "var(--text)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", outline: "none", fontFamily: "var(--font-body)" }} />
            </div>
            <ProjectsEditor projects={projects} onChange={setProjects} />
            <div><Button variant="primary" onClick={save} icon={<Save size={15} />}>{saving ? "Saving…" : "Save profile"}</Button></div>
          </div>
        </GlassPanel>

        <GlassPanel>
          <PanelTitle hint="Rule-based check">Résumé check</PanelTitle>
          <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5, marginBottom: 14 }}>{evalr.summary}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-2)" }}>Strengths</div>
            {evalr.strengths.map((s) => (
              <div key={s} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <Check size={13} color="var(--accent-2)" style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.45 }}>{s}</span>
              </div>
            ))}
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--amber)", marginTop: 8 }}>To improve</div>
            {evalr.improvements.map((s) => (
              <div key={s} style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.45 }}>• {s}</div>
            ))}
          </div>
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)", display: "flex", gap: 8, flexWrap: "wrap" }}>
            {linkedinUrl && <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 600, color: "var(--text-2)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: "8px 13px", textDecoration: "none" }}><LinkIcon size={14} /> LinkedIn</a>}
          </div>
        </GlassPanel>
      </div>

      <StudentCourses profileId={session.profileId} skills={splitList(skills)} onAddSkills={addSkills} />

      {toast && (
        <div style={{ position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)", zIndex: 50, display: "inline-flex", alignItems: "center", gap: 8, background: "var(--surface-elev)", border: "1px solid var(--border-strong)", borderRadius: "var(--r-full)", padding: "10px 18px", color: "var(--text)", fontSize: 13.5, fontWeight: 600, boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}>
          <Check size={15} color="var(--accent-2)" /> {toast}
        </div>
      )}
      <style>{`
        @media (max-width: 900px) { .dash-2col { grid-template-columns: minmax(0, 1fr) !important; } }
        @media (max-width: 560px) { .sp-fields { grid-template-columns: minmax(0, 1fr) !important; } }
      `}</style>
    </GsapReveal>
  );
}

const inputStyle: React.CSSProperties = {
  height: 40, padding: "0 12px", fontSize: 13.5, color: "var(--text)", background: "rgba(255,255,255,0.04)",
  border: "1px solid var(--border)", borderRadius: "var(--r-md)", outline: "none", width: "100%",
};

function ProjectsEditor({ projects, onChange }: { projects: StudentProject[]; onChange: (p: StudentProject[]) => void }) {
  const update = (i: number, patch: Partial<StudentProject>) => onChange(projects.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <label style={{ fontSize: 12, color: "var(--text-2)" }}>Projects</label>
        <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{projects.length} of 10 · mention the team and the result</span>
      </div>
      {projects.map((p, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "var(--r-md)" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input aria-label={`Project ${i + 1} title`} value={p.title} maxLength={120} onChange={(e) => update(i, { title: e.target.value })} placeholder="Project title" style={inputStyle} />
            <button type="button" onClick={() => onChange(projects.filter((_, j) => j !== i))} aria-label={`Remove project ${i + 1}`} title="Remove project"
              style={{ flexShrink: 0, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", color: "var(--text-2)", cursor: "pointer" }}>
              <Trash2 size={15} />
            </button>
          </div>
          <input aria-label={`Project ${i + 1} link`} value={p.url ?? ""} maxLength={500} onChange={(e) => update(i, { url: e.target.value })} placeholder="Link (GitHub, demo, case study)" style={inputStyle} />
          <textarea aria-label={`Project ${i + 1} description`} value={p.description ?? ""} maxLength={1000} rows={2} onChange={(e) => update(i, { description: e.target.value })}
            placeholder="What you built, who you worked with, and what changed because of it"
            style={{ ...inputStyle, height: "auto", padding: "10px 12px", resize: "vertical", fontFamily: "var(--font-body)" }} />
        </div>
      ))}
      {projects.length < 10 && (
        <button type="button" onClick={() => onChange([...projects, { title: "", url: "", description: "" }])}
          style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600, color: "var(--text)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "9px 14px", cursor: "pointer" }}>
          <Plus size={14} /> Add a project
        </button>
      )}
    </div>
  );
}
