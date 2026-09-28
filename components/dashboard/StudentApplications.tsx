"use client";

import { useEffect, useState } from "react";
import { Briefcase, CalendarClock, Pencil, Plus, Trash2 } from "lucide-react";
import { GlassPanel } from "./widgets";
import { SectionCard, LoadingBlock, SmallButton, StatTile, Labeled, fieldStyle as field } from "./cards";
import {
  listApplications, saveApplication, deleteApplication, getRegisteredCompanies, APPLICATION_STATUS_LABEL,
  type ApplicationRow, type ApplicationStatus, type CompanyRow,
} from "@/lib/db";
import { fmtDateTime, fromLocalInput, toLocalInput } from "@/lib/format";

const STATUSES = Object.keys(APPLICATION_STATUS_LABEL) as ApplicationStatus[];
const OTHER = "__other__";

interface Draft {
  id?: string;
  companyId: string;
  companyName: string;
  roleTitle: string;
  status: ApplicationStatus;
  interviewAt: string;
  notes: string;
}

const blank: Draft = { companyId: "", companyName: "", roleTitle: "", status: "applied", interviewAt: "", notes: "" };


export default function StudentApplications({ eventId }: { eventId: string }) {
  const [apps, setApps] = useState<ApplicationRow[] | null>(null);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    Promise.all([listApplications(), getRegisteredCompanies(eventId)]).then(([a, c]) => {
      if (!cancelled) { setApps(a); setCompanies(c); }
    });
    return () => { cancelled = true; };
  }, [eventId]);

  if (!apps) return <GlassPanel><LoadingBlock label="Loading your applications…" /></GlassPanel>;

  const nameOf = (c: CompanyRow) => c.company_name ?? c.company ?? c.full_name;
  const selected = companies.find((c) => (c.profile_id ?? c.id) === draft?.companyId);

  async function submit(d: Draft) {
    setSaving(true);
    setError(null);
    const res = await saveApplication({
      id: d.id,
      eventId: d.companyId ? eventId : null,
      companyId: d.companyId || null,
      companyName: d.companyName,
      roleTitle: d.roleTitle,
      status: d.status,
      interviewAt: fromLocalInput(d.interviewAt),
      notes: d.notes,
    });
    setSaving(false);
    if (!res.ok) { setError(res.error); return false; }
    setApps((list) => [res.application, ...(list ?? []).filter((a) => a.id !== res.application.id)]);
    return true;
  }

  async function quickStatus(a: ApplicationRow, status: ApplicationStatus) {
    await submit({
      id: a.id, companyId: a.company_id ?? "", companyName: a.company_name, roleTitle: a.role_title, status,
      interviewAt: toLocalInput(a.interview_at), notes: a.notes ?? "",
    });
  }

  async function remove(a: ApplicationRow) {
    if (!window.confirm(`Delete your ${a.role_title} application to ${a.company_name}?`)) return;
    if (await deleteApplication(a.id)) setApps((list) => (list ?? []).filter((x) => x.id !== a.id));
  }

  const upcoming = apps
    .filter((a) => a.interview_at && new Date(a.interview_at).getTime() > now && (a.status === "applied" || a.status === "interviewing"))
    .sort((a, b) => (a.interview_at ?? "").localeCompare(b.interview_at ?? ""));
  const count = (...s: ApplicationStatus[]) => apps.filter((a) => s.includes(a.status)).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="apps-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <StatTile label="Applications" value={apps.length} />
        <StatTile label="Interviewing" value={count("interviewing")} />
        <StatTile label="Offers" value={count("offer", "accepted")} accent />
        <StatTile label="Accepted" value={count("accepted")} />
      </div>

      {upcoming.length > 0 && (
        <SectionCard title="Upcoming interviews">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {upcoming.map((a) => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)" }}>
                <CalendarClock size={16} color="var(--accent)" />
                <span style={{ flex: 1, fontSize: 13, color: "var(--text)" }}>{a.role_title} · {a.company_name}</span>
                <span style={{ fontSize: 12.5, color: "var(--text-2)" }}>{fmtDateTime(a.interview_at!)}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="My applications"
        hint="Private to you"
        right={!draft ? <SmallButton tone="primary" icon={<Plus size={14} />} onClick={() => { setError(null); setDraft(blank); }}>Add application</SmallButton> : undefined}
      >
        {draft && (
          <form
            onSubmit={async (e) => { e.preventDefault(); if (await submit(draft)) setDraft(null); }}
            style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, marginBottom: 16, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-strong)", borderRadius: "var(--r-md)" }}
          >
            <div className="apps-form" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Labeled label="Company">
                <select
                  value={draft.companyId || (draft.companyName ? OTHER : "")}
                  onChange={(e) => {
                    const v = e.target.value;
                    const c = companies.find((x) => (x.profile_id ?? x.id) === v);
                    setDraft({ ...draft, companyId: c ? v : "", companyName: c ? nameOf(c) : v === OTHER ? draft.companyName : "" });
                  }}
                  style={field}
                >
                  <option value="">Choose a company</option>
                  {companies.map((c) => <option key={c.id} value={c.profile_id ?? c.id}>{nameOf(c)}</option>)}
                  <option value={OTHER}>Another company</option>
                </select>
              </Labeled>
              {!draft.companyId ? (
                <Labeled label="Company name">
                  <input value={draft.companyName} maxLength={200} onChange={(e) => setDraft({ ...draft, companyName: e.target.value })} placeholder="Company name" style={field} />
                </Labeled>
              ) : <div />}
              <Labeled label="Role">
                <input value={draft.roleTitle} maxLength={200} list="apps-roles" onChange={(e) => setDraft({ ...draft, roleTitle: e.target.value })} placeholder="Business Analyst Intern" style={field} />
                <datalist id="apps-roles">{(selected?.hiring_roles ?? []).map((r) => <option key={r} value={r} />)}</datalist>
              </Labeled>
              <Labeled label="Status">
                <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as ApplicationStatus })} style={field}>
                  {STATUSES.map((s) => <option key={s} value={s}>{APPLICATION_STATUS_LABEL[s]}</option>)}
                </select>
              </Labeled>
              <Labeled label="Interview date and time (optional)">
                <input type="datetime-local" value={draft.interviewAt} onChange={(e) => setDraft({ ...draft, interviewAt: e.target.value })} style={field} />
              </Labeled>
            </div>
            <Labeled label="Notes (optional)">
              <textarea value={draft.notes} maxLength={2000} rows={2} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Recruiter name, next step, anything to remember"
                style={{ ...field, height: "auto", padding: "10px 12px", resize: "vertical", fontFamily: "var(--font-body)" }} />
            </Labeled>
            {error && <p role="alert" style={{ fontSize: 12.5, color: "var(--danger)" }}>{error}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <SmallButton type="submit" tone="primary" disabled={saving}>{saving ? "Saving…" : draft.id ? "Save changes" : "Add application"}</SmallButton>
              <SmallButton onClick={() => { setDraft(null); setError(null); }}>Cancel</SmallButton>
            </div>
          </form>
        )}

        {apps.length === 0 && !draft ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "26px 16px", textAlign: "center" }}>
            <Briefcase size={22} color="var(--accent)" />
            <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text)" }}>No applications yet</div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 380, lineHeight: 1.55 }}>
              Log each role you apply for after the fair, then move it along as you hear back: interview, offer, accepted.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {apps.map((a) => (
              <div key={a.id} style={{ padding: "12px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-md)" }}>
                <div className="apps-row" style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{a.role_title}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                      {[a.company_name, a.interview_at ? `Interview ${fmtDateTime(a.interview_at)}` : null].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <select aria-label={`Status of ${a.role_title} at ${a.company_name}`} value={a.status} onChange={(e) => quickStatus(a, e.target.value as ApplicationStatus)}
                    style={{ ...field, width: 150, height: 34, fontSize: 12.5 }}>
                    {STATUSES.map((s) => <option key={s} value={s}>{APPLICATION_STATUS_LABEL[s]}</option>)}
                  </select>
                  <SmallButton ariaLabel="Edit application" icon={<Pencil size={13} />} onClick={() => {
                    setError(null);
                    setDraft({ id: a.id, companyId: a.company_id ?? "", companyName: a.company_name, roleTitle: a.role_title, status: a.status, interviewAt: toLocalInput(a.interview_at), notes: a.notes ?? "" });
                  }}>Edit</SmallButton>
                  <SmallButton ariaLabel="Delete application" tone="danger" icon={<Trash2 size={13} />} onClick={() => remove(a)}>Delete</SmallButton>
                </div>
                {a.notes && <p style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.5, marginTop: 8 }}>{a.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <style>{`
        @media (max-width: 720px) { .apps-stats { grid-template-columns: repeat(2, 1fr) !important; } .apps-form { grid-template-columns: 1fr !important; } }
        @media (max-width: 560px) { .apps-row { flex-wrap: wrap; } }
      `}</style>
    </div>
  );
}

