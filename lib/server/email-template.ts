/* ============================================================
   Branded layout for account email (confirm email, password reset).

   Email clients ignore stylesheets and most modern CSS, so this is a
   table layout with inline styles only. The logo is the PNG app icon:
   Gmail and Outlook do not show SVG. The wordmark is text, so the brand
   still reads when a client blocks images.
   ============================================================ */

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export interface AccountEmail {
  /** Absolute site origin, e.g. https://gradleap.online. */
  base: string;
  /** Shown in the inbox preview next to the subject. */
  preview: string;
  heading: string;
  greeting: string;
  /** Plain-text paragraphs above the button. */
  intro: string[];
  button: { label: string; url: string };
  /** Plain-text paragraphs below the button. */
  outro: string[];
  /** Why this person got the email, shown in the footer. */
  reason: string;
}

export function renderAccountEmail(e: AccountEmail): { html: string; text: string } {
  const p = (s: string) =>
    `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:24px;color:#3F3F46;">${escapeHtml(s)}</p>`;
  const url = escapeHtml(e.button.url);
  const site = escapeHtml(e.base);
  const host = escapeHtml(new URL(e.base).host);

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(e.heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F4F4F5;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(e.preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F4F4F5;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="background-color:#0A0A0A;border-radius:8px 8px 0 0;padding:20px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding-right:12px;vertical-align:middle;"><img src="${site}/apple-icon.png" width="36" height="36" alt="" style="display:block;border:0;border-radius:6px;"></td>
<td style="vertical-align:middle;font-family:${FONT};font-size:20px;font-weight:600;letter-spacing:-0.3px;color:#F5F5F5;">GradLeap</td>
</tr></table>
</td></tr>
<tr><td style="background-color:#FFFFFF;border:1px solid #E4E4E7;border-top:0;border-radius:0 0 8px 8px;padding:36px 32px 32px;">
<h1 style="margin:0 0 20px;font-family:${FONT};font-size:22px;line-height:30px;font-weight:600;color:#0A0A0A;">${escapeHtml(e.heading)}</h1>
${p(e.greeting)}
${e.intro.map(p).join("\n")}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;"><tr>
<td style="background-color:#0A0A0A;border-radius:6px;"><a href="${url}" target="_blank" style="display:inline-block;padding:13px 24px;font-family:${FONT};font-size:15px;font-weight:600;line-height:20px;color:#FFFFFF;text-decoration:none;border-radius:6px;">${escapeHtml(e.button.label)}</a></td>
</tr></table>
${e.outro.map(p).join("\n")}
<p style="margin:24px 0 0;padding-top:20px;border-top:1px solid #E4E4E7;font-family:${FONT};font-size:13px;line-height:20px;color:#71717A;">If the button does not work, copy this link into your browser:<br><a href="${url}" target="_blank" style="color:#0A0A0A;word-break:break-all;">${url}</a></p>
</td></tr>
<tr><td style="padding:20px 32px 0;font-family:${FONT};font-size:12px;line-height:18px;color:#71717A;text-align:center;">
${escapeHtml(e.reason)}<br>
<a href="${site}" target="_blank" style="color:#71717A;text-decoration:underline;">${host}</a> &middot; <a href="${site}/privacy" target="_blank" style="color:#71717A;text-decoration:underline;">Privacy Policy</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    e.greeting,
    ...e.intro,
    `${e.button.label}: ${e.button.url}`,
    ...e.outro,
    "--",
    "GradLeap",
    e.reason,
    `${e.base}`,
  ].join("\n\n");

  return { html, text };
}
