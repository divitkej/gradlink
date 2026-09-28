import { serverEnv } from "./env";
import { sendSmtp } from "./smtp";

const isDev = process.env.NODE_ENV !== "production";

type Provider = "smtp" | "resend" | null;

function provider(): Provider {
  const env = serverEnv();
  if (env.SMTP_USER && env.SMTP_PASS) return "smtp";
  if (env.RESEND_API_KEY && env.EMAIL_FROM) return "resend";
  return null;
}

/** Whether an email can be delivered at all. Local development prints instead. */
export function emailEnabled(): boolean {
  return isDev || provider() !== null;
}

/**
 * Transactional email (confirm your email, password reset).
 *
 * Two providers, tried in this order:
 *   1. SMTP through an ordinary mailbox (Gmail + app password), over a Workers
 *      TCP socket (lib/server/smtp.ts). Needs no domain. SMTP_USER + SMTP_PASS.
 *   2. Resend's HTTP API, once GradLink has a verified domain.
 *      RESEND_API_KEY + EMAIL_FROM.
 *
 * Returns false when nothing is configured or the provider refused, so the
 * caller can say so instead of pretending the email went out.
 */
export async function sendEmail(msg: { to: string; subject: string; html: string; text: string }): Promise<boolean> {
  const env = serverEnv();
  const which = provider();

  if (which === "smtp") {
    try {
      await sendSmtp(
        {
          host: env.SMTP_HOST || "smtp.gmail.com",
          port: Number(env.SMTP_PORT) || 465,
          user: env.SMTP_USER!,
          pass: env.SMTP_PASS!,
          from: env.EMAIL_FROM || `GradLink <${env.SMTP_USER}>`,
        },
        msg,
      );
      return true;
    } catch (err) {
      console.error("[mail] SMTP send failed:", (err as Error).message);
      return false;
    }
  }

  if (which === "resend") {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text }),
    });
    if (!res.ok) console.error("[mail] provider rejected message:", res.status, await res.text().catch(() => ""));
    return res.ok;
  }

  if (isDev) {
    // Local development: no provider needed, the link is printed instead.
    console.info(`[mail] (dev, not sent) to=${msg.to} subject="${msg.subject}"\n${msg.text}`);
    return true;
  }
  return false;
}
