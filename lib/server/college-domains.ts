import { db } from "./sql";
import { serverEnv } from "./env";
import { HttpError } from "./http";
import { domainWithin, emailDomain, isBlockedDomain, isSharedSuffix, sameOrganisation } from "./email-domains";
import type { AuthUser } from "./session";

/* ============================================================
   Who may sign up with which email.

   A college signs up with its staff email and a sample of what its
   students' emails look like (f20250409@dubai.bits-pilani.ac.in). The
   domain of the sample (dubai.bits-pilani.ac.in) is the student domain,
   and it waits for the owner to approve it at /admin/colleges, because
   staff and students often use different domains. Students can only sign
   up on an approved student domain or one of its subdomains, so every
   student account belongs to a known institution. Employers use any work
   domain that is not personal, throwaway or an approved student domain.
   Emails in ADMIN_EMAILS skip the email rules so the owner can always get in.
   ============================================================ */

export type DomainStatus = "pending" | "approved" | "rejected";
export type SignUpRole = "student" | "company" | "college";

export interface CollegeDomain {
  domain: string;
  institution: string;
  status: DomainStatus;
  requested_by_email: string | null;
  /** Whether the requester's own email is on the same organisation's domain. */
  staff_domain_matches: boolean;
  created_at: string;
  decided_at: string | null;
}

const MSG = {
  personal: "Use your official email address. Personal and temporary addresses (like Gmail or Outlook) can't be used on GradLink.",
  studentPending: "Your university has applied to join GradLink and is being reviewed. You can sign up once it's approved.",
  studentUnknown: "Your university isn't on GradLink yet. Ask your careers office to register, then sign up with your university email.",
  companyIsCollege: "That's a university email address. Sign up as a student or college instead, or use your company email.",
  sampleMissing: "Enter an example of your students' email addresses, like f20250409@dubai.bits-pilani.ac.in.",
  samplePersonal: "Your students' example email must be on your institution's domain, not a personal one like Gmail.",
  sampleShared: "That example email's domain is shared by many institutions. Use your students' full email domain, like dubai.bits-pilani.ac.in.",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMAIN_RE = /^(?=.{3,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

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
  // Every parent of the domain down to two labels: dubai.bits-pilani.ac.in, bits-pilani.ac.in, ac.in.
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

/**
 * The student domain from a college's example student email, or a message
 * the person can act on. Only the part after the @ is kept.
 */
export function studentDomainFromSample(sample: string): string {
  const s = sample.trim();
  if (!s || !EMAIL_RE.test(s)) throw new HttpError(400, MSG.sampleMissing);
  const domain = emailDomain(s);
  if (!DOMAIN_RE.test(domain)) throw new HttpError(400, MSG.sampleMissing);
  if (isBlockedDomain(domain)) throw new HttpError(400, MSG.samplePersonal);
  if (isSharedSuffix(domain)) throw new HttpError(400, MSG.sampleShared);
  return domain;
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
 * The insert that queues a college's student domain for approval, to run
 * inside the sign-up transaction; null when the domain is already covered
 * by an approved registration. A domain already pending (a second staff
 * member signing up) is left as it is; a rejected one goes back to pending
 * so the owner sees the new request.
 *
 * Wrapped in an object on purpose: a query is a thenable, so returning it
 * bare from an async function would run it straight away, outside the
 * transaction.
 */
export async function collegeDomainRequest(studentDomain: string, institution: string, profileId: string) {
  if ((await registrationFor(studentDomain))?.status === "approved") return null;
  const query = db()`
    insert into college_domains (domain, institution, requested_by)
    values (${studentDomain}, ${institution || studentDomain}, ${profileId})
    on conflict (domain) do update set
      status = 'pending', institution = excluded.institution, requested_by = excluded.requested_by,
      created_at = now(), decided_at = null
    where college_domains.status = 'rejected'
  `;
  return { query };
}

/** A college account's student domain and its approval, for its dashboard notice. */
export async function domainStatusFor(profileId: string): Promise<{ domain: string; status: DomainStatus } | null> {
  const rows = await db()`select student_domain from colleges where profile_id = ${profileId}`;
  const domain = rows[0]?.student_domain as string | null | undefined;
  if (!domain) return null;
  const reg = await registrationFor(domain);
  if (reg) return reg;
  const rejected = await db()`select 1 from college_domains where domain = ${domain} and status = 'rejected'`;
  return rejected.length ? { domain, status: "rejected" } : null;
}

export async function listCollegeDomains(): Promise<CollegeDomain[]> {
  const rows = await db()`
    select d.domain, d.institution, d.status, p.email as requested_by_email, d.created_at, d.decided_at
    from college_domains d left join profiles p on p.id = d.requested_by
    order by (d.status = 'pending') desc, d.created_at desc
  `;
  return rows.map((r) => ({
    ...(r as unknown as Omit<CollegeDomain, "staff_domain_matches">),
    staff_domain_matches: !!r.requested_by_email && sameOrganisation(emailDomain(r.requested_by_email as string), r.domain as string),
  }));
}

/**
 * Approve or reject a request. `approveAs` lets the owner widen a request to
 * a parent domain, for example staff.ku.ac.ae to ku.ac.ae. Widening admits
 * every subdomain, so for a multi-campus university it also admits the
 * other campuses.
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
