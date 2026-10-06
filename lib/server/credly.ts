/* ============================================================
   Credly badges, verified with Credly itself.

   AWS, Google Cloud, IBM, Cisco, Oracle, CompTIA and many other
   issuers publish their certifications as Credly badges. Every badge
   is an Open Badges assertion with a public API entry: the badge, the
   issuer, the issue and expiry dates, whether it was revoked, and a
   SHA-256 hash of the earner's email. The badge's public page names
   the earner. So a student pastes their badge link and the Worker
   reads those facts from Credly, never from the browser.

   Only the badge id is taken from the student's link; every URL that
   is fetched is built here.
   ============================================================ */

export interface CredlyBadge {
  id: string;
  name: string;
  issuer: string | null;
  issuedOn: string | null;
  expiresOn: string | null;
  /** From the badge page; null when Credly doesn't show it. */
  earnerName: string | null;
  /** "sha256$<hex>" of the earner's email, with its salt if any. */
  emailHash: { hash: string; salt: string | null } | null;
}

export class CredlyError extends Error {}

const UA = "Mozilla/5.0 (compatible; GradLink certificate check; +https://gradlink.app)";
const DOWN = "Credly didn't respond. Please try again in a minute.";
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** The badge id from a credly.com/badges/... link (or a bare id). */
export function credlyBadgeId(link: string): string | null {
  const v = link.trim();
  const m = v.match(new RegExp(`credly\\.com/(?:badges|earner/earned/badge)/(${UUID.source})`, "i")) ?? v.match(new RegExp(`^(${UUID.source})$`, "i"));
  return m ? m[1].toLowerCase() : null;
}

async function get(url: string, accept: string): Promise<Response> {
  try {
    return await fetch(url, { headers: { "User-Agent": UA, Accept: accept }, signal: AbortSignal.timeout(12_000) });
  } catch {
    throw new CredlyError(DOWN);
  }
}

type Obj = Record<string, unknown>;

async function json(url: string): Promise<Obj | null> {
  const res = await get(url, "application/json");
  if (res.status === 404 || res.status === 410) return null;
  const body = res.ok ? ((await res.json().catch(() => null)) as Obj | null) : null;
  if (!body) throw new CredlyError(DOWN);
  return body;
}

const day = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'", "#x27": "'" };
const decode = (s: string) =>
  s.replace(/&(#\d+|#x[0-9a-f]+|\w+);/gi, (all, e: string) => {
    const k = e.toLowerCase();
    if (ENTITIES[k]) return ENTITIES[k];
    if (k.startsWith("#x")) return String.fromCodePoint(parseInt(k.slice(2), 16));
    if (k.startsWith("#")) return String.fromCodePoint(parseInt(k.slice(1), 10));
    return all;
  });

/**
 * The earner's name from the page's share title, which reads
 * "<badge> was issued by <issuer> to <name>."
 */
export function earnerFromPage(html: string): string | null {
  const m = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]*)"/i) ?? html.match(/<meta[^>]+content="([^"]*)"[^>]+property="og:title"/i);
  if (!m) return null;
  const title = decode(m[1]).trim();
  const at = title.lastIndexOf(" to ");
  if (!/ was issued by /.test(title) || at < 0) return null;
  const name = title.slice(at + 4).replace(/\.\s*$/, "").trim();
  return name && name.length <= 120 ? name : null;
}

/** The badge, or null when Credly has no badge with this id. Throws CredlyError when revoked or unreachable. */
export async function fetchCredlyBadge(id: string): Promise<CredlyBadge | null> {
  const assertion = await json(`https://api.credly.com/v1/obi/v2/badge_assertions/${encodeURIComponent(id)}`);
  if (!assertion) return null;
  if (assertion.revoked === true) throw new CredlyError("This badge has been revoked by its issuer, so it can't be added.");
  const badgeUrl = typeof assertion.badge === "string" ? assertion.badge : null;
  // The badge class lives on Credly's own API; never follow a link anywhere else.
  if (!badgeUrl || !badgeUrl.startsWith("https://api.credly.com/")) throw new CredlyError(DOWN);
  const badge = await json(badgeUrl);
  if (!badge || typeof badge.name !== "string") throw new CredlyError(DOWN);
  const issuer = (badge.issuer ?? null) as Obj | null;

  let earnerName: string | null = null;
  const page = await get(`https://www.credly.com/badges/${encodeURIComponent(id)}`, "text/html");
  if (page.ok) earnerName = earnerFromPage(await page.text());

  const recipient = (assertion.recipient ?? null) as Obj | null;
  const identity = typeof recipient?.identity === "string" ? recipient.identity : "";
  return {
    id,
    name: badge.name.trim(),
    issuer: typeof issuer?.name === "string" ? issuer.name.trim() : null,
    issuedOn: day(assertion.issuedOn),
    expiresOn: day(assertion.expires),
    earnerName,
    emailHash: recipient?.hashed && /^sha256\$[0-9a-f]{64}$/i.test(identity)
      ? { hash: identity.slice(7).toLowerCase(), salt: typeof recipient.salt === "string" ? recipient.salt : null }
      : null,
  };
}

/** Does the badge's email hash match this email? */
export async function emailMatches(h: CredlyBadge["emailHash"], email: string): Promise<boolean> {
  if (!h || !email) return false;
  for (const candidate of new Set([email.trim(), email.trim().toLowerCase()])) {
    const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(candidate + (h.salt ?? "")));
    const hex = Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
    if (hex === h.hash) return true;
  }
  return false;
}
