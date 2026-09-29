/* ============================================================
   Minimal SMTP client over a Workers TCP socket.

   Lets GradLink send mail through an ordinary mailbox (Gmail with an app
   password) without owning a domain or signing up to an email API. Gmail
   allows about 500 messages a day this way.

   Implicit TLS on port 465, AUTH PLAIN, one message per connection. Bodies
   are base64, so no line can start with "." and no line is too long.
   ============================================================ */

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  /** Header From, e.g. `GradLink <you@gmail.com>`. The envelope sender is always `user`. */
  from: string;
}

export interface Message {
  to: string;
  subject: string;
  text: string;
  html: string;
}

interface Socket {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
  close(): Promise<void>;
}

const TIMEOUT_MS = 15_000;
const enc = new TextEncoder();

async function openSocket(host: string, port: number): Promise<Socket> {
  // Only the Workers runtime has this module. The .catch keeps the bundlers
  // from trying to resolve it, and makes `next dev` fail softly instead.
  const sockets = await import(
    // @ts-expect-error provided by the Workers runtime
    /* turbopackIgnore: true */ /* webpackIgnore: true */ "cloudflare:sockets"
  ).catch(() => null);
  if (!sockets) throw new Error("TCP sockets are only available on Cloudflare Workers (npm run preview or deploy)");
  // Plain text only for a local test mail server; anything else is TLS.
  const local = host === "127.0.0.1" || host === "localhost";
  return sockets.connect({ hostname: host, port }, { secureTransport: local ? "off" : "on" }) as Socket;
}

function b64(s: string): string {
  let bin = "";
  for (const byte of enc.encode(s)) bin += String.fromCharCode(byte);
  return btoa(bin);
}

/** Base64 body wrapped at 76 characters, as MIME requires. */
function b64Body(s: string): string {
  return b64(s).replace(/.{1,76}/g, "$&\r\n");
}

/** RFC 2047 encoding, so any subject text is a safe single header line. */
function encodeHeader(s: string): string {
  return /^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`;
}

function addressOf(mailbox: string): string {
  const m = mailbox.match(/<([^>]+)>/);
  return (m ? m[1] : mailbox).trim();
}

function build(cfg: SmtpConfig, msg: Message): string {
  const boundary = `gl-${crypto.randomUUID()}`;
  const domain = cfg.user.split("@")[1] ?? "localhost";
  return [
    `From: ${cfg.from}`,
    `To: <${msg.to}>`,
    `Subject: ${encodeHeader(msg.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@${domain}>`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    b64Body(msg.text),
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    b64Body(msg.html),
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

async function converse(cfg: SmtpConfig, msg: Message): Promise<void> {
  const socket = await openSocket(cfg.host, cfg.port);
  const reader = socket.readable.getReader();
  const writer = socket.writable.getWriter();
  const dec = new TextDecoder();
  let buffered = "";

  /** Reads one reply, including multi-line ones ("250-..." then "250 ..."). */
  async function reply(): Promise<{ code: number; text: string }> {
    const lines: string[] = [];
    for (;;) {
      const nl = buffered.indexOf("\r\n");
      if (nl >= 0) {
        const line = buffered.slice(0, nl);
        buffered = buffered.slice(nl + 2);
        lines.push(line);
        if (line.length < 4 || line[3] === " ") return { code: Number(line.slice(0, 3)), text: lines.join(" | ") };
        continue;
      }
      const { value, done } = await reader.read();
      if (done) throw new Error(`SMTP connection closed (${lines.join(" | ") || "no reply"})`);
      buffered += dec.decode(value, { stream: true });
    }
  }

  async function step(line: string | null, expect: number[], label = line ?? "greeting"): Promise<void> {
    if (line !== null) await writer.write(enc.encode(`${line}\r\n`));
    const r = await reply();
    if (!expect.includes(r.code)) throw new Error(`SMTP ${label.split(" ")[0]} failed: ${r.text}`);
  }

  try {
    await step(null, [220]);
    await step("EHLO gradlink", [250]);
    await step(`AUTH PLAIN ${b64(`\0${cfg.user}\0${cfg.pass}`)}`, [235], "AUTH");
    await step(`MAIL FROM:<${cfg.user}>`, [250]);
    await step(`RCPT TO:<${msg.to}>`, [250, 251]);
    await step("DATA", [354]);
    // Dot-stuffing for safety, although base64 bodies never start a line with ".".
    const data = build(cfg, msg).replace(/^\./gm, "..");
    await step(`${data}\r\n.`, [250], "DATA body");
  } finally {
    // Say goodbye on success and failure alike, then close without waiting:
    // a server that keeps the connection open must not hold up the reply.
    await writer.write(enc.encode("QUIT\r\n")).catch(() => {});
    reader.releaseLock();
    writer.releaseLock();
    socket.close().catch(() => {});
  }
}

/** Sends one message. Throws with the server's reply when anything is refused. */
export async function sendSmtp(cfg: SmtpConfig, msg: Message): Promise<void> {
  // Addresses go into commands and headers, so nothing that could end a line
  // or close an angle bracket is allowed.
  for (const v of [msg.to, addressOf(cfg.from), cfg.user]) {
    if (/[\r\n<>]/.test(v) || !v.includes("@")) throw new Error("Invalid email address for SMTP");
  }
  if (/[\r\n]/.test(cfg.from) || /[\r\n]/.test(msg.subject)) throw new Error("Invalid header for SMTP");

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`SMTP timed out after ${TIMEOUT_MS / 1000}s`)), TIMEOUT_MS);
  });
  try {
    await Promise.race([converse(cfg, msg), timeout]);
  } finally {
    clearTimeout(timer);
  }
}
