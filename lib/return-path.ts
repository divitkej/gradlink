/**
 * Where to send someone after they sign in or sign up, when the link asked
 * for it with `?next=` (e.g. a scanned QR profile, components/scan/ViewerGate.tsx).
 *
 * The value is resolved the way the browser would resolve it and must stay on
 * this site. Checking the raw string is not enough: browsers drop tabs and
 * newlines, so "/\t/evil.com" becomes "//evil.com", another site, and dot
 * segments collapse, so "/.//evil.com" does too.
 */
export function returnPath(): string | null {
  if (typeof window === "undefined") return null;
  const next = new URLSearchParams(window.location.search).get("next");
  if (!next || !next.startsWith("/")) return null;
  let url: URL;
  try {
    url = new URL(next, window.location.origin);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin) return null;
  // Resolving also collapses dot segments, so "/.//evil.com" comes out as
  // "//evil.com". The router resolves the returned string again, so check
  // that string too: it must not start with "//" and must stay on this site.
  const path = url.pathname + url.search + url.hash;
  if (path.startsWith("//") || new URL(path, window.location.origin).origin !== window.location.origin) return null;
  return path;
}

/**
 * `href` with this page's (validated) `?next=` carried along, so moving
 * between sign-in and sign-up keeps the way back to a scanned profile.
 */
export function carryNext(href: string): string {
  const next = returnPath();
  if (!next) return href;
  return `${href}${href.includes("?") ? "&" : "?"}next=${encodeURIComponent(next)}`;
}

