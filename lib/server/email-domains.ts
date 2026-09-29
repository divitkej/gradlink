/**
 * Email domains nobody can sign up with: personal mailboxes, throwaway
 * inboxes and reserved test domains. Students, employers and colleges must
 * each use their institution's or company's own address, so the directory
 * stays tied to real organisations.
 */
const PERSONAL = [
  // Global webmail
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "yahoo.co.in", "yahoo.in", "ymail.com",
  "rocketmail.com", "outlook.com", "hotmail.com", "hotmail.co.uk", "live.com", "msn.com", "windowslive.com",
  "icloud.com", "me.com", "mac.com", "aol.com", "aim.com", "gmx.com", "gmx.net", "gmx.de", "mail.com",
  "email.com", "inbox.com", "zoho.com", "zohomail.com", "zohomail.in", "yandex.com", "yandex.ru",
  "mail.ru", "fastmail.com", "fastmail.fm", "hey.com", "hushmail.com", "qq.com", "163.com", "126.com",
  // Privacy-focused
  "proton.me", "protonmail.com", "protonmail.ch", "pm.me", "tutanota.com", "tutanota.de", "tuta.io", "tuta.com",
  // India and the Gulf
  "rediffmail.com", "rediff.com", "sify.com", "emirates.net.ae", "eim.ae",
];

const DISPOSABLE = [
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "sharklasers.com", "grr.la", "10minutemail.com",
  "10minutemail.net", "tempmail.com", "temp-mail.org", "tempmailo.com", "tempr.email", "yopmail.com",
  "yopmail.net", "trashmail.com", "getnada.com", "nada.email", "dispostable.com", "maildrop.cc",
  "throwawaymail.com", "fakeinbox.com", "emailondeck.com", "mohmal.com", "mintemail.com", "mailnesia.com",
  "spamgourmet.com", "burnermail.io", "moakt.com", "tmail.ws", "emailfake.com", "mailpoof.com",
];

/** RFC 2606 / 6761 names that can never receive real mail. */
const RESERVED = ["example.com", "example.net", "example.org", "test", "example", "invalid", "localhost", "local"];

const BLOCKED = new Set([...PERSONAL, ...DISPOSABLE, ...RESERVED]);

/** The lower-cased part after the @, or "" when there isn't one. */
export function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return at < 0 ? "" : email.slice(at + 1).trim().toLowerCase().replace(/\.$/, "");
}

/** True when `domain` is `parent` or one of its subdomains. */
export function domainWithin(domain: string, parent: string): boolean {
  return domain === parent || domain.endsWith(`.${parent}`);
}

/** Personal, throwaway or reserved, including their subdomains. */
export function isBlockedDomain(domain: string): boolean {
  if (!domain) return true;
  const labels = domain.split(".");
  for (let i = 0; i < labels.length; i++) {
    if (BLOCKED.has(labels.slice(i).join("."))) return true;
  }
  return false;
}

/** Second-level labels shared by many organisations: ac.ae, edu.in, co.uk. */
const SHARED_SECOND_LEVEL = new Set(["ac", "edu", "co", "com", "org", "net", "gov", "gob", "sch", "res", "mil", "nic", "govt"]);

/**
 * A suffix used by many institutions (ac.ae, edu.in) or a bare top-level
 * domain. Approving one would admit every institution under it.
 */
export function isSharedSuffix(domain: string): boolean {
  const labels = domain.split(".");
  return labels.length < 2 || (labels.length === 2 && SHARED_SECOND_LEVEL.has(labels[0]));
}

/**
 * Whether two domains belong to the same organisation: they share a parent
 * that is not a shared suffix. bits-pilani.ac.in and dubai.bits-pilani.ac.in
 * match; ku.ac.ae and zu.ac.ae only share ac.ae, so they don't.
 */
export function sameOrganisation(a: string, b: string): boolean {
  const x = a.split(".").reverse();
  const y = b.split(".").reverse();
  const common: string[] = [];
  for (let i = 0; i < Math.min(x.length, y.length) && x[i] === y[i]; i++) common.unshift(x[i]);
  return common.length >= 2 && !isSharedSuffix(common.join("."));
}
