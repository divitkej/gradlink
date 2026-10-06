"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, BookOpen, ExternalLink } from "lucide-react";
import { GlassPanel, PanelTitle } from "./widgets";
import { SmallButton, RemoveButton, fieldStyle } from "./cards";
import {
  addCourseraCertificate, addCourseraCourse, listStudentCourses, setStudentCourseVisible, deleteStudentCourse,
  courseraVerifyUrl, courseraCourseUrl, type StudentCourseRow,
} from "@/lib/db";
import { fmtMonthYear } from "@/lib/format";

/**
 * Coursera courses on the career profile. A certificate link is checked with
 * Coursera (the name on it must be the student's) before it is shown as
 * verified; a course in progress is checked to exist in Coursera's catalog.
 * The student chooses which ones employers see.
 */
export default function StudentCourses({ profileId, skills, onAddSkills }: {
  profileId: string;
  skills: string[];
  /** Adds skills to the profile form and saves them. */
  onAddSkills: (skills: string[]) => Promise<void>;
}) {
  const [rows, setRows] = useState<StudentCourseRow[] | null>(null);
  const [certLink, setCertLink] = useState("");
  const [courseLink, setCourseLink] = useState("");
  const [busy, setBusy] = useState<"cert" | "course" | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listStudentCourses(profileId).then((r) => { if (!cancelled) setRows(r); });
    return () => { cancelled = true; };
  }, [profileId, version]);

  const have = new Set(skills.map((s) => s.toLowerCase()));
  const toAdd = suggested.filter((s) => !have.has(s.toLowerCase()));

  async function addCertificate() {
    setBusy("cert");
    setMessage(null);
    const res = await addCourseraCertificate(certLink);
    setBusy(null);
    if (!res.ok) { setMessage({ tone: "error", text: res.error }); return; }
    setCertLink("");
    setSuggested(res.newSkills);
    setMessage({ tone: "ok", text: `Verified with Coursera: ${res.course.course_name}${res.course.partner_name ? ` by ${res.course.partner_name}` : ""}.` });
    setVersion((v) => v + 1);
  }

  async function addCourse() {
    setBusy("course");
    setMessage(null);
    const res = await addCourseraCourse(courseLink);
    setBusy(null);
    if (!res.ok) { setMessage({ tone: "error", text: res.error }); return; }
    setCourseLink("");
    setMessage({ tone: "ok", text: `Added ${res.course.course_name} as a course you are taking.` });
    setVersion((v) => v + 1);
  }

  async function toggle(c: StudentCourseRow) {
    const next = !c.visible_to_employers;
    const flip = (value: boolean) => setRows((r) => (r ?? []).map((x) => (x.id === c.id ? { ...x, visible_to_employers: value } : x)));
    flip(next);
    if (!(await setStudentCourseVisible(c.id, next))) {
      flip(!next);
      setMessage({ tone: "error", text: "Couldn't save that. Please try again." });
    }
  }

  async function remove(c: StudentCourseRow) {
    if (!window.confirm(`Remove ${c.course_name} from your profile?`)) return;
    if (await deleteStudentCourse(c.id)) setVersion((v) => v + 1);
  }

  const certificates = (rows ?? []).filter((c) => c.status === "certificate");
  const taking = (rows ?? []).filter((c) => c.status === "in_progress");

  return (
    <GlassPanel id="courses">
      <PanelTitle hint="Employers see the ones you choose">Coursera courses</PanelTitle>

      <div className="sc-add" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <form onSubmit={(e) => { e.preventDefault(); addCertificate(); }} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="sc-cert" style={{ fontSize: 12, color: "var(--text-2)" }}>Finished a course? Paste its certificate link</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input id="sc-cert" value={certLink} onChange={(e) => setCertLink(e.target.value)} placeholder="coursera.org/verify/ABC123XYZ" style={fieldStyle} />
            <SmallButton type="submit" tone="primary" disabled={!certLink.trim() || busy !== null}>{busy === "cert" ? "Checking…" : "Verify"}</SmallButton>
          </div>
          <span style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.5 }}>
            On Coursera, open the certificate and copy its share link. We check it with Coursera, and the name on it must match yours.
          </span>
        </form>
        <form onSubmit={(e) => { e.preventDefault(); addCourse(); }} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="sc-course" style={{ fontSize: 12, color: "var(--text-2)" }}>Taking a course now? Paste the course link</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input id="sc-course" value={courseLink} onChange={(e) => setCourseLink(e.target.value)} placeholder="coursera.org/learn/course-name" style={fieldStyle} />
            <SmallButton type="submit" disabled={!courseLink.trim() || busy !== null}>{busy === "course" ? "Adding…" : "Add"}</SmallButton>
          </div>
          <span style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.5 }}>Shown as &quot;Currently taking&quot;. Add the certificate when you finish and it becomes verified.</span>
        </form>
      </div>

      {message && <p role={message.tone === "error" ? "alert" : "status"} style={{ fontSize: 12.5, marginTop: 12, color: message.tone === "error" ? "var(--danger)" : "var(--text)" }}>{message.text}</p>}
      {toAdd.length > 0 && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 10, padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-strong)", borderRadius: "var(--r-sm)" }}>
          <span style={{ flex: 1, minWidth: 200, fontSize: 12.5, color: "var(--text-2)" }}>This course covers skills not on your profile: {toAdd.slice(0, 8).join(", ")}{toAdd.length > 8 ? "…" : ""}</span>
          <SmallButton tone="primary" onClick={async () => { await onAddSkills(toAdd); setSuggested([]); }}>Add {toAdd.length} {toAdd.length === 1 ? "skill" : "skills"}</SmallButton>
          <SmallButton onClick={() => setSuggested([])}>No thanks</SmallButton>
        </div>
      )}

      {rows && rows.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
          {[...certificates, ...taking].map((c) => (
            <div key={c.id} className="sc-row" style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-md)" }}>
              {c.status === "certificate" ? <BadgeCheck size={17} color="var(--accent)" style={{ flexShrink: 0, marginTop: 1 }} /> : <BookOpen size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 1 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{c.course_name}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  {[c.partner_name, c.status === "certificate" ? `Verified by Coursera${c.completed_at ? `, completed ${fmtMonthYear(c.completed_at)}` : ""}` : "Currently taking"].filter(Boolean).join(" · ")}
                </div>
                {c.skills.length > 0 && <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 4 }}>{c.skills.slice(0, 5).join(", ")}{c.skills.length > 5 ? ` +${c.skills.length - 5}` : ""}</div>}
                <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-2)", cursor: "pointer" }}>
                    <input type="checkbox" checked={!!c.visible_to_employers} onChange={() => toggle(c)} /> Show to employers
                  </label>
                  {(c.certificate_code || c.course_slug) && (
                    <a href={c.certificate_code ? courseraVerifyUrl(c.certificate_code) : courseraCourseUrl(c.course_slug!)} target="_blank" rel="noopener noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-2)" }}>
                      <ExternalLink size={12} /> {c.certificate_code ? "View certificate" : "View course"}
                    </a>
                  )}
                </div>
              </div>
              <RemoveButton label={`Remove ${c.course_name}`} onClick={() => remove(c)} />
            </div>
          ))}
        </div>
      )}
      <style>{`@media (max-width: 760px) { .sc-add { grid-template-columns: minmax(0, 1fr) !important; } }`}</style>
    </GlassPanel>
  );
}
