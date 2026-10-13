/**
 * Where to send someone after they sign in or sign up, when the link asked
 * for it with `?next=` (e.g. a scanned QR profile, components/scan/ViewerGate.tsx).
 *
 * The value is resolved the way the browser would resolve it and must stay on
 * this site. Checking the raw string is not enough: browsers drop tabs and
 * newlines, so "/\t/evil.com" becomes "//evil.com", another site.
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
  return url.pathname + url.search + url.hash;
}
