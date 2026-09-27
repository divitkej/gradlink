import { db, type Row } from "./sql";
import { HttpError } from "./http";
import type { AuthUser } from "./session";
import { seedChecklistQuery } from "./checklist-defaults";
import { evaluateResume } from "../resume";
import type { StudentRow } from "../db";

/* ============================================================
   /api/rpc — every data operation the browser used to run directly
   against Firestore, now run in the Worker against Neon.

   Each op keeps the name and argument list of the lib/db.ts /
   lib/events.ts function that calls it, so no component changed.

   Authorization:
     * every op requires a signed-in user;
     * anything about an event (its people, scans, shortlists,
       analytics, messages) needs the caller to belong to that event,
       as its organiser or through a registration. Organiser-only
       views (all analytics, all shortlists, every scan) need the
       event's owner;
     * a profile can be read by its owner, or by someone who shares
       an event with it in a role that should see it;
     * join codes are only returned to the event's owner;
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

/* ---------------- event access ---------------- */

type Access = "owner" | "student" | "company" | "event_manager" | null;

/** The caller's standing in an event: its owner, their registration role, or null. */
async function eventAccess(u: AuthUser, eventId: string): Promise<Access> {
  if (!eventId) return null;
  const rows = await db()`
    select e.created_by, r.role from events e
    left join event_registrations r on r.event_id = e.id and r.profile_id = ${u.id}
    where e.id = ${eventId}
  `;
  const r = rows[0];
  if (!r) return null;
  if (r.created_by === u.id) return "owner";
  return (r.role as Access) ?? null;
}

async function requireAccess(u: AuthUser, eventId: unknown, allowed?: Access[]): Promise<Access> {
  const a = await eventAccess(u, s(eventId));
  if (!a || (allowed && !allowed.includes(a))) throw forbidden();
  return a;
}

/** The role someone is registered under in an event, or null if they aren't in it. */
async function registeredRole(eventId: string, profileId: string): Promise<string | null> {
  const rows = await db()`select role from event_registrations where event_id = ${eventId} and profile_id = ${profileId}`;
  return (rows[0]?.role as string) ?? null;
}

/** Join codes are the key to an event, so only its owner ever receives them. */
function forViewer(u: AuthUser, event: Row | undefined): Row | null {
  if (!event) return null;
  if (event.created_by === u.id) return event;
  const rest = { ...event };
  delete rest.join_code;
  return rest;
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

/* ---------------- column sets ---------------- */

const STUDENT_COLS = `id, profile_id, created_at, full_name, email, university, degree, graduation_year, skills,
  resume_url, portfolio_url, linkedin_url, github_url, bio, resume_score, ai_feedback`;
const COMPANY_COLS = `id, profile_id, created_at, full_name, email, company, company_name, sector, industry, website,
  description, logo_url, hiring_roles, booth_number, skills_wanted, brochure_url`;

/** Profile fields a user may edit on their own role row, and how each is coerced. */
const STUDENT_FIELDS: Record<string, (v: unknown) => unknown> = {
  full_name: (v) => textOrNull(v, 200) ?? "",
  university: textOrNull, degree: textOrNull, graduation_year: intOrNull, skills: strArray,
  resume_url: textOrNull, portfolio_url: textOrNull, linkedin_url: textOrNull, github_url: textOrNull,
  bio: textOrNull, resume_score: intOrNull,
  ai_feedback: (v) => (v == null ? null : JSON.stringify(v)),
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

/* ---------------- ops ---------------- */

export const ops: Record<string, Op> = {
  /* Students */
  /** Yourself, or a student in an event where you are an employer or the organiser. */
  async getStudentByProfile(u, [profileId]) {
    const id = s(profileId);
    if (id !== u.id) {
      const ok = await db()`
        select 1 from event_registrations t join events e on e.id = t.event_id
        left join event_registrations me on me.event_id = t.event_id and me.profile_id = ${u.id}
        where t.profile_id = ${id} and t.role = 'student' and (e.created_by = ${u.id} or me.role = 'company')
        limit 1
      `;
      if (!ok.length) return null;
    }
    const rows = await db().query(`select ${STUDENT_COLS} from students where id = $1`, [id]);
    return rows[0] ?? null;
  },
  async updateStudentProfile(u, [profileId, fields]) {
    isMe(u, profileId);
    return upsertRoleRow("students", STUDENT_FIELDS, u.id, fields);
  },
  /** Employers and the organiser see the students; students don't see each other. */
  async getRegisteredStudents(u, [eventId]) {
    await requireAccess(u, eventId, ["owner", "company"]);
    return db().query(
      `select ${STUDENT_COLS.replace(/(\w+)/g, "s.$1")} from event_registrations r join students s on s.id = r.profile_id
       where r.event_id = $1 and r.role = 'student'`,
      [s(eventId)],
    );
  },

  /* Companies */
  /** Yourself, or an employer registered in an event you belong to. */
  async getCompanyByProfile(u, [profileId]) {
    const id = s(profileId);
    if (id !== u.id) {
      const ok = await db()`
        select 1 from event_registrations t join events e on e.id = t.event_id
        left join event_registrations me on me.event_id = t.event_id and me.profile_id = ${u.id}
        where t.profile_id = ${id} and t.role = 'company' and (e.created_by = ${u.id} or me.profile_id is not null)
        limit 1
      `;
      if (!ok.length) return null;
    }
    const rows = await db().query(`select ${COMPANY_COLS} from companies where id = $1`, [id]);
    return rows[0] ?? null;
  },
  async updateCompanyProfile(u, [profileId, fields]) {
    isMe(u, profileId);
    return upsertRoleRow("companies", COMPANY_FIELDS, u.id, fields);
  },
  async getRegisteredCompanies(u, [eventId]) {
    await requireAccess(u, eventId);
    return db().query(
      `select ${COMPANY_COLS.replace(/(\w+)/g, "c.$1")} from event_registrations r join companies c on c.id = r.profile_id
       where r.event_id = $1 and r.role = 'company'`,
      [s(eventId)],
    );
  },

  /* Analytics */
  /** The student themself, an employer at the event, or its organiser. */
  async getAnalytics(u, [studentId, eventId]) {
    const a = await requireAccess(u, eventId);
    if (s(studentId) !== u.id && a !== "owner" && a !== "company") throw forbidden();
    const rows = await computeAnalytics(s(eventId), s(studentId));
    return rows[0] ?? null;
  },
  async listAnalytics(u, [eventId]) {
    await requireAccess(u, eventId, ["owner"]);
    return computeAnalytics(s(eventId));
  },
  /** Headcounts anyone in the event may see, without the people behind them. */
  async getEventCounts(u, [eventId]) {
    await requireAccess(u, eventId);
    const rows = await db()`
      select count(*) filter (where role = 'student')::int as students, count(*) filter (where role = 'company')::int as companies
      from event_registrations where event_id = ${s(eventId)}
    `;
    return rows[0] ?? { students: 0, companies: 0 };
  },

  /*
   * Scans — append-only, only for a scan you performed, and only between two
   * people in the same event. Roles are read from the registrations, not the
   * request, so analytics can trust them.
   */
  async recordScan(u, [input]) {
    const i = (input ?? {}) as Row;
    isMe(u, i.scannerProfileId);
    const eventId = s(i.eventId);
    const scannerRole = (await requireAccess(u, eventId)) === "owner" ? "event_manager" : u.role;
    const scannedRole = await registeredRole(eventId, s(i.scannedProfileId));
    if (!scannedRole) throw forbidden();
    await db()`
      insert into scans (event_id, scanner_profile_id, scanned_profile_id, scanner_role, scanned_role, scan_context, notes)
      values (${eventId}, ${u.id}, ${s(i.scannedProfileId)}, ${scannerRole},
              ${scannedRole}, ${textOrNull(i.scanContext, 50) ?? "qr"}, ${textOrNull(i.notes)})
    `;
    return true;
  },
  /** The organiser sees every scan; everyone else only scans they made or received. */
  async getScans(u, [filter]) {
    const f = (filter ?? {}) as Row;
    const a = await requireAccess(u, f.eventId);
    if (a !== "owner" && f.scannerProfileId !== u.id && f.scannedProfileId !== u.id) throw forbidden();
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
    await requireAccess(u, i.eventId, ["company"]);
    if ((await registeredRole(s(i.eventId), s(i.studentId))) !== "student") throw forbidden();
    // created_at is kept across status changes, as before.
    await db()`
      insert into shortlists (event_id, company_id, student_id, status, notes)
      values (${s(i.eventId)}, ${u.id}, ${s(i.studentId)}, ${s(i.status)}, ${textOrNull(i.notes)})
      on conflict (event_id, company_id, student_id) do update set status = excluded.status, notes = excluded.notes
    `;
    return true;
  },
  async getShortlist(u, [companyId, studentId, eventId]) {
    const a = await requireAccess(u, eventId);
    if (a !== "owner" && companyId !== u.id) throw forbidden();
    const rows = await db()`
      select * from shortlists where company_id = ${s(companyId)} and student_id = ${s(studentId)} and event_id = ${s(eventId)}
    `;
    return rows[0] ?? null;
  },
  async listShortlistsForCompany(u, [companyId, eventId]) {
    const a = await requireAccess(u, eventId);
    if (a !== "owner" && companyId !== u.id) throw forbidden();
    return db()`select * from shortlists where company_id = ${s(companyId)} and event_id = ${s(eventId)} order by created_at desc`;
  },
  /** A student sees who shortlisted them, but never the employer's private notes. */
  async listShortlistsForStudent(u, [studentId, eventId]) {
    const a = await requireAccess(u, eventId);
    if (a !== "owner" && studentId !== u.id) throw forbidden();
    const rows = await db()`select * from shortlists where student_id = ${s(studentId)} and event_id = ${s(eventId)}`;
    return a === "owner" ? rows : rows.map((r) => ({ ...r, notes: null }));
  },
  async listShortlists(u, [eventId]) {
    await requireAccess(u, eventId, ["owner"]);
    return db()`select * from shortlists where event_id = ${s(eventId)}`;
  },

  /* Messages — only the two participants can read a conversation. */
  async sendMessage(u, [input]) {
    const i = (input ?? {}) as Row;
    isMe(u, i.senderProfileId);
    const message = s(i.message).slice(0, 5000);
    if (!message.trim() || !s(i.receiverProfileId)) throw new HttpError(400, "Write a message first.");
    // Both people must be in the event the message belongs to.
    await requireAccess(u, i.eventId);
    const receiver = await eventAccess({ ...u, id: s(i.receiverProfileId) }, s(i.eventId));
    if (!receiver) throw forbidden();
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
  async getChecklistItems(u, [role, eventId]) {
    const sql = db();
    const id = s(eventId);
    const read = () => sql`
      select id, event_id, role, title, description, phase, order_index from checklist_items
      where event_id = ${id} and role = ${s(role)} order by order_index asc
    `;
    const rows = await read();
    if (rows.length) return rows;

    // Events created before createEvent seeded a checklist have none at all.
    // Backfill the defaults the first time a member of the event opens one.
    // The advisory lock stops two tabs loading at once from seeding twice.
    const [existing, member] = await Promise.all([
      sql`select 1 from checklist_items where event_id = ${id} limit 1`,
      sql`select 1 from event_registrations where event_id = ${id} and profile_id = ${u.id}`,
    ]);
    if (existing.length || !member.length) return rows;
    await sql.transaction([
      sql`select 1 from pg_advisory_xact_lock(hashtext(${"checklist:" + id}))`,
      seedChecklistQuery(sql, id),
    ]);
    return read();
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
  /** Members only; the join codes only for the owner. */
  async getEvent(u, [eventId]) {
    if (!(await eventAccess(u, s(eventId)))) return null;
    const rows = await db()`select * from events where id = ${s(eventId)}`;
    return forViewer(u, rows[0]);
  },
  async listEventsForManager(u, [managerProfileId]) {
    isMe(u, managerProfileId);
    return db()`select * from events where created_by = ${u.id} order by created_at desc`;
  },
  /** Your own memberships only, as the registrations collection-group rule allowed. */
  async listEventsForProfile(u, [profileId]) {
    isMe(u, profileId);
    const rows = await db()`
      select e.* from event_registrations r join events e on e.id = r.event_id
      where r.profile_id = ${u.id} order by e.start_date desc nulls last
    `;
    return rows.map((e) => forViewer(u, e));
  },
  async getEventByCode(u, [code]) {
    const c = s(code).trim().toUpperCase();
    if (!c) return null;
    const rows = await db()`select * from events where join_code = ${c}`;
    return forViewer(u, rows[0]);
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
          // Every role's checklist starts from the default list.
          seedChecklistQuery(sql, id),
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
    return { ok: true, event: forViewer(u, event) };
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
