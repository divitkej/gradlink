import { db, type Row } from "./sql";
import { HttpError } from "./http";
import type { AuthUser } from "./session";
import { evaluateResume } from "../resume";
import { engagementScore, shortName, type EngagementCounts } from "../engagement";
import {
  CourseraError, certificateCode, courseSlug, fetchCertificate, courseById, courseBySlug, namesMatch, nameHidden,
} from "./coursera";

/* ============================================================
   /api/rpc — every data operation the browser used to run directly
   against Firestore, now run in the Worker against Neon.

   Each op keeps the name and argument list of the lib/db.ts /
   lib/events.ts function that calls it, so no component changed.

   Authorization started as a port of firestore.rules and is now
   stricter wherever a student could be harmed:
     * every op requires a signed-in user;
     * profile and event reads are open to any signed-in user, EXCEPT
       messages (participants only), checklist progress, event
       membership lists and subscriptions (owner only);
     * a student's scores, engagement and scans are for the student and
       their college (the event's organiser) only, never for employers.
       Colleges want students hired, so employers see strengths
       (profile, skills, projects, résumé), not assessments;
     * shortlist decisions are seen by the company that made them and
       the organiser. A student sees only positive ones, without notes;
     * writes are owner-only, checked against the session's profile
       id — never against an id the browser claims.
   ============================================================ */

type Args = unknown[];
type Op = (user: AuthUser, args: Args) => Promise<unknown>;

const forbidden = () => new HttpError(403, "You don't have permission to do that.");

function isMe(user: AuthUser, id: unknown) {
  if (id !== user.id) throw forbidden();
}

const s = (v: unknown) => (typeof v === "string" ? v : "");
const textOrNull = (v: unknown, max = 5000) => (typeof v === "string" ? v.slice(0, max) : null);
const intOrNull = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null);
const strArray = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.slice(0, 200)) : []);
/** A timestamp from the browser as ISO, or null when missing or unparseable. */
const isoOrNull = (v: unknown) => {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
/** Up to 10 {title, url, description} projects, with empty titles dropped. */
const projectList = (v: unknown) =>
  (Array.isArray(v) ? v : [])
    .map((p) => (p ?? {}) as Row)
    .map((p) => ({ title: s(p.title).trim().slice(0, 120), url: s(p.url).trim().slice(0, 500), description: s(p.description).trim().slice(0, 1000) }))
    .filter((p) => p.title)
    .slice(0, 10);

/* ---------------- column sets ---------------- */

const STUDENT_COLS = `id, profile_id, created_at, full_name, email, university, degree, graduation_year, skills,
  resume_url, portfolio_url, linkedin_url, github_url, bio, resume_score, ai_feedback, career_goal, target_roles, projects`;
const COMPANY_COLS = `id, profile_id, created_at, full_name, email, company, company_name, sector, industry, website,
  description, logo_url, hiring_roles, booth_number, skills_wanted, brochure_url`;

/** Profile fields a user may edit on their own role row, and how each is coerced. */
const STUDENT_FIELDS: Record<string, (v: unknown) => unknown> = {
  full_name: (v) => textOrNull(v, 200) ?? "",
  university: textOrNull, degree: textOrNull, graduation_year: intOrNull, skills: strArray,
  resume_url: textOrNull, portfolio_url: textOrNull, linkedin_url: textOrNull, github_url: textOrNull,
  bio: textOrNull, resume_score: intOrNull,
  ai_feedback: (v) => (v == null ? null : JSON.stringify(v)),
  career_goal: (v) => textOrNull(v, 500), target_roles: (v) => strArray(v).slice(0, 10),
  projects: (v) => JSON.stringify(projectList(v)),
};
const COMPANY_FIELDS: Record<string, (v: unknown) => unknown> = {
  full_name: (v) => textOrNull(v, 200) ?? "",
  company: textOrNull, company_name: textOrNull, sector: textOrNull, industry: textOrNull, website: textOrNull,
  description: textOrNull, logo_url: textOrNull, hiring_roles: strArray, booth_number: textOrNull,
  skills_wanted: strArray, brochure_url: textOrNull,
};

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

/* ---------------- join codes ---------------- */

/** Typed by hand off a slide or poster, so 0/O and 1/I/L are left out. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
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

/** The college running the event: its creator. */
async function isEventOwner(u: AuthUser, eventId: string) {
  if (u.role !== "event_manager" || !eventId) return false;
  const rows = await db()`select 1 from events where id = ${eventId} and created_by = ${u.id}`;
  return rows.length > 0;
}

/**
 * Stored assessments on a student row are for the student and colleges only.
 * Everyone else gets the profile without them.
 */
function studentView(u: AuthUser, row: Row): Row {
  if (u.id === row.id || u.role === "event_manager") return row;
  return { ...row, resume_score: null, ai_feedback: null };
}

async function isRegistered(eventId: string, profileId: string) {
  const rows = await db()`select 1 from event_registrations where event_id = ${eventId} and profile_id = ${profileId}`;
  return rows.length > 0;
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
  async getStudentByProfile(u, [profileId]) {
    const rows = await db().query(`select ${STUDENT_COLS} from students where id = $1`, [s(profileId)]);
    return rows[0] ? studentView(u, rows[0]) : null;
  },
  async updateStudentProfile(u, [profileId, fields]) {
    isMe(u, profileId);
    return upsertRoleRow("students", STUDENT_FIELDS, u.id, fields);
  },
  async getRegisteredStudents(u, [eventId]) {
    const rows = await db().query(
      `select ${STUDENT_COLS.replace(/(\w+)/g, "s.$1")} from event_registrations r join students s on s.id = r.profile_id
       where r.event_id = $1 and r.role = 'student'`,
      [s(eventId)],
    );
    return rows.map((r) => studentView(u, r));
  },

  /* Companies */
  async getCompanyByProfile(_u, [profileId]) {
    const rows = await db().query(`select ${COMPANY_COLS} from companies where id = $1`, [s(profileId)]);
    return rows[0] ?? null;
  },
  async updateCompanyProfile(u, [profileId, fields]) {
    isMe(u, profileId);
    return upsertRoleRow("companies", COMPANY_FIELDS, u.id, fields);
  },
  async getRegisteredCompanies(_u, [eventId]) {
    return db().query(
      `select ${COMPANY_COLS.replace(/(\w+)/g, "c.$1")} from event_registrations r join companies c on c.id = r.profile_id
       where r.event_id = $1 and r.role = 'company'`,
      [s(eventId)],
    );
  },

  /* Analytics */
  /** The student themselves, or the college running the event. */
  async getAnalytics(u, [studentId, eventId]) {
    if (!s(studentId) || !s(eventId)) return null;
    if (u.id !== s(studentId) && !(await isEventOwner(u, s(eventId)))) throw forbidden();
    const rows = await studentActivity(s(eventId), s(studentId));
    return rows[0] ? analyticsRow(s(eventId), rows[0]) : null;
  },
  /** The college running the event only. */
  async listAnalytics(u, [eventId]) {
    if (!s(eventId)) return [];
    if (!(await isEventOwner(u, s(eventId)))) throw forbidden();
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
    if (u.role !== "student" || !ev || !(await isRegistered(ev, u.id))) throw forbidden();
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

  /* Scans — append-only, and only for a scan you performed. */
  async recordScan(u, [input]) {
    const i = (input ?? {}) as Row;
    isMe(u, i.scannerProfileId);
    await db()`
      insert into scans (event_id, scanner_profile_id, scanned_profile_id, scanner_role, scanned_role, scan_context, notes)
      values (${s(i.eventId)}, ${u.id}, ${s(i.scannedProfileId)}, ${textOrNull(i.scannerRole, 50)},
              ${textOrNull(i.scannedRole, 50)}, ${textOrNull(i.scanContext, 50) ?? "qr"}, ${textOrNull(i.notes)})
    `;
    return true;
  },
  /** Scans you made or that were made of you. The event's college sees all of them. */
  async getScans(u, [filter]) {
    const f = (filter ?? {}) as Row;
    const involved = s(f.scannerProfileId) === u.id || s(f.scannedProfileId) === u.id;
    if (!involved && !(await isEventOwner(u, s(f.eventId)))) throw forbidden();
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
    if (!SHORTLIST_STATUSES.includes(s(i.status))) throw new HttpError(400, "Unknown shortlist status.");
    // created_at is kept across status changes, as before.
    await db()`
      insert into shortlists (event_id, company_id, student_id, status, notes)
      values (${s(i.eventId)}, ${u.id}, ${s(i.studentId)}, ${s(i.status)}, ${textOrNull(i.notes)})
      on conflict (event_id, company_id, student_id) do update set status = excluded.status, notes = excluded.notes
    `;
    return true;
  },
  async getShortlist(u, [companyId, studentId, eventId]) {
    if (u.id !== s(companyId) && !(await isEventOwner(u, s(eventId)))) throw forbidden();
    const rows = await db()`
      select * from shortlists where company_id = ${s(companyId)} and student_id = ${s(studentId)} and event_id = ${s(eventId)}
    `;
    return rows[0] ?? null;
  },
  async listShortlistsForCompany(u, [companyId, eventId]) {
    if (u.id !== s(companyId) && !(await isEventOwner(u, s(eventId)))) throw forbidden();
    return db()`select * from shortlists where company_id = ${s(companyId)} and event_id = ${s(eventId)} order by created_at desc`;
  },
  /**
   * For the student: only the companies that shortlisted them, never "maybe"
   * or "not a fit", and never the company's private notes. The college sees all.
   */
  async listShortlistsForStudent(u, [studentId, eventId]) {
    if (await isEventOwner(u, s(eventId))) {
      return db()`select * from shortlists where student_id = ${s(studentId)} and event_id = ${s(eventId)}`;
    }
    if (u.id !== s(studentId)) throw forbidden();
    return db()`
      select id, created_at, event_id, company_id, student_id, status, null as notes from shortlists
      where student_id = ${u.id} and event_id = ${s(eventId)} and status in ('shortlisted', 'priority')
    `;
  },
  /** Every company's decisions at an event: the college running it only. */
  async listShortlists(u, [eventId]) {
    if (!(await isEventOwner(u, s(eventId)))) throw forbidden();
    return db()`select * from shortlists where event_id = ${s(eventId)}`;
  },

  /* Messages — only the two participants can read a conversation. */
  async sendMessage(u, [input]) {
    const i = (input ?? {}) as Row;
    isMe(u, i.senderProfileId);
    const message = s(i.message).slice(0, 5000);
    if (!message.trim() || !s(i.receiverProfileId)) throw new HttpError(400, "Write a message first.");
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
    const ids = Array.from(new Set(strArray(studentIds)));
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
    const list = Array.from(new Set(strArray(ids))).slice(0, 1000);
    if (!list.length) return {};
    const rows = await db()`select id, full_name, role, organization from profiles where id = any(${list}::text[])`;
    return Object.fromEntries(
      rows.map((r) => [r.id as string, { name: (r.full_name as string) ?? "", role: (r.role as string) ?? "", org: (r.organization as string) ?? "" }]),
    );
  },

  /* Events */
  async getEvent(_u, [eventId]) {
    const rows = await db()`select * from events where id = ${s(eventId)}`;
    return rows[0] ?? null;
  },
  async listEventsForManager(_u, [managerProfileId]) {
    return db()`select * from events where created_by = ${s(managerProfileId)} order by created_at desc`;
  },
  /** Your own memberships only, as the registrations collection-group rule allowed. */
  async listEventsForProfile(u, [profileId]) {
    isMe(u, profileId);
    return db()`
      select e.* from event_registrations r join events e on e.id = r.event_id
      where r.profile_id = ${u.id} order by e.start_date desc nulls last
    `;
  },
  async getEventByCode(_u, [code]) {
    const c = s(code).trim().toUpperCase();
    if (!c) return null;
    const rows = await db()`select * from events where join_code = ${c}`;
    return rows[0] ?? null;
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
      const joinCode = randomCode(attempt < 4 ? 6 : 8);
      try {
        const [rows] = await sql.transaction([
          sql`insert into events (id, title, description, location, start_date, end_date, status, created_by, host_org, join_code)
              values (${id}, ${title}, ${s(i.description).trim() || null}, ${s(i.location).trim() || null},
                      ${s(i.startDate) || null}, ${s(i.endDate) || null}, ${status}, ${u.id},
                      ${textOrNull(i.hostOrg, 300)}, ${joinCode})
              returning *`,
          // The organiser is registered into their own event so it appears in
          // their event list the same way a joined event does.
          sql`insert into event_registrations (event_id, profile_id, role, checked_in)
              values (${id}, ${u.id}, 'event_manager', true)`,
          sql`select seed_event_checklist(${id})`,
        ]);
        return { ok: true, event: rows[0] };
      } catch (err) {
        if ((err as { code?: string }).code === "23505") continue; // join_code clash — retry
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
    };
    const entries = Object.entries(f).filter(([k, v]) => k in allowed && v !== undefined);
    if (!entries.length) return true;
    const sets = entries.map(([k], idx) => `${k} = $${idx + 3}`);
    const rows = await db().query(
      `update events set ${sets.join(", ")} where id = $1 and created_by = $2 returning id`,
      [s(eventId), u.id, ...entries.map(([k, v]) => allowed[k](v))],
    );
    if (!rows.length) throw forbidden();
    return true;
  },
  /** Join by short code. Idempotent — re-joining never resets check-in or analytics. */
  async joinEventByCode(u, [code, profileId]) {
    isMe(u, profileId);
    const c = s(code).trim().toUpperCase();
    if (!c) return { ok: false, error: "Enter the event code your college gave you." };
    const sql = db();
    const rows = await sql`select * from events where join_code = ${c}`;
    const event = rows[0];
    if (!event) return { ok: false, error: "No event matches that code. Check it and try again." };
    if (event.status === "ended") return { ok: false, error: `${event.title} has already finished.` };

    // The registration role is the account's real role, not whatever the browser sends.
    const queries = [
      sql`insert into event_registrations (event_id, profile_id, role) values (${event.id}, ${u.id}, ${u.role})
          on conflict (event_id, profile_id) do nothing`,
    ];
    if (u.role === "student") {
      queries.push(sql`insert into student_event_analytics (event_id, student_id) values (${event.id}, ${u.id})
                       on conflict (event_id, student_id) do nothing`);
    }
    await sql.transaction(queries);
    return { ok: true, event };
  },

  /* Sessions: workshops, mock interviews, company sessions, recruiter slots. */
  async listSessions(u, [eventId]) {
    return db()`
      select es.*, p.full_name as host_name, p.organization as host_org, p.role as host_role,
        (select count(*)::int from session_bookings b where b.session_id = es.id and b.status in ('booked', 'attended')) as booked_count,
        (select count(*)::int from session_bookings b where b.session_id = es.id and b.status = 'waitlisted') as waitlist_count,
        mine.status as my_status,
        case when mine.status = 'waitlisted' then 1 + (
          select count(*)::int from session_bookings w where w.session_id = es.id and w.status = 'waitlisted'
            and (w.created_at, w.id) < (mine.created_at, mine.id)
        ) end as my_waitlist_position
      from event_sessions es
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
    const company = u.role === "company" && COMPANY_SESSION_KINDS.includes(kind) && (await isRegistered(eventId, u.id));
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
    if (!(await isRegistered(found[0].event_id as string, u.id))) return { ok: false, error: "Join this event first to book its sessions." };
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
    if (!(await isRegistered(ev, u.id))) return { ok: false, error: "Join this event first." };
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
      const fallback = !cert.courseName && cert.courseId ? await courseById(cert.courseId) : null;
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
