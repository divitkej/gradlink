/* ============================================================
   Coursera course certificates, verified against Coursera itself.

   Coursera has no API that lets an individual learner share their
   courses with another app (its learner API is only for Coursera for
   Business and Campus customers). Every certificate does have a
   public verify page, though, and that page embeds the learner's
   name, the course, the issuer, the completion date and the course
   skills. So a student pastes their certificate link and the Worker
   reads those facts from coursera.org, never from the browser.

   Only the certificate code is taken from the student's link; the
   URL that is fetched is always built here, so the link can't point
   the Worker anywhere else.
   ============================================================ */

export interface VerifiedCertificate {
  code: string;
  /** As shown on the certificate, middle name included. */
  learnerName: string;
  /** First and last name only, for matching against the student. */
  matchName: string;
  courseId: string | null;
  courseSlug: string | null;
  courseName: string | null;
  partnerName: string | null;
  completedAt: string | null;
  skills: string[];
}

export interface CatalogCourse {
  id: string;
  slug: string;
  name: string;
  partnerName: string | null;
}

export class CourseraError extends Error {}

const UA = "Mozilla/5.0 (compatible; GradLink certificate check; +https://gradlink.app)";

/** The certificate code from any of Coursera's certificate link formats. */
export function certificateCode(link: string): string | null {
  const v = link.trim();
  if (/\/(specialization|professional-cert)s?\//i.test(v)) {
    throw new CourseraError("Specialization and Professional Certificate links aren't supported yet. Add each course certificate in it instead.");
  }
  const m = v.match(/coursera\.org\/(?:account\/accomplishments\/(?:verify|certificate|records)|verify|share)\/([A-Za-z0-9]{8,20})\b/i)
    ?? v.match(/^([A-Za-z0-9]{8,20})$/);
  return m ? m[1].toUpperCase() : null;
}

/** The course slug from a coursera.org/learn/... link. */
export function courseSlug(link: string): string | null {
  const m = link.trim().match(/coursera\.org\/learn\/([a-z0-9-]{2,120})/i);
  return m ? m[1].toLowerCase() : null;
}

/** The JSON object that starts at `start`, found by matching braces outside strings. */
function jsonObjectAt(text: string, start: number): unknown {
  let depth = 0, inString = false, escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return JSON.parse(text.slice(start, i + 1));
  }
  throw new CourseraError("Coursera's page couldn't be read. Please try again later.");
}

type Obj = Record<string, unknown>;

/**
 * The state is followed by the next `window.` assignment in the same script,
 * so it can usually be cut there and parsed natively, which is much cheaper
 * on the Worker's CPU budget than scanning it character by character.
 */
function fastJson(html: string, start: number): Obj | null {
  const end = html.slice(start).search(/\}\s*;\s*(?:window\.|<\/script>)/);
  if (end < 0) return null;
  try {
    return JSON.parse(html.slice(start, start + end + 1)) as Obj;
  } catch {
    return null;
  }
}

/** Visit every object in the state, with the key it is stored under. */
function walk(v: unknown, visit: (o: Obj, key: string) => void, key = "") {
  if (Array.isArray(v)) v.forEach((x) => walk(x, visit, key));
  else if (v && typeof v === "object") {
    visit(v as Obj, key);
    Object.entries(v as Obj).forEach(([k, x]) => walk(x, visit, k));
  }
}

/**
 * Read a certificate's facts from the HTML of its verify page. Returns null
 * when the page has no certificate with this code (a mistyped or fake link).
 */
export function parseVerifyPage(html: string, code: string): VerifiedCertificate | null {
  const marker = html.search(/window\.__APOLLO_STATE__\s*=\s*\{/);
  if (marker < 0) throw new CourseraError("Coursera's page couldn't be read. Please try again later.");
  const start = html.indexOf("{", marker);
  const state = fastJson(html, start) ?? (jsonObjectAt(html, start) as Obj);

  let membership: Obj | null = null, profile: Obj | null = null, accomplishment: Obj | null = null;
  const courses = new Map<string, Obj>(), partners = new Map<string, Obj>();
  // Course skills sit on a separate metadata object whose key contains the course id.
  const skillLists: { key: string; skills: unknown[] }[] = [];
  walk(state, (o, key) => {
    if (Array.isArray(o.skills)) skillLists.push({ key: `${key} ${String(o.id ?? "")}`, skills: o.skills });
    switch (o.__typename) {
      case "AccomplishmentsVCMembership": if (String(o.certificateCode).toUpperCase() === code) membership = o; break;
      case "AccomplishmentsSignatureTrackProfile": profile ??= o; break;
      case "AccomplishmentsMembership": accomplishment ??= o; break;
      case "Course_Course": if (typeof o.id === "string") courses.set(o.id, o); break;
      case "Partner_Partner": if (typeof o.id === "string") partners.set(o.id, o); break;
    }
  });
  if (!membership) return null;

  const m = membership as Obj, p = profile as Obj | null, a = accomplishment as Obj | null;
  const part = (x: unknown) => (typeof x === "string" ? x.trim() : "");
  const learnerName = [part(p?.firstName), part(p?.middleName), part(p?.lastName)].filter(Boolean).join(" ");
  const matchName = [part(p?.firstName), part(p?.lastName)].filter(Boolean).join(" ");
  const courseId = typeof a?.courseId === "string" ? a.courseId : null;
  const course = courseId ? courses.get(courseId) : undefined;
  const partnerRef = Array.isArray(course?.partners) ? (course.partners[0] as Obj | undefined)?.__ref : undefined;
  const partner = typeof partnerRef === "string" ? partners.get(partnerRef.split(":")[1]) : undefined;
  const granted = Number(m.grantedAt);

  return {
    code,
    learnerName,
    matchName,
    courseId,
    courseSlug: typeof course?.slug === "string" ? course.slug : null,
    courseName: typeof course?.name === "string" ? course.name.trim() : null,
    partnerName: typeof partner?.name === "string" ? partner.name : null,
    completedAt: Number.isFinite(granted) && granted > 0 ? new Date(granted).toISOString() : null,
    skills: ((courseId ? skillLists.find((l) => l.key.includes(courseId)) : undefined)?.skills ?? [])
      .filter((s): s is string => typeof s === "string")
      .slice(0, 30),
  };
}

async function get(url: string): Promise<Response> {
  try {
    return await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,application/json" }, signal: AbortSignal.timeout(12_000) });
  } catch {
    throw new CourseraError("Coursera didn't respond. Please try again in a minute.");
  }
}

export async function fetchCertificate(code: string): Promise<VerifiedCertificate | null> {
  const res = await get(`https://www.coursera.org/account/accomplishments/verify/${encodeURIComponent(code)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new CourseraError("Coursera didn't respond. Please try again in a minute.");
  return parseVerifyPage(await res.text(), code);
}

/** The issuer's name. Nice to have, so any failure just leaves it out. */
async function partnerName(ids: unknown): Promise<string | null> {
  const id = Array.isArray(ids) && typeof ids[0] === "string" ? ids[0] : null;
  if (!id) return null;
  try {
    const res = await get(`https://api.coursera.org/api/partners.v1?ids=${encodeURIComponent(id)}&fields=name`);
    if (!res.ok) return null;
    const body = (await res.json().catch(() => null)) as { elements?: { name?: string }[] } | null;
    return body?.elements?.[0]?.name ?? null;
  } catch {
    return null;
  }
}

/**
 * A course from Coursera's public catalog. Null means Coursera answered and has
 * no such course; a failed or garbled answer throws, so a hiccup is never
 * reported to the student as "no course at that link".
 */
async function catalog(query: string): Promise<CatalogCourse | null> {
  const res = await get(`https://api.coursera.org/api/courses.v1?${query}&fields=name,slug,partnerIds`);
  if (res.status === 404) return null;
  const body = res.ok ? ((await res.json().catch(() => null)) as { elements?: Obj[] } | null) : null;
  if (!body || !Array.isArray(body.elements)) throw new CourseraError("Coursera didn't respond. Please try again in a minute.");
  const c = body?.elements?.[0];
  if (!c || typeof c.id !== "string" || typeof c.name !== "string") return null;
  return { id: c.id, slug: String(c.slug ?? ""), name: c.name.trim(), partnerName: await partnerName(c.partnerIds) };
}

/** A current course by its coursera.org/learn/ slug. */
export function courseBySlug(slug: string) {
  return catalog(`q=slug&slug=${encodeURIComponent(slug)}`);
}

/**
 * A course by id, used when a certificate page leaves the course name out.
 * That happens for retired courses, which the public catalog no longer lists
 * either, so the caller falls back to "Retired Coursera course".
 */
export function courseById(id: string) {
  return catalog(`ids=${encodeURIComponent(id)}`);
}

/** Words of a name, in any script, with Latin accents removed. */
const nameTokens = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[^\p{L}]+/u).filter((t) => t.length > 1);

/**
 * Does the name on the certificate belong to this student? Every word of the
 * certificate's first and last name must appear in the student's name, in any
 * order, so "Sara Al-Rashidi" matches "Sara Al Rashidi" but not "Sara Khan".
 */
export function namesMatch(certificateName: string, studentName: string): boolean {
  const cert = nameTokens(certificateName), mine = new Set(nameTokens(studentName));
  return cert.length >= 2 && cert.every((t) => mine.has(t));
}

/** Coursera shows "User 123456" when a learner hides their name. */
export function nameHidden(certificateName: string): boolean {
  return /^user\s*\d+$/i.test(certificateName.trim()) || nameTokens(certificateName).length < 2;
}
