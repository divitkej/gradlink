import { db, type Row } from "./sql";
import { HttpError } from "./http";
import type { AuthUser } from "./session";
import { CHECKLIST_TEMPLATE } from "./checklist-template";
import { evaluateResume } from "../resume";
import type { StudentRow } from "../db";

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
     * shortlists and their private notes belong to the company that
       made them; the student sees their status, never the notes;
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

/* ---------------- column sets ---------------- */

const STUDENT_COLS = `id, profile_id, created_at, full_name, email, university, degree, graduation_year, skills,
  resume_url, portfolio_url, linkedin_url, github_url, bio, resume_score, ai_feedback`;
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

/* ---------------- analytics ---------------- */

/**
 * Per-student event stats, computed from what actually happened (scans,
 * shortlists, messages) rather than stored counters that nothing updated.
 *
 * Engagement is 0 to 100: 15 per company that scanned the student, 10 per
 * company the student scanned, 20 per shortlist and 10 per message sent.
 */
async function computeAnalytics(eventId: string, studentId?: string) {
  const rows = await db().query(
    `select ${STUDENT_COLS.replace(/(\w+)/g, "s.$1")}, r.profile_id as reg_profile_id, a.id as analytics_id,
       (select count(*) from scans x where x.event_id = $1 and x.scanned_profile_id = r.profile_id)::int as profile_views,
       (select count(distinct x.scanner_profile_id) from scans x where x.event_id = $1 and x.scanned_profile_id = r.profile_id and x.scanner_role = 'company')::int as company_scans,
       (select count(distinct x.scanned_profile_id) from scans x where x.event_id = $1 and x.scanner_profile_id = r.profile_id and x.scanned_role = 'company')::int as companies_scanned,
       (select count(*) from shortlists l where l.event_id = $1 and l.student_id = r.profile_id and l.status in ('shortlisted', 'priority'))::int as shortlists,
       (select count(*) from messages m where m.event_id = $1 and m.receiver_profile_id = r.profile_id)::int as messages_received,
       (select count(*) from messages m where m.event_id = $1 and m.sender_profile_id = r.profile_id)::int as messages_sent
     from event_registrations r
     left join students s on s.id = r.profile_id
     left join student_event_analytics a on a.event_id = r.event_id and a.student_id = r.profile_id
     where r.event_id = $1 and r.role = 'student' ${studentId ? "and r.profile_id = $2" : ""}`,
    studentId ? [eventId, studentId] : [eventId],
  );
  return rows.map((r) => {
    const n = (k: string) => Number(r[k]) || 0;
    const engagement = n("company_scans") * 15 + n("companies_scanned") * 10 + n("shortlists") * 20 + n("messages_sent") * 10;
    return {
      id: (r.analytics_id as string) ?? `${eventId}:${r.reg_profile_id}`,
      event_id: eventId,
      student_id: r.reg_profile_id as string,
      profile_views: n("profile_views"),
      company_scans: n("company_scans"),
      shortlists: n("shortlists"),
      messages_received: n("messages_received"),
      resume_score: r.id ? evaluateResume(r as unknown as StudentRow).score : 0,
      engagement_score: Math.min(100, engagement),
    };
  });
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

/* ---------------- ops ---------------- */

export const ops: Record<string, Op> = {
  /* Students */
  /** Companies and colleges see the full profile; a fellow student sees no contact details. */
  async getStudentByProfile(u, [profileId]) {
    const id = s(profileId);
    // Someone else's profile only when you share an event with them.
    if (id !== u.id && !(await sharesEventWith(u, id, "student"))) return null;
    const cols = u.role === "student" && id !== u.id ? PEER_STUDENT_COLS : STUDENT_COLS;
    const rows = await db().query(`select ${cols} from students where id = $1`, [id]);
    return rows[0] ?? null;
  },
  async updateStudentProfile(u, [profileId, fields]) {
    isMe(u, profileId);
    if (u.role !== "student") throw forbidden();
    return upsertRoleRow("students", STUDENT_FIELDS, u.id, fields);
  },
  async getRegisteredStudents(u, [eventId]) {
    await requireMember(u, eventId);
    const cols = u.role === "student" ? PEER_STUDENT_COLS : STUDENT_COLS;
    return db().query(
      `select ${cols.replace(/(\w+)/g, "s.$1")} from event_registrations r join students s on s.id = r.profile_id
       where r.event_id = $1 and r.role = 'student'`,
      [s(eventId)],
    );
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
  /** A student's own stats, or any attendee's for companies and colleges at the event. */
  async getAnalytics(u, [studentId, eventId]) {
    if (studentId !== u.id) {
      if (u.role === "student") throw forbidden();
      await requireMember(u, eventId);
    }
    const rows = await computeAnalytics(s(eventId), s(studentId));
    return rows[0] ?? null;
  },
  async listAnalytics(u, [eventId]) {
    await requireStaff(u, eventId);
    return computeAnalytics(s(eventId));
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
    return studentId === u.id && companyId !== u.id ? withoutNotes(rows)[0] : rows[0];
  },
  async listShortlistsForCompany(u, [companyId, eventId]) {
    if (companyId !== u.id) await requireStaff(u, eventId);
    return db()`select * from shortlists where company_id = ${s(companyId)} and event_id = ${s(eventId)} order by created_at desc`;
  },
  async listShortlistsForStudent(u, [studentId, eventId]) {
    if (studentId !== u.id) await requireStaff(u, eventId);
    const rows = await db()`select * from shortlists where student_id = ${s(studentId)} and event_id = ${s(eventId)}`;
    return studentId === u.id ? withoutNotes(rows) : rows;
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
    const list = Array.from(new Set(strArray(ids))).slice(0, 1000);
    if (!list.length) return {};
    const rows = await db()`select id, full_name, role, organization from profiles where id = any(${list}::text[])`;
    return Object.fromEntries(
      rows.map((r) => [r.id as string, { name: (r.full_name as string) ?? "", role: (r.role as string) ?? "", org: (r.organization as string) ?? "" }]),
    );
  },

  /* Events */
  /** Registered people and the owner only, since the row carries the join code. */
  async getEvent(u, [eventId]) {
    const a = await eventAccess(u, eventId);
    if (!a.owner && !a.member) return null;
    const rows = await db()`select * from events where id = ${s(eventId)}`;
    return rows[0] ?? null;
  },
  async listEventsForManager(u, [managerProfileId]) {
    isMe(u, managerProfileId);
    return db()`select * from events where created_by = ${u.id} order by created_at desc`;
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
        ]);
        // A failure here must not report the event as failed: the checklist is
        // also added the first time anyone opens it.
        await addDefaultChecklist(id).catch((err) => console.error("[rpc] default checklist", err));
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
    if (f.title !== undefined && !s(f.title).trim()) throw new HttpError(400, "Give your event a name.");
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
    await sql`insert into event_registrations (event_id, profile_id, role) values (${event.id}, ${u.id}, ${u.role})
              on conflict (event_id, profile_id) do nothing`;
    return { ok: true, event };
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
