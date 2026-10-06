import { db, type Row } from "./sql";
import { HttpError } from "./http";
import { serverEnv } from "./env";
import type { AuthUser } from "./session";
import { CHECKLIST_TEMPLATE } from "./checklist-template";
import { evaluateResume } from "../resume";
import { engagementScore, shortName, type EngagementCounts } from "../engagement";
import { isTimeZone } from "../format";
import {
  CourseraError, certificateCode, courseSlug, fetchCertificate, courseById, courseBySlug, namesMatch, nameHidden,
} from "./coursera";
import {
  CodingError, leetcodeHandle, codeforcesHandle, fetchLeetCode, fetchCodeforces, codeforcesVerified, type CodingSite,
} from "./coding";
import { CODING_SITE_LABEL } from "../scores";
import { CredlyError, credlyBadgeId, fetchCredlyBadge, emailMatches } from "./credly";

/* ============================================================
   /api/rpc — every data operation the browser used to run directly
   against Firestore, now run in the Worker against Neon.

   Each op keeps the name and argument list of the lib/db.ts /
   lib/events.ts function that calls it, so no component changed.

   Authorization:
     * every op requires a signed-in user;
     * event data (attendees, scans, shortlists, analytics, messages)
       is only visible to people registered for that event, and the
       whole-event views only to the event's staff (its owner, or a
       college account registered for it);
     * a student's scores, engagement and analytics are for the student
       and the event's staff only, never for employers. Colleges want
       students hired, so employers see strengths (profile, skills,
       projects, verified courses, résumé), not assessments;
     * shortlists and their private notes belong to the company that
       made them; a student sees only the companies that shortlisted
       them, never "maybe", "not a fit" or the notes;
     * join codes are only returned to the event's owner;
     * a profile is visible to its owner, or to someone who shares an
       event with it (fellow students see no contact details);
     * messages, checklist progress, memberships and subscriptions
       are visible to their owner only;
     * writes are owner-only, checked against the session's profile
       id and role, never against an id or role the browser claims.
   ============================================================ */

type Args = unknown[];
type Op = (user: AuthUser, args: Args) => Promise<unknown>;

const forbidden = () => new HttpError(403, "You don't have permission to do that.");

/** Adds the default checklist to an event. Safe to repeat: existing items are kept. */
async function addDefaultChecklist(eventId: string): Promise<void> {
  await db()`
    insert into checklist_items (event_id, role, phase, order_index, title, description)
    select ${eventId}, x.role, x.phase, x.order_index, x.title, x.description
    from json_to_recordset(${JSON.stringify(CHECKLIST_TEMPLATE)}::json)
      as x(role text, phase text, order_index int, title text, description text)
    where exists (select 1 from events where id = ${eventId})
      and not exists (select 1 from checklist_items where event_id = ${eventId})
    on conflict do nothing
  `;
}

function isMe(user: AuthUser, id: unknown) {
  if (id !== user.id) throw forbidden();
}

const s = (v: unknown) => (typeof v === "string" ? v : "");
const textOrNull = (v: unknown, max = 5000) => (typeof v === "string" ? v.slice(0, max) : null);
const intOrNull = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null);
const strArray = (v: unknown, maxItems = 50) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, maxItems).map((x) => x.slice(0, 200)) : [];

/**
 * Links that other users click. Only http(s) is stored, so a profile can never
 * carry a `javascript:` or `data:` link. A bare domain gets https:// added.
 */
function urlOrNull(v: unknown): string | null {
  const raw = typeof v === "string" ? v.trim().slice(0, 2000) : "";
  if (!raw) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
    return url.toString();
  } catch {
    throw new HttpError(400, "One of the links isn't a valid web address. Use a link that starts with https://");
  }
}
/** A timestamp from the browser as ISO, or null when missing or unparseable. */
const isoOrNull = (v: unknown) => {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
/** Up to 10 {title, url, description} projects, with empty titles dropped. Links are http(s) only. */
const projectList = (v: unknown) =>
  (Array.isArray(v) ? v : [])
    .map((p) => (p ?? {}) as Row)
    .map((p) => ({ title: s(p.title).trim().slice(0, 120), url: urlOrNull(p.url) ?? "", description: s(p.description).trim().slice(0, 1000) }))
    .filter((p) => p.title)
    .slice(0, 10);

/* ---------------- column sets ---------------- */

const STUDENT_COLS = `id, profile_id, created_at, full_name, email, university, degree, graduation_year, skills,
  resume_url, portfolio_url, linkedin_url, github_url, bio, resume_score, ai_feedback, career_goal, target_roles, projects`;
const COMPANY_COLS = `id, profile_id, created_at, full_name, email, company, company_name, sector, industry, website,
  description, logo_url, hiring_roles, booth_number, skills_wanted, brochure_url`;

/**
 * Profile fields a user may edit on their own role row, and how each is coerced.
 * resume_score and ai_feedback are deliberately absent: companies rely on them,
 * so a student must not be able to set their own score.
 */
const STUDENT_FIELDS: Record<string, (v: unknown) => unknown> = {
  full_name: (v) => textOrNull(v, 200) ?? "",
  university: (v) => textOrNull(v, 300), degree: (v) => textOrNull(v, 300), graduation_year: intOrNull, skills: (v) => strArray(v),
  resume_url: urlOrNull, portfolio_url: urlOrNull, linkedin_url: urlOrNull, github_url: urlOrNull,
  bio: textOrNull,
  career_goal: (v) => textOrNull(v, 500), target_roles: (v) => strArray(v, 10),
  projects: (v) => JSON.stringify(projectList(v)),
};
const COMPANY_FIELDS: Record<string, (v: unknown) => unknown> = {
  full_name: (v) => textOrNull(v, 200) ?? "",
  company: (v) => textOrNull(v, 300), company_name: (v) => textOrNull(v, 300), sector: (v) => textOrNull(v, 200),
  industry: (v) => textOrNull(v, 200), website: urlOrNull,
  description: textOrNull, logo_url: urlOrNull, hiring_roles: (v) => strArray(v), booth_number: (v) => textOrNull(v, 50),
  skills_wanted: (v) => strArray(v), brochure_url: urlOrNull,
};
/** What a student sees of a fellow student: no contact details. */
const PEER_STUDENT_COLS = `id, profile_id, created_at, full_name, university, degree, graduation_year, skills, bio`;


/**
 * Upsert the caller's own role row with only whitelisted columns — the
 * equivalent of Firestore's `setDoc(..., { merge: true })`.
 */
async function upsertRoleRow(table: "students" | "companies", fields: Record<string, (v: unknown) => unknown>, id: string, input: unknown) {
  const entries = Object.entries((input ?? {}) as Row).filter(([k, v]) => k in fields && v !== undefined);
  if (!entries.length) return true;
  const cols = entries.map(([k]) => k);
  const values = entries.map(([k, v]) => fields[k](v));
  const placeholders = cols.map((_, i) => `$${i + 2}`);
  // Column names come from the whitelist above, never from the request.
  await db().query(
    `insert into ${table} (id, profile_id, ${cols.join(", ")}) values ($1, $1, ${placeholders.join(", ")})
     on conflict (id) do update set ${cols.map((c) => `${c} = excluded.${c}`).join(", ")}`,
    [id, ...values],
  );
  return true;
}

/* ---------------- event access ---------------- */

interface EventAccess {
  /** Created the event. */
  owner: boolean;
  /** Registered for it (joined by code, or the organiser). */
  member: boolean;
  /** Sees the whole event: the owner, or a college account registered for it. */
  staff: boolean;
}

async function eventAccess(u: AuthUser, eventId: unknown): Promise<EventAccess> {
  const rows = await db()`
    select e.created_by = ${u.id} as owner,
           exists (select 1 from event_registrations r where r.event_id = e.id and r.profile_id = ${u.id}) as member
    from events e where e.id = ${s(eventId)}
  `;
  const owner = Boolean(rows[0]?.owner);
  const member = Boolean(rows[0]?.member);
  return { owner, member, staff: owner || (member && u.role === "event_manager") };
}

/** Throws unless the caller is registered for (or owns) the event. */
async function requireMember(u: AuthUser, eventId: unknown): Promise<EventAccess> {
  const a = await eventAccess(u, eventId);
  if (!a.owner && !a.member) throw forbidden();
  return a;
}

async function requireStaff(u: AuthUser, eventId: unknown): Promise<void> {
  if (!(await eventAccess(u, eventId)).staff) throw forbidden();
}

/** Whether someone other than the caller is registered for (or owns) the event. */
async function isInEvent(profileId: string, eventId: string): Promise<boolean> {
  const rows = await db()`
    select 1 from events e where e.id = ${eventId} and (e.created_by = ${profileId}
      or exists (select 1 from event_registrations r where r.event_id = e.id and r.profile_id = ${profileId}))
  `;
  return rows.length > 0;
}

/** Private notes on a shortlist entry are for the company and the event staff only. */
function withoutNotes(rows: Row[]): Row[] {
  return rows.map((r) => ({ ...r, notes: null }));
}

/**
 * Whether the caller shares an event with someone registered in `role`, and
 * so may see their profile: as that event's owner, or registered for it.
 */
async function sharesEventWith(u: AuthUser, profileId: string, role: "student" | "company"): Promise<boolean> {
  const rows = await db()`
    select 1 from event_registrations t join events e on e.id = t.event_id
    where t.profile_id = ${profileId} and t.role = ${role}
      and (e.created_by = ${u.id}
        or exists (select 1 from event_registrations me where me.event_id = t.event_id and me.profile_id = ${u.id}))
    limit 1
  `;
  return rows.length > 0;
}

/**
 * Join codes are the key to an event, so only its owner ever receives them,
 * as `student_code` and `company_code`. The legacy `join_code` column is
 * never sent; event_codes is the source of truth.
 */
async function forViewer(u: AuthUser, event: Row | undefined): Promise<Row | null> {
  if (!event) return null;
  const rest = { ...event };
  delete rest.join_code;
  if (event.created_by !== u.id) return rest;
  return (await withCodes([rest]))[0];
}

async function withCodes(events: Row[]): Promise<Row[]> {
  if (!events.length) return events;
  const codes = await db()`select event_id, role, code from event_codes where event_id = any(${events.map((e) => e.id as string)}::text[])`;
  const code = (id: unknown, role: string) => (codes.find((c) => c.event_id === id && c.role === role)?.code as string) ?? null;
  return events.map((e) => ({ ...e, student_code: code(e.id, "student"), company_code: code(e.id, "company") }));
}

/** Which event, and which role, a typed code lets someone into. */
async function resolveCode(code: string): Promise<{ event: Row; role: "student" | "company" } | null> {
  const sql = db();
  const rows = await sql`select e.*, k.role as code_role from event_codes k join events e on e.id = k.event_id where k.code = ${code}`;
  if (rows[0]) {
    const event = { ...rows[0] };
    const role = event.code_role as "student" | "company";
    delete event.code_role;
    return { event, role };
  }
  // An event made by the previous release between migrating and deploying
  // only has the old single code, which was always handed to students.
  const legacy = await sql`select * from events where join_code = ${code}`;
  return legacy[0] ? { event: legacy[0], role: "student" } : null;
}

/* ---------------- owner (admin) ---------------- */

/** The site owner, named by email in the ADMIN_EMAILS secret. */
function isAdmin(u: AuthUser): boolean {
  const list = (serverEnv().ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return !!u.email && list.includes(u.email.toLowerCase());
}

/** Everything the owner dashboard shows, in one round of queries. */
async function adminOverview() {
  const sql = db();
  const t0 = Date.now();
  await sql`select 1`;
  const dbLatencyMs = Date.now() - t0;

  const [totals, colleges, events, errors, errorCounts] = await Promise.all([
    sql`
      select
        (select count(*) from profiles where role = 'event_manager')::int as colleges,
        (select count(*) from profiles where role = 'student')::int as students,
        (select count(*) from profiles where role = 'company')::int as companies,
        (select count(*) from profiles where created_at > now() - interval '7 days')::int as signups_7d,
        (select count(*) from events)::int as events,
        (select count(*) from events where status = 'live')::int as live_events,
        (select count(*) from event_registrations where role <> 'event_manager')::int as registrations,
        (select count(*) from scans)::int as scans,
        (select count(*) from scans where created_at > now() - interval '1 hour')::int as scans_1h,
        (select count(*) from messages where created_at > now() - interval '24 hours')::int as messages_24h
    `,
    sql`
      select p.id, p.full_name, p.email, p.organization, p.created_at,
             c.plan_choice, c.plan_selected_at,
             sub.plan as sub_plan, sub.status as sub_status, sub.current_period_end
      from profiles p
      left join colleges c on c.profile_id = p.id
      left join subscriptions sub on sub.profile_id = p.id
      where p.role = 'event_manager'
      order by p.created_at desc
      limit 1000
    `,
    sql`
      select e.id, e.title, e.status, e.location, e.start_date, e.end_date, e.created_at, e.created_by, e.host_org,
        (select code from event_codes k where k.event_id = e.id and k.role = 'student') as student_code,
        (select code from event_codes k where k.event_id = e.id and k.role = 'company') as company_code,
        (select count(*) from event_registrations r where r.event_id = e.id and r.role = 'student')::int as students,
        (select count(*) from event_registrations r where r.event_id = e.id and r.role = 'company')::int as companies,
        (select count(*) from scans x where x.event_id = e.id)::int as scans,
        (select count(*) from scans x where x.event_id = e.id and x.created_at > now() - interval '15 minutes')::int as scans_15m,
        (select max(x.created_at) from scans x where x.event_id = e.id) as last_scan_at,
        (select count(*) from shortlists l where l.event_id = e.id)::int as shortlists,
        (select count(*) from messages m where m.event_id = e.id)::int as messages
      from events e
      order by e.created_at desc
      limit 2000
    `,
    sql`select id, created_at, scope, message from app_errors order by created_at desc limit 50`,
    sql`
      select count(*) filter (where created_at > now() - interval '1 hour')::int as last_1h,
             count(*) filter (where created_at > now() - interval '24 hours')::int as last_24h
      from app_errors
    `,
  ]);

  return {
    generatedAt: new Date().toISOString(),
    health: { dbLatencyMs, errors1h: errorCounts[0]?.last_1h ?? 0, errors24h: errorCounts[0]?.last_24h ?? 0 },
    totals: totals[0],
    colleges,
    events,
    errors,
  };
}

/* ---------------- join codes ---------------- */

/** Typed by hand off a slide or poster, so 0/O and 1/I/L are left out. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const MAX_CERTIFICATES = 30;
async function certificateCount(studentId: string): Promise<number> {
  const [{ n }] = await db()`select count(*)::int as n from student_certificates where student_id = ${studentId}`;
  return n as number;
}

function codingSite(v: unknown): CodingSite {
  if (v === "leetcode" || v === "codeforces") return v;
  throw new HttpError(400, "Unknown coding site");
}

function randomCode(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  let out = "";
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

const EVENT_STATUSES = ["draft", "upcoming", "live", "ended"];
const SHORTLIST_STATUSES = ["shortlisted", "maybe", "rejected", "priority"];
const SESSION_KINDS = ["workshop", "mock_interview", "company_session", "recruiter_slot", "networking", "talk", "mentoring"];
/** The session types a company may run at an event it is registered for. */
const COMPANY_SESSION_KINDS = ["company_session", "recruiter_slot", "mock_interview"];
const APPLICATION_STATUSES = ["applied", "interviewing", "offer", "accepted", "rejected", "withdrawn"];

/* ---------------- notifications ---------------- */

/** An in-app alert. Returned as a query so it can join a transaction. */
function notifyQuery(profileId: string, kind: string, title: string, body: string | null, href: string | null) {
  return db()`insert into notifications (profile_id, kind, title, body, href)
              values (${profileId}, ${kind}, ${title.slice(0, 200)}, ${body?.slice(0, 500) ?? null}, ${href})`;
}

/** The name a company goes by: its company name, else the account's organisation. */
async function companyName(companyId: string): Promise<string> {
  const rows = await db()`
    select coalesce(nullif(c.company_name, ''), nullif(c.company, ''), nullif(p.organization, ''), p.full_name) as name
    from profiles p left join companies c on c.id = p.id where p.id = ${companyId}
  `;
  return (rows[0]?.name as string) || "A company";
}

/** A company may contact a student it scanned or shortlisted at this event. */
async function companyMetStudent(companyId: string, studentId: string, eventId: string) {
  const rows = await db()`
    select 1 where exists (select 1 from scans where event_id = ${eventId} and scanner_profile_id = ${companyId} and scanned_profile_id = ${studentId})
       or exists (select 1 from shortlists where event_id = ${eventId} and company_id = ${companyId} and student_id = ${studentId})
  `;
  return rows.length > 0;
}

/* ---------------- event membership ---------------- */

/**
 * Stored assessments on a student row are for the student and colleges only.
 * Everyone else gets the profile without them.
 */
function studentView(u: AuthUser, row: Row): Row {
  if (u.id === row.id || u.role === "event_manager") return row;
  return { ...row, resume_score: null, ai_feedback: null };
}

/** The session's event organiser or its host may manage it. */
async function assertCanManageSession(u: AuthUser, sessionId: string) {
  const rows = await db()`
    select 1 from event_sessions es join events e on e.id = es.event_id
    where es.id = ${sessionId} and (es.host_profile_id = ${u.id} or e.created_by = ${u.id})
  `;
  if (!rows.length) throw forbidden();
}

/* ---------------- live engagement ---------------- */

/**
 * Per-student activity at an event, counted from scans, shortlists, session
 * bookings and messages. Recomputed on every read, so it is never stale the
 * way the stored student_event_analytics rows were. Pass studentId for one row.
 */
async function studentActivity(eventId: string, studentId?: string) {
  return db().query(
    `select r.profile_id as student_id, p.full_name,
       st.full_name as st_full_name, st.email, st.degree, st.graduation_year, st.skills, st.resume_url,
       st.portfolio_url, st.linkedin_url, st.github_url, st.bio,
       (r.checked_in or exists (select 1 from scans x where x.event_id = $1 and x.scanned_profile_id = r.profile_id
          and x.scanner_role = 'event_manager')) as checked_in,
       (select count(distinct x.scanned_profile_id)::int from scans x where x.event_id = $1
          and x.scanner_profile_id = r.profile_id and x.scanned_role = 'company') as booths_visited,
       (select count(distinct x.scanner_profile_id)::int from scans x where x.event_id = $1
          and x.scanned_profile_id = r.profile_id and x.scanner_role = 'company') as recruiter_scans,
       (select count(*)::int from scans x where x.event_id = $1 and x.scanned_profile_id = r.profile_id) as profile_views,
       (select count(*)::int from shortlists l where l.event_id = $1 and l.student_id = r.profile_id
          and l.status in ('shortlisted', 'priority')) as shortlists,
       (select count(*)::int from session_bookings b join event_sessions es on es.id = b.session_id
          where es.event_id = $1 and b.profile_id = r.profile_id and b.status = 'attended') as sessions_attended,
       (select count(*)::int from session_bookings b join event_sessions es on es.id = b.session_id
          where es.event_id = $1 and b.profile_id = r.profile_id and b.status = 'booked') as sessions_booked,
       (select count(distinct m.receiver_profile_id)::int from messages m join profiles rp on rp.id = m.receiver_profile_id
          where m.event_id = $1 and m.sender_profile_id = r.profile_id and rp.role = 'company') as follow_ups,
       (select count(*)::int from messages m where m.event_id = $1 and m.receiver_profile_id = r.profile_id) as messages_received
     from event_registrations r
     join profiles p on p.id = r.profile_id
     left join students st on st.id = r.profile_id
     where r.event_id = $1 and r.role = 'student'${studentId ? " and r.profile_id = $2" : ""}`,
    studentId ? [eventId, studentId] : [eventId],
  );
}

function countsOf(r: Row): EngagementCounts {
  const n = (v: unknown) => Number(v) || 0;
  return {
    checked_in: Boolean(r.checked_in), booths_visited: n(r.booths_visited), recruiter_scans: n(r.recruiter_scans),
    shortlists: n(r.shortlists), sessions_attended: n(r.sessions_attended), sessions_booked: n(r.sessions_booked),
    follow_ups: n(r.follow_ups),
  };
}

/** Same shape as a student_event_analytics row, so existing screens read it unchanged. */
function analyticsRow(eventId: string, r: Row) {
  const counts = countsOf(r);
  const resume = evaluateResume({
    full_name: s(r.st_full_name) || s(r.full_name), email: s(r.email), degree: (r.degree as string) ?? null,
    graduation_year: (r.graduation_year as number) ?? null, skills: (r.skills as string[]) ?? [],
    resume_url: (r.resume_url as string) ?? null, portfolio_url: (r.portfolio_url as string) ?? null,
    linkedin_url: (r.linkedin_url as string) ?? null, github_url: (r.github_url as string) ?? null, bio: (r.bio as string) ?? null,
  });
  return {
    id: `${eventId}:${r.student_id}`, event_id: eventId, student_id: r.student_id as string,
    profile_views: Number(r.profile_views) || 0, company_scans: counts.recruiter_scans, shortlists: counts.shortlists,
    messages_received: Number(r.messages_received) || 0, resume_score: resume.score, engagement_score: engagementScore(counts),
  };
}

/* ---------------- ops ---------------- */

export const ops: Record<string, Op> = {
  /* Students */
  /**
   * Companies and colleges see the full profile, without stored assessments for
   * companies; a fellow student sees no contact details.
   */
  async getStudentByProfile(u, [profileId]) {
    const id = s(profileId);
    // Someone else's profile only when you share an event with them.
    if (id !== u.id && !(await sharesEventWith(u, id, "student"))) return null;
    const cols = u.role === "student" && id !== u.id ? PEER_STUDENT_COLS : STUDENT_COLS;
    const rows = await db().query(`select ${cols} from students where id = $1`, [id]);
    return rows[0] ? studentView(u, rows[0]) : null;
  },
  async updateStudentProfile(u, [profileId, fields]) {
    isMe(u, profileId);
    if (u.role !== "student") throw forbidden();
    return upsertRoleRow("students", STUDENT_FIELDS, u.id, fields);
  },
  async getRegisteredStudents(u, [eventId]) {
    await requireMember(u, eventId);
    const cols = u.role === "student" ? PEER_STUDENT_COLS : STUDENT_COLS;
    const rows = await db().query(
      `select ${cols.replace(/(\w+)/g, "s.$1")} from event_registrations r join students s on s.id = r.profile_id
       where r.event_id = $1 and r.role = 'student'`,
      [s(eventId)],
    );
    return rows.map((r) => studentView(u, r));
  },

  /* Companies */
  async getCompanyByProfile(u, [profileId]) {
    const id = s(profileId);
    if (id !== u.id && !(await sharesEventWith(u, id, "company"))) return null;
    const rows = await db().query(`select ${COMPANY_COLS} from companies where id = $1`, [id]);
    return rows[0] ?? null;
  },
  async updateCompanyProfile(u, [profileId, fields]) {
    isMe(u, profileId);
    if (u.role !== "company") throw forbidden();
    return upsertRoleRow("companies", COMPANY_FIELDS, u.id, fields);
  },
  async getRegisteredCompanies(u, [eventId]) {
    await requireMember(u, eventId);
    return db().query(
      `select ${COMPANY_COLS.replace(/(\w+)/g, "c.$1")} from event_registrations r join companies c on c.id = r.profile_id
       where r.event_id = $1 and r.role = 'company'`,
      [s(eventId)],
    );
  },

  /* Analytics */
  /** A student's own stats, or any attendee's for the event's staff. Never for companies. */
  async getAnalytics(u, [studentId, eventId]) {
    if (!s(studentId) || !s(eventId)) return null;
    if (studentId !== u.id) await requireStaff(u, eventId);
    const rows = await studentActivity(s(eventId), s(studentId));
    return rows[0] ? analyticsRow(s(eventId), rows[0]) : null;
  },
  async listAnalytics(u, [eventId]) {
    if (!s(eventId)) return [];
    await requireStaff(u, eventId);
    const rows = await studentActivity(s(eventId));
    return rows.map((r) => analyticsRow(s(eventId), r));
  },
  /**
   * The caller's engagement at an event, and the top five. Students only:
   * employers never see engagement or the leaderboard. Other students are
   * shown by first name and last initial only.
   */
  async getStudentEventInsights(u, [eventId]) {
    const ev = s(eventId);
    if (u.role !== "student" || !ev) throw forbidden();
    await requireMember(u, ev);
    const scored = (await studentActivity(ev))
      .map((r) => ({ id: r.student_id as string, name: s(r.full_name), counts: countsOf(r) }))
      .map((r) => ({ ...r, score: engagementScore(r.counts) }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    const rankOf = (score: number) => 1 + scored.filter((x) => x.score > score).length;
    const mine = scored.find((x) => x.id === u.id);
    return {
      total: scored.length,
      leaderboard: scored
        .filter((x) => x.score > 0)
        .slice(0, 5)
        .map((x) => ({ rank: rankOf(x.score), name: x.id === u.id ? x.name : shortName(x.name), score: x.score, isMe: x.id === u.id })),
      me: mine ? { rank: rankOf(mine.score), score: mine.score, counts: mine.counts } : null,
    };
  },
  /** Headcounts anyone in the event may see, without the people behind them. */
  async getEventCounts(u, [eventId]) {
    await requireMember(u, eventId);
    const rows = await db()`
      select count(*) filter (where role = 'student')::int as students, count(*) filter (where role = 'company')::int as companies
      from event_registrations where event_id = ${s(eventId)}
    `;
    return rows[0] ?? { students: 0, companies: 0 };
  },

  /* Scans: append-only, and only for a scan you performed at an event you're in. */
  async recordScan(u, [input]) {
    const i = (input ?? {}) as Row;
    isMe(u, i.scannerProfileId);
    // A scan belongs to an event. Without one (a hand-typed link) there is
    // nothing to record, so it is skipped rather than failing.
    if (!i.eventId) return false;
    await requireMember(u, i.eventId);
    // Both roles come from the accounts, not whatever the browser sends, and
    // the scanned person must be registered for the same event, so the stats
    // built from scans can be trusted.
    const rows = await db()`
      insert into scans (event_id, scanner_profile_id, scanned_profile_id, scanner_role, scanned_role, scan_context, notes)
      select ${s(i.eventId)}, ${u.id}, r.profile_id, ${u.role}, r.role,
             ${textOrNull(i.scanContext, 50) ?? "qr"}, ${textOrNull(i.notes)}
      from event_registrations r
      where r.event_id = ${s(i.eventId)} and r.profile_id = ${s(i.scannedProfileId)}
      returning id
    `;
    return rows.length > 0;
  },
  /** Scans you made or received; the whole event's scans for its staff. */
  async getScans(u, [filter]) {
    const f = (filter ?? {}) as Row;
    if (f.scannerProfileId !== u.id && f.scannedProfileId !== u.id) await requireStaff(u, f.eventId);
    const where = ["event_id = $1"];
    const params: unknown[] = [s(f.eventId)];
    if (f.scannerProfileId) { params.push(s(f.scannerProfileId)); where.push(`scanner_profile_id = $${params.length}`); }
    if (f.scannedProfileId) { params.push(s(f.scannedProfileId)); where.push(`scanned_profile_id = $${params.length}`); }
    return db().query(`select * from scans where ${where.join(" and ")} order by created_at desc`, params);
  },

  /* Shortlists — an entry belongs to the company that made it. */
  async upsertShortlist(u, [input]) {
    const i = (input ?? {}) as Row;
    isMe(u, i.companyId);
    if (u.role !== "company") throw forbidden();
    await requireMember(u, i.eventId);
    if (!SHORTLIST_STATUSES.includes(s(i.status))) throw new HttpError(400, "Unknown shortlist status.");
    // Only students registered for this event can be shortlisted at it.
    const student = await db()`
      select 1 from event_registrations where event_id = ${s(i.eventId)} and profile_id = ${s(i.studentId)} and role = 'student'
    `;
    if (!student.length) throw forbidden();
    // created_at is kept across status changes, as before.
    await db()`
      insert into shortlists (event_id, company_id, student_id, status, notes)
      values (${s(i.eventId)}, ${u.id}, ${s(i.studentId)}, ${s(i.status)}, ${textOrNull(i.notes)})
      on conflict (event_id, company_id, student_id) do update set status = excluded.status, notes = excluded.notes
    `;
    return true;
  },
  async getShortlist(u, [companyId, studentId, eventId]) {
    if (companyId !== u.id && studentId !== u.id) await requireStaff(u, eventId);
    const rows = await db()`
      select * from shortlists where company_id = ${s(companyId)} and student_id = ${s(studentId)} and event_id = ${s(eventId)}
    `;
    if (!rows[0]) return null;
    // A student only learns that a company shortlisted them, never "maybe" or "not a fit".
    if (studentId === u.id && companyId !== u.id) return ["shortlisted", "priority"].includes(s(rows[0].status)) ? withoutNotes(rows)[0] : null;
    return rows[0];
  },
  async listShortlistsForCompany(u, [companyId, eventId]) {
    if (companyId !== u.id) await requireStaff(u, eventId);
    return db()`select * from shortlists where company_id = ${s(companyId)} and event_id = ${s(eventId)} order by created_at desc`;
  },
  /**
   * For the student: only the companies that shortlisted them, never "maybe"
   * or "not a fit", and never the company's private notes. Staff see all.
   */
  async listShortlistsForStudent(u, [studentId, eventId]) {
    if (studentId !== u.id) {
      await requireStaff(u, eventId);
      return db()`select * from shortlists where student_id = ${s(studentId)} and event_id = ${s(eventId)}`;
    }
    return db()`
      select id, created_at, event_id, company_id, student_id, status, null as notes from shortlists
      where student_id = ${u.id} and event_id = ${s(eventId)} and status in ('shortlisted', 'priority')
    `;
  },
  async listShortlists(u, [eventId]) {
    await requireStaff(u, eventId);
    return db()`select * from shortlists where event_id = ${s(eventId)}`;
  },

  /* Messages — only the two participants can read a conversation. */
  async sendMessage(u, [input]) {
    const i = (input ?? {}) as Row;
    isMe(u, i.senderProfileId);
    const message = s(i.message).slice(0, 5000);
    if (!message.trim() || !s(i.receiverProfileId)) throw new HttpError(400, "Write a message first.");
    // Both people must be at the same event, so the API can't be used to message strangers.
    await requireMember(u, i.eventId);
    if (!(await isInEvent(s(i.receiverProfileId), s(i.eventId)))) throw forbidden();
    await db()`
      insert into messages (event_id, sender_profile_id, receiver_profile_id, message)
      values (${s(i.eventId)}, ${u.id}, ${s(i.receiverProfileId)}, ${message})
    `;
    return true;
  },
  /**
   * One follow-up to many candidates. A company may only message students it
   * scanned or shortlisted at this event, so this can't be used to mass-message
   * every attendee.
   */
  async sendBulkMessage(u, [eventId, studentIds, text]) {
    if (u.role !== "company") throw forbidden();
    const message = s(text).slice(0, 5000);
    if (!message.trim()) return { ok: false, error: "Write a message first." };
    // Counted before any cap, so an over-limit selection is refused, not silently cut short.
    const ids = Array.from(new Set(strArray(studentIds, 1000)));
    if (!ids.length) return { ok: false, error: "Choose at least one candidate." };
    if (ids.length > 200) return { ok: false, error: "You can message up to 200 candidates at once." };
    const rows = await db()`
      insert into messages (event_id, sender_profile_id, receiver_profile_id, message)
      select ${s(eventId)}, ${u.id}, p.id, ${message}
      from profiles p
      where p.id = any(${ids}::text[]) and p.role = 'student' and (
        exists (select 1 from scans x where x.event_id = ${s(eventId)} and x.scanner_profile_id = ${u.id} and x.scanned_profile_id = p.id)
        or exists (select 1 from shortlists l where l.event_id = ${s(eventId)} and l.company_id = ${u.id} and l.student_id = p.id)
      )
      returning receiver_profile_id
    `;
    return { ok: true, sent: rows.length, skipped: ids.length - rows.length };
  },
  async listMessagesForProfile(u, [profileId, eventId]) {
    isMe(u, profileId);
    return db()`
      select id, created_at, event_id, sender_profile_id, receiver_profile_id, message, read_at from messages
      where event_id = ${s(eventId)} and (sender_profile_id = ${u.id} or receiver_profile_id = ${u.id})
      order by created_at desc
    `;
  },
  async getUnreadMessageCount(u, [profileId]) {
    isMe(u, profileId);
    const rows = await db()`select count(*)::int as n from messages where receiver_profile_id = ${u.id} and read_at is null`;
    return rows[0]?.n ?? 0;
  },
  /** The recipient may only ever flip read_at — the message itself is never editable. */
  async markMessagesRead(u, [profileId, fromProfileId]) {
    isMe(u, profileId);
    const rows = fromProfileId
      ? await db()`update messages set read_at = now()
          where receiver_profile_id = ${u.id} and read_at is null and sender_profile_id = ${s(fromProfileId)} returning id`
      : await db()`update messages set read_at = now()
          where receiver_profile_id = ${u.id} and read_at is null returning id`;
    return rows.length;
  },

  /* Checklist */
  async getChecklistItems(_u, [role, eventId]) {
    // Events created before the default checklist existed get it on first view.
    if (s(eventId)) await addDefaultChecklist(s(eventId));
    return db()`
      select id, event_id, role, title, description, phase, order_index from checklist_items
      where event_id = ${s(eventId)} and role = ${s(role)} order by order_index asc
    `;
  },
  async getChecklistProgress(u, [profileId]) {
    isMe(u, profileId);
    const rows = await db()`select checklist_item_id, completed from checklist_progress where profile_id = ${u.id}`;
    return Object.fromEntries(rows.map((r) => [r.checklist_item_id as string, Boolean(r.completed)]));
  },
  async setChecklistProgress(u, [itemId, profileId, completed]) {
    isMe(u, profileId);
    const done = Boolean(completed);
    await db()`
      insert into checklist_progress (checklist_item_id, profile_id, completed, completed_at)
      values (${s(itemId)}, ${u.id}, ${done}, ${done ? new Date().toISOString() : null})
      on conflict (profile_id, checklist_item_id) do update set completed = excluded.completed, completed_at = excluded.completed_at
    `;
    return true;
  },

  /* Profiles */
  async getProfileNames(_u, [ids]) {
    const list = Array.from(new Set(strArray(ids, 1000)));
    if (!list.length) return {};
    const rows = await db()`select id, full_name, role, organization from profiles where id = any(${list}::text[])`;
    return Object.fromEntries(
      rows.map((r) => [r.id as string, { name: (r.full_name as string) ?? "", role: (r.role as string) ?? "", org: (r.organization as string) ?? "" }]),
    );
  },

  /* Events */
  /** Registered people and the owner only; the codes only for the owner. */
  async getEvent(u, [eventId]) {
    const a = await eventAccess(u, eventId);
    if (!a.owner && !a.member) return null;
    const rows = await db()`select * from events where id = ${s(eventId)}`;
    return forViewer(u, rows[0]);
  },
  async listEventsForManager(u, [managerProfileId]) {
    isMe(u, managerProfileId);
    const rows = await db()`select * from events where created_by = ${u.id} order by created_at desc`;
    return Promise.all(rows.map((e) => forViewer(u, e)));
  },
  /** Your own memberships only, as the registrations collection-group rule allowed. */
  async listEventsForProfile(u, [profileId]) {
    isMe(u, profileId);
    const rows = await db()`
      select e.* from event_registrations r join events e on e.id = r.event_id
      where r.profile_id = ${u.id} order by e.start_date desc nulls last
    `;
    return Promise.all(rows.map((e) => forViewer(u, e)));
  },
  async getEventByCode(u, [code]) {
    const c = s(code).trim().toUpperCase();
    if (!c) return null;
    const found = await resolveCode(c);
    return found ? forViewer(u, found.event) : null;
  },
  /** Any college can create an event; it is always owned by the caller. */
  async createEvent(u, [input]) {
    const i = (input ?? {}) as Row;
    const title = s(i.title).trim().slice(0, 200);
    if (!title) return { ok: false, error: "Give your event a name." };
    if (!i.createdBy) return { ok: false, error: "We couldn't tell which account is creating this event." };
    isMe(u, i.createdBy);
    if (u.role !== "event_manager") throw forbidden();
    const status = EVENT_STATUSES.includes(s(i.status)) ? s(i.status) : "upcoming";

    const sql = db();
    for (let attempt = 0; attempt < 5; attempt++) {
      const id = crypto.randomUUID();
      // Collisions at 31^6 are vanishingly rare; lengthen rather than loop forever.
      const len = attempt < 4 ? 6 : 8;
      const studentCode = randomCode(len);
      let companyCode = randomCode(len);
      while (companyCode === studentCode) companyCode = randomCode(len);
      try {
        const [rows] = await sql.transaction([
          sql`insert into events (id, title, description, location, start_date, end_date, status, created_by, host_org, timezone)
              values (${id}, ${title}, ${s(i.description).trim() || null}, ${s(i.location).trim() || null},
                      ${s(i.startDate) || null}, ${s(i.endDate) || null}, ${status}, ${u.id},
                      ${textOrNull(i.hostOrg, 300)}, ${isTimeZone(i.timezone) ? i.timezone : null})
              returning *`,
          // One code for students and a different one for employers.
          sql`insert into event_codes (code, event_id, role) values (${studentCode}, ${id}, 'student'), (${companyCode}, ${id}, 'company')`,
          // The organiser is registered into their own event so it appears in
          // their event list the same way a joined event does.
          sql`insert into event_registrations (event_id, profile_id, role, checked_in)
              values (${id}, ${u.id}, 'event_manager', true)`,
        ]);
        // A failure here must not report the event as failed: the checklist is
        // also added the first time anyone opens it.
        await addDefaultChecklist(id).catch((err) => console.error("[rpc] default checklist", err));
        return { ok: true, event: await forViewer(u, rows[0]) };
      } catch (err) {
        if ((err as { code?: string }).code === "23505") continue; // code clash — retry
        console.error("[rpc] createEvent", err);
        return { ok: false, error: "Couldn't create the event. Please try again." };
      }
    }
    return { ok: false, error: "Couldn't create the event. Please try again." };
  },
  /** Only the event's owner may edit it. */
  async updateEvent(u, [eventId, fields]) {
    const f = (fields ?? {}) as Row;
    const allowed: Record<string, (v: unknown) => unknown> = {
      title: (v) => s(v).trim().slice(0, 200), description: textOrNull, location: textOrNull,
      start_date: (v) => s(v) || null, end_date: (v) => s(v) || null, host_org: textOrNull,
      status: (v) => (EVENT_STATUSES.includes(s(v)) ? s(v) : "upcoming"),
      timezone: (v) => v,
    };
    const entries = Object.entries(f).filter(([k, v]) => k in allowed && v !== undefined && (k !== "timezone" || isTimeZone(v)));
    if (!entries.length) return true;
    if (f.title !== undefined && !s(f.title).trim()) throw new HttpError(400, "Give your event a name.");
    const sets = entries.map(([k], idx) => `${k} = $${idx + 3}`);
    const rows = await db().query(
      `update events set ${sets.join(", ")} where id = $1 and created_by = $2 returning id`,
      [s(eventId), u.id, ...entries.map(([k, v]) => allowed[k](v))],
    );
    if (!rows.length) throw forbidden();
    return true;
  },
  /**
   * Join by short code. Students need the event's student code and employers
   * its employer code; organisers create events rather than join them.
   * Idempotent — re-joining never resets check-in.
   */
  async joinEventByCode(u, [code, profileId]) {
    isMe(u, profileId);
    const c = s(code).trim().toUpperCase();
    if (!c) return { ok: false, error: "Enter the event code your college gave you." };
    if (u.role === "event_manager") return { ok: false, error: "College accounts create events instead of joining them with a code." };
    const found = await resolveCode(c);
    if (!found) return { ok: false, error: "No event matches that code. Check it and try again." };
    const { event, role } = found;
    if (role !== u.role) {
      return {
        ok: false,
        error: role === "company"
          ? "That is the employer code for this event. Ask your college for the student code."
          : "That is the student code for this event. Ask the college for the employer code.",
      };
    }
    if (event.status === "ended") return { ok: false, error: `${event.title} has already finished.` };

    // The registration role is the account's real role, not whatever the browser sends.
    await db()`insert into event_registrations (event_id, profile_id, role) values (${event.id}, ${u.id}, ${u.role})
               on conflict (event_id, profile_id) do nothing`;
    return { ok: true, event: await forViewer(u, event) };
  },
  /** Replace a leaked code. The old one stops working at once. Owner only. */
  async regenerateEventCode(u, [eventId, role]) {
    if (!(await eventAccess(u, eventId)).owner) throw forbidden();
    if (role !== "student" && role !== "company") throw new HttpError(400, "Unknown code type.");
    const sql = db();
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = randomCode(attempt < 4 ? 6 : 8);
      try {
        await sql`insert into event_codes (code, event_id, role) values (${code}, ${s(eventId)}, ${role})
                  on conflict (event_id, role) do update set code = excluded.code, created_at = now()`;
        return code;
      } catch (err) {
        if ((err as { code?: string }).code === "23505") continue;
        throw err;
      }
    }
    throw new HttpError(500, "Couldn't make a new code. Please try again.");
  },
  /** Everyone who joined the event, with the details they signed up with. Owner only. */
  async listAttendees(u, [eventId]) {
    if (!(await eventAccess(u, eventId)).owner) throw forbidden();
    return db()`
      select r.profile_id, r.role, r.created_at as joined_at, r.checked_in,
             p.full_name, p.email, p.organization,
             s.university, s.degree, s.graduation_year,
             c.company_name, c.company, c.sector, c.booth_number
      from event_registrations r
      join profiles p on p.id = r.profile_id
      left join students s on s.id = r.profile_id
      left join companies c on c.id = r.profile_id
      where r.event_id = ${s(eventId)} and r.role in ('student', 'company')
      order by r.created_at desc
    `;
  },

  /* Plan choice — asked once of every college after they sign in. */
  async getPlanChoice(u) {
    if (u.role !== "event_manager") return { required: false, choice: null };
    const rows = await db()`
      select c.plan_choice, c.plan_selected_at, sub.plan as sub_plan
      from profiles p left join colleges c on c.profile_id = p.id left join subscriptions sub on sub.profile_id = p.id
      where p.id = ${u.id}
    `;
    const r = rows[0] ?? {};
    const chosen = !!r.plan_selected_at || r.sub_plan === "pro";
    return { required: !chosen, choice: (r.plan_choice as string) ?? (r.sub_plan === "pro" ? "pro" : null) };
  },
  /** Records the choice only. Pro features still come from the Stripe webhook. */
  async choosePlan(u, [plan]) {
    if (u.role !== "event_manager") throw forbidden();
    if (plan !== "free" && plan !== "pro") throw new HttpError(400, "Choose a plan.");
    const sql = db();
    const updated = await sql`
      update colleges set plan_choice = ${plan}, plan_selected_at = now() where profile_id = ${u.id} returning id
    `;
    if (!updated.length) {
      // Accounts imported without a college row get one now, keyed like sign-up does.
      await sql`
        insert into colleges (id, profile_id, full_name, email, institution, plan_choice, plan_selected_at)
        values (${u.id}, ${u.id}, ${u.name}, ${u.email}, ${u.org || null}, ${plan}, now())
      `;
    }
    return true;
  },

  /* Owner dashboard. Anyone else gets a plain 404, so the page doesn't advertise itself. */
  async isAdmin(u) {
    return isAdmin(u);
  },
  async adminOverview(u) {
    if (!isAdmin(u)) throw new HttpError(404, "Not found.");
    return adminOverview();
  },

  /* Sessions: workshops, mock interviews, company sessions, recruiter slots. */
  async listSessions(u, [eventId]) {
    return db()`
      select es.*, p.full_name as host_name, p.organization as host_org, p.role as host_role, e.timezone as event_timezone,
        (select count(*)::int from session_bookings b where b.session_id = es.id and b.status in ('booked', 'attended')) as booked_count,
        (select count(*)::int from session_bookings b where b.session_id = es.id and b.status = 'waitlisted') as waitlist_count,
        mine.status as my_status,
        case when mine.status = 'waitlisted' then 1 + (
          select count(*)::int from session_bookings w where w.session_id = es.id and w.status = 'waitlisted'
            and (w.created_at, w.id) < (mine.created_at, mine.id)
        ) end as my_waitlist_position
      from event_sessions es
      join events e on e.id = es.event_id
      left join profiles p on p.id = es.host_profile_id
      left join session_bookings mine on mine.session_id = es.id and mine.profile_id = ${u.id} and mine.status <> 'cancelled'
      where es.event_id = ${s(eventId)}
      order by es.starts_at asc, es.title asc
    `;
  },
  /** The organiser may add any session; a registered company only its own kinds. */
  async createSession(u, [input]) {
    const i = (input ?? {}) as Row;
    const eventId = s(i.eventId);
    const kind = s(i.kind);
    const title = s(i.title).trim().slice(0, 200);
    const startsAt = isoOrNull(i.startsAt);
    const endsAt = isoOrNull(i.endsAt);
    let capacity = intOrNull(i.capacity);
    if (!SESSION_KINDS.includes(kind)) return { ok: false, error: "Pick a session type." };
    if (!title) return { ok: false, error: "Give the session a title." };
    if (!startsAt) return { ok: false, error: "Set a start time." };
    if (endsAt && endsAt <= startsAt) return { ok: false, error: "The end time must be after the start time." };
    if (capacity !== null && (capacity < 1 || capacity > 10000)) return { ok: false, error: "Capacity must be between 1 and 10,000, or left empty." };
    if (kind === "recruiter_slot" && capacity === null) capacity = 1;

    const events = await db()`select created_by from events where id = ${eventId}`;
    if (!events.length) return { ok: false, error: "That event no longer exists." };
    const owner = events[0].created_by === u.id;
    const company = u.role === "company" && COMPANY_SESSION_KINDS.includes(kind) && (await isInEvent(u.id, eventId));
    if (!owner && !company) throw forbidden();

    const rows = await db()`
      insert into event_sessions (event_id, host_profile_id, kind, title, description, location, starts_at, ends_at, capacity)
      values (${eventId}, ${u.id}, ${kind}, ${title}, ${textOrNull(i.description, 1000)?.trim() || null},
              ${textOrNull(i.location, 200)?.trim() || null}, ${startsAt}, ${endsAt}, ${capacity})
      returning *
    `;
    return { ok: true, session: rows[0] };
  },
  async deleteSession(u, [sessionId]) {
    await assertCanManageSession(u, s(sessionId));
    await db()`delete from event_sessions where id = ${s(sessionId)}`;
    return true;
  },
  /**
   * Book a place, or join the waitlist when the session is full. The session
   * row is locked first so two students can't take the last place at once.
   */
  async bookSession(u, [sessionId]) {
    if (u.role !== "student") return { ok: false, error: "Only students can book sessions." };
    const id = s(sessionId);
    const sql = db();
    const [, rows] = await sql.transaction([
      sql`select id from event_sessions where id = ${id} for update`,
      sql`
        insert into session_bookings (session_id, profile_id, status)
        select es.id, ${u.id},
          case when es.capacity is null or (
            select count(*) from session_bookings b where b.session_id = es.id and b.status in ('booked', 'attended')
          ) < es.capacity then 'booked' else 'waitlisted' end
        from event_sessions es
        where es.id = ${id}
          and coalesce(es.ends_at, es.starts_at + interval '1 hour') > now()
          and exists (select 1 from event_registrations r where r.event_id = es.event_id and r.profile_id = ${u.id})
        on conflict (session_id, profile_id) do update set status = excluded.status, created_at = now()
          where session_bookings.status = 'cancelled'
        returning status
      `,
    ]);
    if (rows.length) return { ok: true, status: rows[0].status };

    // Nothing written: already booked, not registered, finished, or gone.
    const existing = await sql`select status from session_bookings where session_id = ${id} and profile_id = ${u.id} and status <> 'cancelled'`;
    if (existing.length) return { ok: true, status: existing[0].status };
    const found = await sql`select event_id from event_sessions where id = ${id}`;
    if (!found.length) return { ok: false, error: "That session no longer exists." };
    if (!(await isInEvent(u.id, found[0].event_id as string))) return { ok: false, error: "Join this event first to book its sessions." };
    return { ok: false, error: "This session has already finished." };
  },
  /** Cancelling frees a place, which goes to the longest-waiting student. */
  async cancelBooking(u, [sessionId]) {
    const id = s(sessionId);
    const sql = db();
    const [, cancelled, promoted] = await sql.transaction([
      sql`select id from event_sessions where id = ${id} for update`,
      sql`update session_bookings set status = 'cancelled'
          where session_id = ${id} and profile_id = ${u.id} and status in ('booked', 'waitlisted') returning id`,
      sql`update session_bookings set status = 'booked' where id = (
            select w.id from session_bookings w join event_sessions es on es.id = w.session_id
            where w.session_id = ${id} and w.status = 'waitlisted'
              and (es.capacity is null or (
                select count(*) from session_bookings b where b.session_id = es.id and b.status in ('booked', 'attended')
              ) < es.capacity)
            order by w.created_at, w.id limit 1
          ) returning profile_id`,
    ]);
    if (promoted.length) {
      const [session] = await sql`select title from event_sessions where id = ${id}`;
      await notifyQuery(promoted[0].profile_id as string, "waitlist_promoted", `You're booked for ${session?.title ?? "a session"}`,
        "A place opened up, so you moved off the waitlist.", "/dashboard/student/schedule");
    }
    return cancelled.length > 0;
  },
  async listSessionBookings(u, [sessionId]) {
    await assertCanManageSession(u, s(sessionId));
    return db()`
      select b.profile_id, b.status, b.created_at, p.full_name, st.university, st.degree
      from session_bookings b join profiles p on p.id = b.profile_id left join students st on st.id = b.profile_id
      where b.session_id = ${s(sessionId)} and b.status <> 'cancelled'
      order by case b.status when 'waitlisted' then 1 else 0 end, b.created_at, b.id
    `;
  },
  async markAttendance(u, [sessionId, profileId, attended]) {
    await assertCanManageSession(u, s(sessionId));
    const rows = await db()`
      update session_bookings set status = ${attended ? "attended" : "booked"}
      where session_id = ${s(sessionId)} and profile_id = ${s(profileId)} and status in ('booked', 'waitlisted', 'attended')
      returning status
    `;
    return rows.length > 0;
  },

  /* Saved companies: a student's own plan for an event. */
  async listSavedCompanies(u, [eventId]) {
    return db()`select * from saved_companies where student_id = ${u.id} and event_id = ${s(eventId)}`;
  },
  async saveCompany(u, [eventId, companyId, fields]) {
    if (u.role !== "student") throw forbidden();
    const allowed: Record<string, (v: unknown) => unknown> = {
      saved: Boolean, interested: Boolean, visited: Boolean, follow_up: Boolean, note: (v) => textOrNull(v, 2000),
    };
    const entries = Object.entries((fields ?? {}) as Row).filter(([k, v]) => k in allowed && v !== undefined);
    const company = await db()`select role from profiles where id = ${s(companyId)}`;
    if (company[0]?.role !== "company") return { ok: false, error: "That company isn't on GradLink." };
    const cols = entries.map(([k]) => k);
    // Column names come from the whitelist above, never from the request.
    const rows = await db().query(
      `insert into saved_companies (student_id, event_id, company_id${cols.map((c) => `, ${c}`).join("")})
       values ($1, $2, $3${cols.map((_, i) => `, $${i + 4}`).join("")})
       on conflict (student_id, event_id, company_id) do update set updated_at = now()${cols.map((c) => `, ${c} = excluded.${c}`).join("")}
       returning *`,
      [u.id, s(eventId), s(companyId), ...entries.map(([k, v]) => allowed[k](v))],
    );
    return { ok: true, saved: rows[0] };
  },

  /* Applications: tracked by the student, private to them. */
  async listApplications(u) {
    return db()`select * from applications where student_id = ${u.id} order by updated_at desc`;
  },
  async saveApplication(u, [input]) {
    if (u.role !== "student") throw forbidden();
    const i = (input ?? {}) as Row;
    const companyName = s(i.companyName).trim().slice(0, 200);
    const roleTitle = s(i.roleTitle).trim().slice(0, 200);
    const status = APPLICATION_STATUSES.includes(s(i.status)) ? s(i.status) : "applied";
    if (!companyName) return { ok: false, error: "Add the company name." };
    if (!roleTitle) return { ok: false, error: "Add the role you applied for." };
    const interviewAt = isoOrNull(i.interviewAt);
    const notes = textOrNull(i.notes, 2000)?.trim() || null;

    // Links are kept only when they point at a real event and company.
    const eventRows = s(i.eventId) ? await db()`select id from events where id = ${s(i.eventId)}` : [];
    const companyRows = s(i.companyId) ? await db()`select id from profiles where id = ${s(i.companyId)} and role = 'company'` : [];
    const eventId = (eventRows[0]?.id as string) ?? null;
    const companyId = (companyRows[0]?.id as string) ?? null;

    const rows = s(i.id)
      ? await db()`
          update applications set company_name = ${companyName}, role_title = ${roleTitle}, status = ${status},
            interview_at = ${interviewAt}, notes = ${notes}, event_id = ${eventId}, company_id = ${companyId}, updated_at = now()
          where id = ${s(i.id)} and student_id = ${u.id} returning *`
      : await db()`
          insert into applications (student_id, event_id, company_id, company_name, role_title, status, interview_at, notes)
          values (${u.id}, ${eventId}, ${companyId}, ${companyName}, ${roleTitle}, ${status}, ${interviewAt}, ${notes})
          returning *`;
    if (!rows.length) throw forbidden();
    return { ok: true, application: rows[0] };
  },
  async deleteApplication(u, [id]) {
    const rows = await db()`delete from applications where id = ${s(id)} and student_id = ${u.id} returning id`;
    return rows.length > 0;
  },

  /* Notifications: the caller's own. */
  async listNotifications(u) {
    return db()`select * from notifications where profile_id = ${u.id} order by created_at desc limit 50`;
  },
  async getUnreadNotificationCount(u) {
    const rows = await db()`select count(*)::int as n from notifications where profile_id = ${u.id} and read_at is null`;
    return rows[0]?.n ?? 0;
  },
  async markNotificationsRead(u) {
    const rows = await db()`update notifications set read_at = now() where profile_id = ${u.id} and read_at is null returning id`;
    return rows.length;
  },

  /* Interview invites: company to a student it met; the student books a time. */
  async sendInterviewInvite(u, [input]) {
    if (u.role !== "company") throw forbidden();
    const i = (input ?? {}) as Row;
    const eventId = s(i.eventId);
    const studentId = s(i.studentId);
    const roleTitle = s(i.roleTitle).trim().slice(0, 200);
    if (!roleTitle) return { ok: false, error: "Add the role you are interviewing for." };
    const now = Date.now();
    const times = Array.from(new Set((Array.isArray(i.proposedTimes) ? i.proposedTimes : []).map(isoOrNull).filter((t): t is string => !!t)))
      .filter((t) => new Date(t).getTime() > now)
      .sort()
      .slice(0, 5);
    if (Array.isArray(i.proposedTimes) && i.proposedTimes.some((t) => s(t)) && !times.length) {
      return { ok: false, error: "Proposed times must be in the future." };
    }
    if (!(await companyMetStudent(u.id, studentId, eventId))) {
      return { ok: false, error: "You can invite students you scanned or shortlisted at this event." };
    }
    const open = await db()`select 1 from interview_invites where company_id = ${u.id} and student_id = ${studentId} and status = 'pending'`;
    if (open.length) return { ok: false, error: "This candidate already has an open invite from you. Cancel it to send a new one." };

    const name = await companyName(u.id);
    const sql = db();
    const [rows] = await sql.transaction([
      sql`insert into interview_invites (event_id, company_id, student_id, role_title, message, location, proposed_times)
          values (${eventId}, ${u.id}, ${studentId}, ${roleTitle}, ${textOrNull(i.message, 2000)?.trim() || null},
                  ${textOrNull(i.location, 300)?.trim() || null}, ${times}::timestamptz[])
          returning *`,
      notifyQuery(studentId, "interview_invite", `${name} invited you to interview`, roleTitle, "/dashboard/student/applications"),
    ]);
    return { ok: true, invite: rows[0] };
  },
  async listInterviewInvitesForStudent(u) {
    return db()`
      select i.*, coalesce(nullif(c.company_name, ''), nullif(c.company, ''), nullif(p.organization, ''), p.full_name) as company_name, c.booth_number
      from interview_invites i join profiles p on p.id = i.company_id left join companies c on c.id = i.company_id
      where i.student_id = ${u.id} and i.status <> 'cancelled'
      order by case i.status when 'pending' then 0 else 1 end, i.created_at desc
    `;
  },
  async listInterviewInvitesForCompany(u, [eventId]) {
    if (u.role !== "company") throw forbidden();
    return db()`
      select i.*, p.full_name as student_name from interview_invites i join profiles p on p.id = i.student_id
      where i.company_id = ${u.id} and i.event_id = ${s(eventId)} order by i.created_at desc
    `;
  },
  /**
   * Accept one of the proposed times (or accept when none were proposed), or
   * decline. Accepting books the interview into the student's applications.
   */
  async respondInterviewInvite(u, [inviteId, accept, chosenTime]) {
    const sql = db();
    const [invite] = await sql`select * from interview_invites where id = ${s(inviteId)} and student_id = ${u.id}`;
    if (!invite) throw forbidden();
    if (invite.status !== "pending") return { ok: false, error: "This invite is no longer open." };
    const proposed = ((invite.proposed_times as string[]) ?? []).map((t) => new Date(t).toISOString());
    const chosen = isoOrNull(chosenTime);
    if (accept && proposed.length && (!chosen || !proposed.includes(chosen))) return { ok: false, error: "Pick one of the proposed times." };

    // Claim the invite first so a double click can't book it twice.
    const claimed = await sql`
      update interview_invites set status = ${accept ? "accepted" : "declined"}, chosen_time = ${accept ? chosen : null}, updated_at = now()
      where id = ${invite.id as string} and status = 'pending' returning id
    `;
    if (!claimed.length) return { ok: false, error: "This invite is no longer open." };

    const [me] = await sql`select full_name from profiles where id = ${u.id}`;
    const studentName = (me?.full_name as string) || "A student";
    const href = `/scan/student/${u.id}${invite.event_id ? `?eventId=${invite.event_id}` : ""}`;
    if (!accept) {
      await notifyQuery(invite.company_id as string, "interview_declined", `${studentName} declined your interview invite`, invite.role_title as string, href);
      return { ok: true };
    }

    const name = await companyName(invite.company_id as string);
    const existing = await sql`
      select id from applications where student_id = ${u.id} and company_id = ${invite.company_id as string}
        and lower(role_title) = lower(${invite.role_title as string}) order by updated_at desc limit 1
    `;
    const app = existing.length
      ? await sql`update applications set status = 'interviewing', interview_at = ${chosen}, updated_at = now()
                  where id = ${existing[0].id as string} returning *`
      : await sql`insert into applications (student_id, event_id, company_id, company_name, role_title, status, interview_at)
                  values (${u.id}, ${invite.event_id as string | null}, ${invite.company_id as string}, ${name}, ${invite.role_title as string}, 'interviewing', ${chosen})
                  returning *`;
    await sql.transaction([
      sql`update interview_invites set application_id = ${app[0].id as string} where id = ${invite.id as string}`,
      notifyQuery(invite.company_id as string, "interview_accepted", `${studentName} accepted your interview invite`,
        invite.role_title as string, href),
    ]);
    return { ok: true, application: app[0] };
  },
  async cancelInterviewInvite(u, [inviteId]) {
    const sql = db();
    const rows = await sql`
      update interview_invites set status = 'cancelled', updated_at = now()
      where id = ${s(inviteId)} and company_id = ${u.id} and status in ('pending', 'accepted') returning student_id, role_title
    `;
    if (!rows.length) return false;
    const name = await companyName(u.id);
    await notifyQuery(rows[0].student_id as string, "interview_cancelled", `${name} cancelled an interview`, rows[0].role_title as string, "/dashboard/student/applications");
    return true;
  },

  /* Booth queues: live, while the event is running. */
  async joinQueue(u, [eventId, companyId]) {
    if (u.role !== "student") return { ok: false, error: "Only students can join a booth queue." };
    const ev = s(eventId), co = s(companyId);
    const sql = db();
    const [event] = await sql`select status from events where id = ${ev}`;
    if (!event) return { ok: false, error: "That event no longer exists." };
    if (event.status !== "live") return { ok: false, error: "Booth queues open when the event is live." };
    if (!(await isInEvent(u.id, ev))) return { ok: false, error: "Join this event first." };
    const booth = await sql`select 1 from event_registrations where event_id = ${ev} and profile_id = ${co} and role = 'company'`;
    if (!booth.length) return { ok: false, error: "That company isn't at this event." };
    const active = await sql`
      select count(*)::int as n from booth_queue
      where event_id = ${ev} and student_id = ${u.id} and status in ('waiting', 'called') and company_id <> ${co}
    `;
    if ((active[0]?.n ?? 0) >= 3) return { ok: false, error: "You can wait in up to 3 queues at once. Leave one first." };
    await sql`
      insert into booth_queue (event_id, company_id, student_id) values (${ev}, ${co}, ${u.id})
      on conflict (event_id, company_id, student_id) do update
        set status = 'waiting', created_at = now(), updated_at = now(), called_at = null
        where booth_queue.status in ('seen', 'left')
    `;
    return { ok: true };
  },
  async leaveQueue(u, [eventId, companyId]) {
    const rows = await db()`
      update booth_queue set status = 'left', updated_at = now()
      where event_id = ${s(eventId)} and company_id = ${s(companyId)} and student_id = ${u.id} and status in ('waiting', 'called')
      returning id
    `;
    return rows.length > 0;
  },
  /** The student's queues, with their place in each. */
  async listMyQueues(u, [eventId]) {
    return db()`
      select q.company_id, q.status, q.created_at, q.called_at,
        coalesce(nullif(c.company_name, ''), nullif(c.company, ''), nullif(p.organization, ''), p.full_name) as company_name, c.booth_number,
        case when q.status = 'waiting' then 1 + (
          select count(*)::int from booth_queue w where w.event_id = q.event_id and w.company_id = q.company_id
            and w.status = 'waiting' and (w.created_at, w.id) < (q.created_at, q.id)
        ) end as position
      from booth_queue q join profiles p on p.id = q.company_id left join companies c on c.id = q.company_id
      where q.event_id = ${s(eventId)} and q.student_id = ${u.id} and q.status in ('waiting', 'called')
      order by q.created_at
    `;
  },
  /** The company's own queue: called students first, then waiting in order. Strengths only. */
  async listBoothQueue(u, [eventId]) {
    if (u.role !== "company") throw forbidden();
    return db()`
      select q.student_id, q.status, q.created_at, q.called_at, p.full_name, st.degree, st.graduation_year, st.target_roles, st.skills
      from booth_queue q join profiles p on p.id = q.student_id left join students st on st.id = q.student_id
      where q.event_id = ${s(eventId)} and q.company_id = ${u.id} and q.status in ('waiting', 'called')
      order by case q.status when 'called' then 0 else 1 end, q.created_at, q.id
    `;
  },
  /** Call the student at the front. Skips rows another tab is calling at the same moment. */
  async callNextInQueue(u, [eventId]) {
    if (u.role !== "company") throw forbidden();
    const rows = await db()`
      update booth_queue set status = 'called', called_at = now(), updated_at = now()
      where id = (
        select id from booth_queue where event_id = ${s(eventId)} and company_id = ${u.id} and status = 'waiting'
        order by created_at, id limit 1 for update skip locked
      ) returning student_id
    `;
    if (!rows.length) return null;
    const [booth] = await db()`select booth_number from companies where id = ${u.id}`;
    const name = await companyName(u.id);
    await notifyQuery(rows[0].student_id as string, "queue_called", `It's your turn at ${name}`,
      booth?.booth_number ? `Head to booth ${booth.booth_number} now.` : "Head to their booth now.", "/dashboard/student/schedule");
    return rows[0].student_id;
  },
  async markQueueEntry(u, [eventId, studentId, status]) {
    if (u.role !== "company" || !["seen", "left"].includes(s(status))) throw forbidden();
    const rows = await db()`
      update booth_queue set status = ${s(status)}, updated_at = now()
      where event_id = ${s(eventId)} and company_id = ${u.id} and student_id = ${s(studentId)} and status in ('waiting', 'called')
      returning id
    `;
    return rows.length > 0;
  },

  /* A student's history across every event, for the career profile. */
  async getStudentHistory(u) {
    if (u.role !== "student") throw forbidden();
    const sql = db();
    const [events, connections] = await Promise.all([
      sql`
        select e.id, e.title, e.start_date, e.status, e.location,
          (select count(distinct x.scanner_profile_id)::int from scans x where x.event_id = e.id and x.scanned_profile_id = ${u.id} and x.scanner_role = 'company') as recruiter_scans,
          (select count(distinct x.scanned_profile_id)::int from scans x where x.event_id = e.id and x.scanner_profile_id = ${u.id} and x.scanned_role = 'company') as booths_visited,
          (select count(*)::int from session_bookings b join event_sessions es on es.id = b.session_id where es.event_id = e.id and b.profile_id = ${u.id} and b.status = 'attended') as sessions_attended,
          (select count(*)::int from shortlists l where l.event_id = e.id and l.student_id = ${u.id} and l.status in ('shortlisted', 'priority')) as shortlists
        from event_registrations r join events e on e.id = r.event_id
        where r.profile_id = ${u.id} order by e.start_date desc nulls last, e.created_at desc
      `,
      sql`
        with touch as (
          select scanned_profile_id as cid, 'visited' as k, created_at from scans where scanner_profile_id = ${u.id} and scanned_role = 'company'
          union all select company_id, 'visited', updated_at from saved_companies where student_id = ${u.id} and visited
          union all select scanner_profile_id, 'scanned_you', created_at from scans where scanned_profile_id = ${u.id} and scanner_role = 'company'
          union all select m.receiver_profile_id, 'messaged', m.created_at from messages m join profiles rp on rp.id = m.receiver_profile_id
            where m.sender_profile_id = ${u.id} and rp.role = 'company'
          union all select company_id, 'shortlisted', created_at from shortlists where student_id = ${u.id} and status in ('shortlisted', 'priority')
          union all select company_id, 'interview', created_at from interview_invites where student_id = ${u.id} and status in ('pending', 'accepted')
        )
        select t.cid as company_id,
          coalesce(nullif(c.company_name, ''), nullif(c.company, ''), nullif(p.organization, ''), p.full_name) as name, c.sector,
          bool_or(t.k = 'visited') as visited, bool_or(t.k = 'scanned_you') as scanned_you, bool_or(t.k = 'messaged') as messaged,
          bool_or(t.k = 'shortlisted') as shortlisted, bool_or(t.k = 'interview') as interview, max(t.created_at) as last_at
        from touch t join profiles p on p.id = t.cid left join companies c on c.id = t.cid
        group by t.cid, c.company_name, c.company, p.organization, p.full_name, c.sector
        order by last_at desc
      `,
    ]);
    return { events, connections };
  },

  /* Online courses. Certificates are verified with Coursera, never trusted from the browser. */
  async addCourseraCertificate(u, [link]) {
    if (u.role !== "student") throw forbidden();
    try {
      const code = certificateCode(s(link));
      if (!code) return { ok: false, error: "That doesn't look like a Coursera certificate link. It looks like coursera.org/verify/ABC123XYZ." };
      const sql = db();
      const taken = await sql`select * from student_courses where provider = 'coursera' and certificate_code = ${code}`;
      if (taken.length) {
        if (taken[0].student_id === u.id) return { ok: true, course: taken[0], newSkills: [] };
        return { ok: false, error: "This certificate is already on another GradLink account." };
      }
      const cert = await fetchCertificate(code);
      if (!cert) return { ok: false, error: "Coursera has no certificate at that link. Check it and try again." };
      if (nameHidden(cert.matchName)) {
        return { ok: false, error: "Coursera is hiding the learner's name on this certificate, so we can't confirm it is yours. Make sure your name shows on the certificate page, then try again." };
      }
      const [me] = await sql`select p.full_name, st.skills from profiles p left join students st on st.id = p.id where p.id = ${u.id}`;
      const myName = s(me?.full_name);
      if (!namesMatch(cert.matchName, myName)) {
        return { ok: false, error: `The name on this certificate (${cert.learnerName}) doesn't match your GradLink name (${myName}). Only your own certificates can be added.` };
      }
      // Only for a name the page left out; the certificate itself is already verified.
      const fallback = !cert.courseName && cert.courseId ? await courseById(cert.courseId).catch(() => null) : null;
      const [row] = await sql.transaction([
        sql`insert into student_courses (student_id, status, certificate_code, course_id, course_slug, course_name, partner_name, completed_at, skills)
            values (${u.id}, 'certificate', ${code}, ${cert.courseId}, ${cert.courseSlug ?? fallback?.slug ?? null},
                    ${cert.courseName ?? fallback?.name ?? "Retired Coursera course"}, ${cert.partnerName ?? fallback?.partnerName ?? null},
                    ${cert.completedAt}, ${cert.skills})
            returning *`,
        // A course the student was "taking" is now finished.
        sql`delete from student_courses where student_id = ${u.id} and status = 'in_progress'
              and ((course_id is not null and course_id = ${cert.courseId}) or (course_slug is not null and course_slug = ${cert.courseSlug}))`,
      ]);
      const have = new Set(((me?.skills as string[]) ?? []).map((x) => x.toLowerCase()));
      return { ok: true, course: row[0], newSkills: cert.skills.filter((k) => !have.has(k.toLowerCase())) };
    } catch (err) {
      if (err instanceof CourseraError) return { ok: false, error: err.message };
      if ((err as { code?: string }).code === "23505") return { ok: false, error: "This certificate is already on another GradLink account." };
      throw err;
    }
  },
  /** A course the student is taking now, checked to exist in Coursera's catalog. */
  async addCourseraCourse(u, [link]) {
    if (u.role !== "student") throw forbidden();
    try {
      const slug = courseSlug(s(link));
      if (!slug) return { ok: false, error: "Paste the course's page link. It looks like coursera.org/learn/course-name." };
      const course = await courseBySlug(slug);
      if (!course) return { ok: false, error: "Coursera has no course at that link." };
      const sql = db();
      const existing = await sql`select * from student_courses where student_id = ${u.id} and course_id = ${course.id}`;
      if (existing.length) return { ok: true, course: existing[0] };
      const [row] = await sql`
        insert into student_courses (student_id, status, course_id, course_slug, course_name, partner_name)
        values (${u.id}, 'in_progress', ${course.id}, ${course.slug}, ${course.name}, ${course.partnerName})
        returning *
      `;
      return { ok: true, course: row };
    } catch (err) {
      if (err instanceof CourseraError) return { ok: false, error: err.message };
      throw err;
    }
  },
  /** The student sees all of theirs; everyone else only what the student shows employers. */
  async listStudentCourses(u, [studentId]) {
    const id = s(studentId);
    if (id !== u.id && !(await sharesEventWith(u, id, "student"))) return [];
    return u.id === id
      ? db()`select * from student_courses where student_id = ${id} order by status, completed_at desc nulls last, created_at desc`
      : db()`
          select id, provider, status, certificate_code, course_slug, course_name, partner_name, completed_at, skills
          from student_courses where student_id = ${id} and visible_to_employers
          order by status, completed_at desc nulls last, created_at desc
        `;
  },
  async setStudentCourseVisible(u, [id, visible]) {
    const rows = await db()`update student_courses set visible_to_employers = ${Boolean(visible)} where id = ${s(id)} and student_id = ${u.id} returning id`;
    return rows.length > 0;
  },
  async deleteStudentCourse(u, [id]) {
    const rows = await db()`delete from student_courses where id = ${s(id)} and student_id = ${u.id} returning id`;
    return rows.length > 0;
  },

  /*
    Coding profiles. The student names a handle, proves it is theirs on the
    site itself, and only then is it shown to anyone else. Stats are always
    fetched here.
  */
  async startCodingProfile(u, [site, input]) {
    if (u.role !== "student") throw forbidden();
    const kind = codingSite(site);
    const label = CODING_SITE_LABEL[kind];
    const handle = kind === "leetcode" ? leetcodeHandle(s(input)) : codeforcesHandle(s(input));
    if (!handle) return { ok: false, error: `Enter your ${label} username or profile link.` };
    try {
      const sql = db();
      const [mine] = await sql`select * from student_scores where student_id = ${u.id} and kind = ${kind}`;
      if (mine?.verified_at) {
        if (s(mine.handle).toLowerCase() === handle.toLowerCase()) return { ok: true, score: mine };
        return { ok: false, error: `Remove your current ${label} profile first.` };
      }
      const profile = kind === "leetcode" ? await fetchLeetCode(handle) : await fetchCodeforces(handle);
      if (!profile) return { ok: false, error: `${label} has no user called ${handle}.` };
      const taken = await sql`select 1 from student_scores where kind = ${kind} and lower(handle) = ${profile.handle.toLowerCase()} and verified_at is not null`;
      if (taken.length) return { ok: false, error: `This ${label} profile is already on another GradLink account.` };
      const code = kind === "leetcode" ? `gradlink-${randomCode(6).toLowerCase()}` : null;
      const [row] = await sql`
        insert into student_scores (student_id, kind, handle, verify_code, verify_started_at)
        values (${u.id}, ${kind}, ${profile.handle}, ${code}, now())
        on conflict (student_id, kind)
        do update set handle = excluded.handle, verify_code = excluded.verify_code, verify_started_at = excluded.verify_started_at,
                      verified_at = null, stats = '{}', stats_at = null
        returning *
      `;
      return { ok: true, score: row };
    } catch (err) {
      if (err instanceof CodingError) return { ok: false, error: err.message };
      throw err;
    }
  },
  async verifyCodingProfile(u, [site]) {
    if (u.role !== "student") throw forbidden();
    const kind = codingSite(site);
    const label = CODING_SITE_LABEL[kind];
    const sql = db();
    const [row] = await sql`select * from student_scores where student_id = ${u.id} and kind = ${kind}`;
    if (!row) return { ok: false, error: `Add your ${label} username first.` };
    if (row.verified_at) return { ok: true, score: row };
    const handle = s(row.handle);
    try {
      let profile;
      if (kind === "leetcode") {
        profile = await fetchLeetCode(handle);
        if (!profile) return { ok: false, error: `${label} has no user called ${handle} any more.` };
        if (!profile.about.toLowerCase().includes(s(row.verify_code).toLowerCase())) {
          return { ok: false, error: `We couldn't find ${row.verify_code} in the Summary on your LeetCode profile yet. Save it there, wait a few seconds and try again.` };
        }
      } else {
        if (!(await codeforcesVerified(handle, new Date(row.verify_started_at as string)))) {
          return { ok: false, error: "We couldn't find a submission to problem 4A that failed to compile since you started. Submit one, wait until Codeforces shows its verdict, then try again." };
        }
        profile = await fetchCodeforces(handle);
        if (!profile) return { ok: false, error: `${label} has no user called ${handle} any more.` };
      }
      const [saved] = await sql`
        update student_scores set verified_at = now(), verify_code = null, stats = ${JSON.stringify(profile.stats)}::jsonb, stats_at = now()
        where id = ${row.id} and student_id = ${u.id} returning *
      `;
      return { ok: true, score: saved };
    } catch (err) {
      if (err instanceof CodingError) return { ok: false, error: err.message };
      if ((err as { code?: string }).code === "23505") return { ok: false, error: `This ${label} profile is already on another GradLink account.` };
      throw err;
    }
  },
  /** Re-read a verified profile's stats, at most every 10 minutes. */
  async refreshCodingProfile(u, [id]) {
    const sql = db();
    const [row] = await sql`select * from student_scores where id = ${s(id)} and student_id = ${u.id} and verified_at is not null`;
    if (!row) return { ok: false, error: "That profile isn't on your account." };
    if (row.stats_at && Date.now() - new Date(row.stats_at as string).getTime() < 10 * 60e3) return { ok: true, score: row };
    const kind = codingSite(row.kind);
    try {
      const profile = kind === "leetcode" ? await fetchLeetCode(s(row.handle)) : await fetchCodeforces(s(row.handle));
      if (!profile) return { ok: false, error: `${CODING_SITE_LABEL[kind]} has no user called ${row.handle} any more. Remove it and add your current username.` };
      const [saved] = await sql`
        update student_scores set stats = ${JSON.stringify(profile.stats)}::jsonb, stats_at = now()
        where id = ${row.id} returning *
      `;
      return { ok: true, score: saved };
    } catch (err) {
      if (err instanceof CodingError) return { ok: false, error: err.message };
      throw err;
    }
  },
  /** The student sees all of theirs, pending ones included; everyone else only verified profiles the student shows. */
  async listStudentScores(u, [studentId]) {
    const id = s(studentId);
    if (id !== u.id && !(await sharesEventWith(u, id, "student"))) return [];
    return u.id === id
      ? db()`select * from student_scores where student_id = ${id} order by kind`
      : db()`
          select id, kind, handle, verified_at, stats, stats_at
          from student_scores
          where student_id = ${id} and visible_to_employers and verified_at is not null
          order by kind
        `;
  },
  async setStudentScoreVisible(u, [id, visible]) {
    const rows = await db()`update student_scores set visible_to_employers = ${Boolean(visible)} where id = ${s(id)} and student_id = ${u.id} returning id`;
    return rows.length > 0;
  },
  async deleteStudentScore(u, [id]) {
    const rows = await db()`delete from student_scores where id = ${s(id)} and student_id = ${u.id} returning id`;
    return rows.length > 0;
  },

  /*
    Certificates. A Credly badge is read from Credly and must belong to the
    student (the name on it, or the email it was issued to). Anything else is
    the student's own report and is shown as self-reported with its link.
  */
  async addCredlyBadge(u, [link]) {
    if (u.role !== "student") throw forbidden();
    const id = credlyBadgeId(s(link));
    if (!id) return { ok: false, error: "That doesn't look like a Credly badge link. It looks like credly.com/badges/1a2b3c4d-..." };
    try {
      const sql = db();
      const [taken] = await sql`select * from student_certificates where provider = 'credly' and credential_id = ${id}`;
      if (taken) {
        if (taken.student_id === u.id) return { ok: true, certificate: taken };
        return { ok: false, error: "This badge is already on another GradLink account." };
      }
      if ((await certificateCount(u.id)) >= MAX_CERTIFICATES) return { ok: false, error: `You can add up to ${MAX_CERTIFICATES} certificates.` };
      const badge = await fetchCredlyBadge(id);
      if (!badge) return { ok: false, error: "Credly has no badge at that link. Check it and try again." };
      const [me] = await sql`select full_name, email from profiles where id = ${u.id}`;
      const myName = s(me?.full_name);
      const mine = (badge.earnerName && namesMatch(badge.earnerName, myName)) || (await emailMatches(badge.emailHash, s(me?.email)));
      if (!mine) {
        return {
          ok: false,
          error: badge.earnerName
            ? `The name on this badge (${badge.earnerName}) doesn't match your GradLink name (${myName}). Only your own badges can be added.`
            : "Credly isn't showing who earned this badge, and it wasn't issued to your GradLink email. Make the badge public on Credly, then try again.",
        };
      }
      const [row] = await sql`
        insert into student_certificates (student_id, provider, credential_id, name, issuer, issued_on, expires_on, credential_url, verified_at)
        values (${u.id}, 'credly', ${id}, ${badge.name.slice(0, 200)}, ${badge.issuer?.slice(0, 200) ?? null}, ${badge.issuedOn}, ${badge.expiresOn},
                ${`https://www.credly.com/badges/${id}`}, now())
        returning *
      `;
      return { ok: true, certificate: row };
    } catch (err) {
      if (err instanceof CredlyError) return { ok: false, error: err.message };
      if ((err as { code?: string }).code === "23505") return { ok: false, error: "This badge is already on another GradLink account." };
      throw err;
    }
  },
  /** A certificate the student reports themselves; employers see it marked as self-reported. */
  async addCertificate(u, [input]) {
    if (u.role !== "student") throw forbidden();
    const i = (input ?? {}) as Row;
    const name = s(i.name).trim().slice(0, 200);
    const issuer = s(i.issuer).trim().slice(0, 200);
    if (!name) return { ok: false, error: "Enter the certificate's name." };
    if (!issuer) return { ok: false, error: "Enter who issued it." };
    const link = s(i.credentialUrl).trim();
    if (credlyBadgeId(link)) return { ok: false, error: "That's a Credly badge. Paste it in the Credly box above so it shows as verified." };
    if (/coursera\.org\//i.test(link)) return { ok: false, error: "That's a Coursera certificate. Add it under Coursera courses so it shows as verified." };
    let credentialUrl: string | null = null;
    try {
      credentialUrl = urlOrNull(link);
    } catch {
      return { ok: false, error: "The credential link isn't a valid web address. Use a link that starts with https://" };
    }
    const today = new Date().toISOString().slice(0, 10);
    const issuedOn = /^\d{4}-\d{2}-\d{2}$/.test(s(i.issuedOn)) ? s(i.issuedOn) : null;
    if (issuedOn && (issuedOn > today || issuedOn < "1990-01-01")) return { ok: false, error: "Enter the date you earned it." };
    const expiresOn = /^\d{4}-\d{2}-\d{2}$/.test(s(i.expiresOn)) ? s(i.expiresOn) : null;
    if (expiresOn && issuedOn && expiresOn < issuedOn) return { ok: false, error: "The expiry date must be after the date you earned it." };
    if ((await certificateCount(u.id)) >= MAX_CERTIFICATES) return { ok: false, error: `You can add up to ${MAX_CERTIFICATES} certificates.` };
    const [row] = await db()`
      insert into student_certificates (student_id, credential_id, name, issuer, issued_on, expires_on, credential_url)
      values (${u.id}, ${s(i.credentialId).trim().slice(0, 120) || null}, ${name}, ${issuer}, ${issuedOn}, ${expiresOn}, ${credentialUrl})
      returning *
    `;
    return { ok: true, certificate: row };
  },
  /** The student sees all of theirs; everyone else only the ones the student shows. */
  async listStudentCertificates(u, [studentId]) {
    const id = s(studentId);
    if (id !== u.id && !(await sharesEventWith(u, id, "student"))) return [];
    return u.id === id
      ? db()`select * from student_certificates where student_id = ${id} order by verified_at is null, issued_on desc nulls last, created_at desc`
      : db()`
          select id, provider, credential_id, name, issuer, issued_on, expires_on, credential_url, verified_at
          from student_certificates where student_id = ${id} and visible_to_employers
          order by verified_at is null, issued_on desc nulls last, created_at desc
        `;
  },
  async setStudentCertificateVisible(u, [id, visible]) {
    const rows = await db()`update student_certificates set visible_to_employers = ${Boolean(visible)} where id = ${s(id)} and student_id = ${u.id} returning id`;
    return rows.length > 0;
  },
  async deleteStudentCertificate(u, [id]) {
    const rows = await db()`delete from student_certificates where id = ${s(id)} and student_id = ${u.id} returning id`;
    return rows.length > 0;
  },

  /* Billing — read-only, owner only. Only the Stripe webhook writes it. */
  async getSubscription(u, [profileId]) {
    isMe(u, profileId);
    const rows = await db()`
      select plan, status, stripe_customer_id, stripe_subscription_id, current_period_end, updated_at
      from subscriptions where profile_id = ${u.id}
    `;
    return rows[0] ?? null;
  },
};
