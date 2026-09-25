import { serverEnv } from "./env";

const isDev = process.env.NODE_ENV !== "production";

/** Whether an email can be delivered at all. Local development prints instead. */
export function emailEnabled(): boolean {
  const env = serverEnv();
  return isDev || Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);
}

/**
 * Transactional email over HTTPS.
 *
 * Firebase Auth used to send the password-reset email itself. Workers can't
 * send mail to arbitrary addresses on their own, so this calls Resend's HTTP
 * API (free tier: 3,000 emails/month) — a plain fetch, no SDK. Any provider
 * with an HTTP API can be swapped in here.
 *
 * Returns false when no provider is configured, so the caller can say so
 * instead of pretending the email went out.
 */
export async function sendEmail(msg: { to: string; subject: string; html: string; text: string }): Promise<boolean> {
  const env = serverEnv();
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    if (isDev) {
      // Local development: no provider needed, the link is printed instead.
      console.info(`[mail] (dev, not sent) to=${msg.to} subject="${msg.subject}"\n${msg.text}`);
      return true;
    }
    return false;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text }),
  });
  if (!res.ok) console.error("[mail] provider rejected message:", res.status, await res.text().catch(() => ""));
  return res.ok;
}
