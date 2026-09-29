import { db } from "./sql";
import { serverEnv } from "./env";
import { HttpError } from "./http";
import { domainWithin, emailDomain, isBlockedDomain } from "./email-domains";
import type { AuthUser } from "./session";

/* ============================================================
   Who may sign up with which email.

   Colleges register their email domain (for example ku.ac.ae) and the
   owner approves it at /admin/colleges. Students can only sign up with an
   address on an approved domain or one of its subdomains, so every
   student account belongs to a known institution. Employers use any
   work domain that is not personal, throwaway or an approved college.
   Emails in ADMIN_EMAILS skip these rules so the owner can always get in.
   ============================================================ */

export type DomainStatus = "pending" | "approved" | "rejected";
export type SignUpRole = "student" | "company" | "college";

export interface CollegeDomain {
  domain: string;
  institution: string;
  status: DomainStatus;
  requested_by_email: string | null;
  created_at: string;
  decided_at: string | null;
}

const MSG = {
  personal: "Use your official email address. Personal and temporary addresses (like Gmail or Outlook) can't be used on GradLink.",
  studentPending: "Your university has applied to join GradLink and is being reviewed. You can sign up once it's approved.",
  studentUnknown: "Your university isn't on GradLink yet. Ask your careers office to register, then sign up with your university email.",
  companyIsCollege: "That's a university email address. Sign up as a student or college instead, or use your company email.",
};

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (serverEnv().ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}

/** Owner-only routes answer 404 to everyone else, so they don't advertise themselves. */
export function requireAdmin(u: AuthUser | null): asserts u is AuthUser {
  if (!u || !isAdminEmail(u.email)) throw new HttpError(404, "Not found.");
}

/** The approved or pending registration covering `domain`, most specific first. */
async function registrationFor(domain: string): Promise<{ domain: string; status: DomainStatus } | null> {
  const labels = domain.split(".");
  // Every parent of the domain down to two labels: student.ku.ac.ae, ku.ac.ae, ac.ae.
  const candidates = labels.slice(0, -1).map((_, i) => labels.slice(i).join("."));
  const rows = await db()`
    select domain, status from college_domains
    where domain = any(${candidates}) and status <> 'rejected'
    order by length(domain) desc
  `;
  const approved = rows.find((r) => r.status === "approved");
  const hit = approved ?? rows[0];
  return hit ? { domain: hit.domain as string, status: hit.status as DomainStatus } : null;
}

/** Throws a message the person can act on when this role can't use this email. */
export async function checkSignUpEmail(role: SignUpRole, email: string): Promise<void> {
  if (isAdminEmail(email)) return;
  const domain = emailDomain(email);
  if (isBlockedDomain(domain)) throw new HttpError(400, MSG.personal);

  if (role === "student") {
    const reg = await registrationFor(domain);
    if (reg?.status === "approved" && domainWithin(domain, reg.domain)) return;
    throw new HttpError(403, reg ? MSG.studentPending : MSG.studentUnknown);
  }
  if (role === "company") {
    const reg = await registrationFor(domain);
    if (reg?.status === "approved") throw new HttpError(400, MSG.companyIsCollege);
  }
}

/**
 * The insert that queues a college's domain for approval, to run inside the
 * sign-up transaction; null when there is nothing to queue (the owner, or a
 * domain already covered by an approved parent such as staff.ku.ac.ae under
 * ku.ac.ae). A domain already pending (a second staff member signing up) is
 * left as it is; a rejected one goes back to pending so the owner sees it.
 *
 * Wrapped in an object on purpose: a query is a thenable, so returning it
 * bare from an async function would run it straight away, outside the
 * transaction.
 */
export async function collegeDomainRequest(email: string, institution: string, profileId: string) {
  if (isAdminEmail(email)) return null;
  const domain = emailDomain(email);
  if ((await registrationFor(domain))?.status === "approved") return null;
  const query = db()`
    insert into college_domains (domain, institution, requested_by)
    values (${domain}, ${institution || domain}, ${profileId})
    on conflict (domain) do update set
      status = 'pending', institution = excluded.institution, requested_by = excluded.requested_by,
      created_at = now(), decided_at = null
    where college_domains.status = 'rejected'
  `;
  return { query };
}

/** The registration a college account's email falls under, for its dashboard notice. */
export async function domainStatusFor(email: string): Promise<{ domain: string; status: DomainStatus } | null> {
  const domain = emailDomain(email);
  const reg = await registrationFor(domain);
  if (reg) return reg;
  const rejected = await db()`select domain from college_domains where domain = ${domain} and status = 'rejected'`;
  return rejected.length ? { domain, status: "rejected" } : null;
}

export async function listCollegeDomains(): Promise<CollegeDomain[]> {
  const rows = await db()`
    select d.domain, d.institution, d.status, p.email as requested_by_email, d.created_at, d.decided_at
    from college_domains d left join profiles p on p.id = d.requested_by
    order by (d.status = 'pending') desc, d.created_at desc
  `;
  return rows as unknown as CollegeDomain[];
}

const DOMAIN_RE = /^(?=.{3,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/** Shared suffixes like ac.ae or edu.in: approving one would admit every institution under it. */
const SHARED_SECOND_LEVEL = new Set(["ac", "edu", "co", "com", "org", "net", "gov", "gob", "sch", "res", "mil", "nic", "govt"]);
function isSharedSuffix(domain: string): boolean {
  const labels = domain.split(".");
  return labels.length < 2 || (labels.length === 2 && SHARED_SECOND_LEVEL.has(labels[0]));
}

/**
 * Approve or reject a request. `approveAs` lets the owner widen a request to
 * its parent, for example staff.ku.ac.ae to ku.ac.ae, so students on any
 * subdomain of the university can sign up.
 */
export async function decideCollegeDomain(domain: string, action: "approve" | "reject", approveAs?: string): Promise<void> {
  const from = domain.trim().toLowerCase();
  const to = (approveAs ?? from).trim().toLowerCase();
  if (action === "reject") {
    const r = await db()`update college_domains set status = 'rejected', decided_at = now() where domain = ${from} returning 1`;
    if (!r.length) throw new HttpError(404, "That request no longer exists.");
    return;
  }
  if (!DOMAIN_RE.test(to) || isBlockedDomain(to)) throw new HttpError(400, "Enter a valid institution domain, like ku.ac.ae.");
  if (isSharedSuffix(to)) throw new HttpError(400, `@${to} is shared by many institutions. Approve the university's own domain, like ku.ac.ae.`);
  if (!domainWithin(from, to)) throw new HttpError(400, `You can only approve ${from} or a parent domain of it.`);

  const sql = db();
  if (to === from) {
    const r = await sql`update college_domains set status = 'approved', decided_at = now() where domain = ${from} returning 1`;
    if (!r.length) throw new HttpError(404, "That request no longer exists.");
    return;
  }
  // Widening: the parent takes over the request and the narrower row goes.
  const exists = await sql`select 1 from college_domains where domain = ${from}`;
  if (!exists.length) throw new HttpError(404, "That request no longer exists.");
  await sql.transaction([
    sql`insert into college_domains (domain, institution, requested_by, status, created_at, decided_at)
        select ${to}, institution, requested_by, 'approved', created_at, now() from college_domains where domain = ${from}
        on conflict (domain) do update set status = 'approved', decided_at = now()`,
    sql`delete from college_domains where domain = ${from}`,
  ]);
}
