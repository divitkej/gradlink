import type { StudentRow, CompanyRow, SessionRow, SessionKind, SavedCompanyRow } from "./db";
import { evaluateResume } from "./resume";

/* ============================================================
   Career readiness, worked out from the student's profile and what
   they have done at the event. Every number here comes with the
   evidence behind it, so the dashboard can show how to raise it.
   Nothing is a test result: it is an estimate from real signals.
   ============================================================ */

export interface StudentActivity {
  /** The event's sessions, each carrying the student's own booking status. */
  sessions: SessionRow[];
  saved: SavedCompanyRow[];
  /** Distinct companies the student has messaged at this event. */
  companiesMessaged: number;
  checkedIn: boolean;
  /** Share of the event checklist that is done, 0 to 100. */
  checklistPct: number;
}

export interface Evidence {
  label: string;
  earned: number;
  max: number;
  href: string;
}

export interface Competency {
  key: string;
  label: string;
  value: number;
  evidence: Evidence[];
}

const PROFILE = "/dashboard/profile";
const SCHEDULE = "/dashboard/student/schedule";
const MESSAGES = "/dashboard/messages";

const TEAM_RE = /\b(team|teams|teammates?|collaborat\w*|group|club|society|cross-functional)\b/;
const LEAD_RE = /\b(led|lead|leader|leadership|president|captain|founded|founder|organi[sz]ed|managed|mentor(ed)?|chair(ed)?)\b/;
const RESULT_RE = /\d+\s?%|\b\d[\d,]*\+?\s(users|customers|people|students|members|downloads|clients)\b|\b(increased|reduced|improved|grew|saved|won|awarded|ranked|launched|shipped|delivered)\b/;

function corpus(me: Partial<StudentRow>): string {
  const projects = (me.projects ?? []).map((p) => `${p.title} ${p.description ?? ""}`).join(" ");
  return `${me.bio ?? ""} ${me.career_goal ?? ""} ${projects}`.toLowerCase();
}

/** Points for a session type: full for attending, part for a booked place. */
function sessionEvidence(sessions: SessionRow[], kinds: SessionKind[], label: string, max: number, bookedPoints: number): Evidence {
  const mine = sessions.filter((s) => kinds.includes(s.kind));
  const attended = mine.some((s) => s.my_status === "attended");
  const booked = mine.some((s) => s.my_status === "booked");
  return { label, max, earned: attended ? max : booked ? bookedPoints : 0, href: SCHEDULE };
}

function sum(evidence: Evidence[]): number {
  return Math.min(100, Math.round(evidence.reduce((n, e) => n + e.earned, 0)));
}

export function competencies(me: Partial<StudentRow>, a: StudentActivity): Competency[] {
  const text = corpus(me);
  const skills = me.skills ?? [];
  const projects = me.projects ?? [];
  const bio = me.bio ?? "";
  const yes = (b: boolean, max: number) => (b ? max : 0);

  const list: Omit<Competency, "value">[] = [
    {
      key: "communication",
      label: "Communication",
      evidence: [
        { label: "Write a bio", max: 20, earned: yes(bio.trim().length > 0, 20), href: PROFILE },
        { label: "Make your bio 120+ characters", max: 20, earned: yes(bio.trim().length >= 120, 20), href: PROFILE },
        { label: "Write your career goal", max: 20, earned: yes(!!me.career_goal?.trim(), 20), href: PROFILE },
        sessionEvidence(a.sessions, ["workshop", "talk", "mentoring"], "Attend a workshop, talk or mentoring session", 20, 10),
        { label: "Message a recruiter", max: 20, earned: yes(a.companiesMessaged > 0, 20), href: MESSAGES },
      ],
    },
    {
      key: "technology",
      label: "Technology",
      evidence: [
        { label: "List 3+ skills", max: 20, earned: yes(skills.length >= 3, 20), href: PROFILE },
        { label: "List 6+ skills", max: 20, earned: yes(skills.length >= 6, 20), href: PROFILE },
        { label: "Link GitHub or a portfolio", max: 20, earned: yes(!!(me.github_url || me.portfolio_url), 20), href: PROFILE },
        { label: "Add a project", max: 20, earned: yes(projects.length > 0, 20), href: PROFILE },
        { label: "Link a project to your work", max: 20, earned: yes(projects.some((p) => !!p.url), 20), href: PROFILE },
      ],
    },
    {
      key: "professionalism",
      label: "Professionalism",
      evidence: [
        { label: "Upload your résumé", max: 30, earned: yes(!!me.resume_url, 30), href: PROFILE },
        { label: "Link your LinkedIn", max: 20, earned: yes(!!me.linkedin_url, 20), href: PROFILE },
        { label: "Add degree and graduation year", max: 20, earned: yes(!!(me.degree && me.graduation_year), 20), href: PROFILE },
        { label: "Set your target roles", max: 15, earned: yes((me.target_roles ?? []).length > 0, 15), href: PROFILE },
        { label: "Check in at the event", max: 15, earned: yes(a.checkedIn, 15), href: "/dashboard/student#qr" },
      ],
    },
    {
      key: "teamwork",
      label: "Teamwork",
      evidence: [
        { label: "Describe team work in your bio or projects", max: 40, earned: yes(TEAM_RE.test(text), 40), href: PROFILE },
        { label: "Add 2+ projects", max: 30, earned: yes(projects.length >= 2, 30), href: PROFILE },
        sessionEvidence(a.sessions, ["networking"], "Attend a networking session", 30, 15),
      ],
    },
    {
      key: "critical_thinking",
      label: "Critical Thinking",
      evidence: [
        { label: "Show a measurable result in your bio or projects", max: 40, earned: yes(RESULT_RE.test(text), 40), href: PROFILE },
        { label: "Describe a project in detail (80+ characters)", max: 30, earned: yes(projects.some((p) => (p.description ?? "").length >= 80), 30), href: PROFILE },
        sessionEvidence(a.sessions, ["mock_interview"], "Attend a mock interview", 30, 15),
      ],
    },
    {
      key: "leadership",
      label: "Leadership",
      evidence: [
        { label: "Describe something you led in your bio or projects", max: 50, earned: yes(LEAD_RE.test(text), 50), href: PROFILE },
        sessionEvidence(a.sessions, ["company_session", "recruiter_slot", "talk"], "Attend a company session", 25, 10),
        { label: "Follow up with 2+ companies", max: 25, earned: yes(a.companiesMessaged >= 2, 25), href: MESSAGES },
      ],
    },
  ];
  return list.map((c) => ({ ...c, value: sum(c.evidence) }));
}

export interface ProfileCheck {
  label: string;
  done: boolean;
}

export function profileChecks(me: Partial<StudentRow>): ProfileCheck[] {
  return [
    { label: "Degree", done: !!me.degree },
    { label: "Graduation year", done: !!me.graduation_year },
    { label: "Skills", done: (me.skills?.length ?? 0) > 0 },
    { label: "Résumé", done: !!me.resume_url },
    { label: "LinkedIn, GitHub or portfolio", done: !!(me.linkedin_url || me.github_url || me.portfolio_url) },
    { label: "Bio", done: !!me.bio?.trim() },
    { label: "Target roles", done: (me.target_roles?.length ?? 0) > 0 },
    { label: "A project", done: (me.projects?.length ?? 0) > 0 },
  ];
}

export function profileCompleteness(me: Partial<StudentRow>): number {
  const checks = profileChecks(me);
  return Math.round((checks.filter((c) => c.done).length / checks.length) * 100);
}

export interface Readiness {
  score: number;
  resume: number;
  profile: number;
  competency: number;
  checklist: number;
}

/** The weights are shown to the student next to the score. */
export const READINESS_WEIGHTS = { resume: 0.3, profile: 0.2, competency: 0.3, checklist: 0.2 };

export function readiness(me: Partial<StudentRow>, a: StudentActivity, comps = competencies(me, a)): Readiness {
  const resume = evaluateResume(me).score;
  const profile = profileCompleteness(me);
  const competency = comps.length ? Math.round(comps.reduce((n, c) => n + c.value, 0) / comps.length) : 0;
  const checklist = a.checklistPct;
  const w = READINESS_WEIGHTS;
  const score = Math.round(resume * w.resume + profile * w.profile + competency * w.competency + checklist * w.checklist);
  return { score, resume, profile, competency, checklist };
}

export type ActionStatus = "complete" | "pending" | "recommended" | "unavailable";

export interface ActionItem {
  key: string;
  label: string;
  detail?: string;
  status: ActionStatus;
  /** Counts toward the Fair-Ready badge. */
  required: boolean;
  href: string;
}

export function actionPlan(me: Partial<StudentRow>, a: StudentActivity): ActionItem[] {
  const skills = me.skills?.length ?? 0;
  const projects = me.projects?.length ?? 0;
  const savedCount = a.saved.filter((s) => s.saved).length;
  const offered = (kinds: SessionKind[]) => a.sessions.some((s) => kinds.includes(s.kind));
  const taken = (kinds: SessionKind[]) =>
    a.sessions.some((s) => kinds.includes(s.kind) && (s.my_status === "booked" || s.my_status === "attended"));
  const req = (done: boolean): ActionStatus => (done ? "complete" : "pending");
  const rec = (done: boolean): ActionStatus => (done ? "complete" : "recommended");

  const prep: SessionKind[] = ["mock_interview", "workshop"];
  const company: SessionKind[] = ["company_session", "recruiter_slot", "talk"];

  return [
    { key: "resume", label: "Upload your résumé", status: req(!!me.resume_url), required: true, href: PROFILE },
    { key: "skills", label: "List at least 5 skills", detail: `${Math.min(skills, 5)} of 5`, status: req(skills >= 5), required: true, href: PROFILE },
    { key: "links", label: "Add LinkedIn, GitHub or a portfolio", status: req(!!(me.linkedin_url || me.github_url || me.portfolio_url)), required: true, href: PROFILE },
    { key: "roles", label: "Set your target roles", status: req((me.target_roles?.length ?? 0) > 0), required: true, href: PROFILE },
    { key: "saved", label: "Save 3 companies to your plan", detail: `${Math.min(savedCount, 3)} of 3`, status: req(savedCount >= 3), required: true, href: "/dashboard/student#companies" },
    offered(prep)
      ? { key: "prep", label: "Book a mock interview or workshop", status: req(taken(prep)), required: true, href: SCHEDULE }
      : { key: "prep", label: "Book a mock interview or workshop", detail: "None scheduled yet", status: "unavailable", required: false, href: SCHEDULE },
    { key: "projects", label: "Add 3 projects", detail: `${Math.min(projects, 3)} of 3`, status: rec(projects >= 3), required: false, href: PROFILE },
    offered(company)
      ? { key: "company", label: "Attend a company session", status: rec(taken(company)), required: false, href: SCHEDULE }
      : { key: "company", label: "Attend a company session", detail: "None scheduled yet", status: "unavailable", required: false, href: SCHEDULE },
    { key: "impact", label: "Show a measurable result in your bio", status: rec(RESULT_RE.test(corpus(me))), required: false, href: PROFILE },
  ];
}

/** Fair-Ready once every required, available item is complete. */
export function fairReady(plan: ActionItem[]): { ready: boolean; remaining: number } {
  const remaining = plan.filter((i) => i.required && i.status !== "complete").length;
  return { ready: remaining === 0, remaining };
}

export interface CompanyMatch {
  company: CompanyRow;
  /** 0 to 100, or null when the company hasn't said what it is looking for. */
  score: number | null;
  skills: string[];
  roles: string[];
}

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9+#.]+/).filter((w) => w.length >= 3);

/** Skills against the company's wanted skills, target roles against its open roles. */
export function matchCompanies(me: Partial<StudentRow>, companies: CompanyRow[]): CompanyMatch[] {
  const mySkills = (me.skills ?? []).map((s) => s.trim()).filter(Boolean);
  const myRoleWords = new Set((me.target_roles ?? []).flatMap(words));
  return companies
    .map((company) => {
      const wanted = [...(company.skills_wanted ?? []), ...(company.hiring_roles ?? [])].map((x) => x.toLowerCase());
      const skills = mySkills.filter((s) => {
        const l = s.toLowerCase();
        return wanted.some((w) => w.includes(l) || l.includes(w));
      });
      const roles = (company.hiring_roles ?? []).filter((r) => words(r).some((w) => myRoleWords.has(w)));
      const hasCriteria = wanted.length > 0;
      const skillPart = (company.skills_wanted ?? []).length
        ? Math.min(1, skills.length / Math.min(3, (company.skills_wanted ?? []).length))
        : skills.length ? 1 : 0;
      const score = hasCriteria ? Math.round(skillPart * 60 + (roles.length ? 40 : 0)) : null;
      return { company, score, skills, roles };
    })
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
}
