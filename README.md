# GradLink

Campus career-fair platform — prepare students, connect employers, track outcomes.

## Architecture

```
Browser ──► Cloudflare Workers (one Worker: "gradlink")
             ├─ static assets   pages, JS/CSS, prerendered HTML, share images
             ├─ Next.js server  dynamic pages (/events/[id], /scan/…)
             ├─ /api/*          auth, data (rpc), uploads, Stripe
             │     │
             │     ├──► Neon PostgreSQL   (HTTP driver, scales to zero)
             │     └──► Workers KV        résumés / brochures / logos
             └─ deployed with Wrangler via OpenNext
```

**Cost target: $0.** GradLink is designed to run entirely on the
**Neon Free** plan and the **Cloudflare Workers Free** plan, within their
current limits. Nothing in this repo requires a paid plan: no Workers Paid
features, no R2/Durable Objects/Queues/Images bindings, no cron triggers, and
no always-on database compute.

| Concern | Where it lives |
|---|---|
| Database | Neon Postgres — schema in `db/schema.sql` |
| Server runtime | Cloudflare Workers, Next.js via [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) |
| Auth | Email + password in `lib/server/auth-api.ts`; HttpOnly signed session cookie |
| Authorization | Per-operation checks in `lib/server/rpc.ts` (ported from the old `firestore.rules`) |
| File uploads | Workers KV namespace `UPLOADS` (`lib/server/files.ts`) |
| Account email (confirm email, password reset) | Gmail over SMTP from the Worker (`lib/server/smtp.ts`), no domain needed; Resend once there is a domain (`lib/server/mail.ts`) |
| Payments | Stripe Checkout + webhook (`app/api/checkout`, `app/api/stripe/webhook`) |

## Stack

- **Next.js 16** (App Router) — note `AGENTS.md`: this is a modified build, check
  `node_modules/next/dist/docs/` before assuming an API works.
- **React 19**, TypeScript
- **Neon** (`@neondatabase/serverless`) · **Cloudflare Workers** (`wrangler`, `@opennextjs/cloudflare`)
- **GSAP + Framer Motion + Lenis + three.js** for the landing page
- Styling is inline `style={{}}` objects + CSS variables in `app/globals.css`.
  Tailwind is installed but unused in components — keep it that way.

## Repo layout

Folder and branch rules are in `AGENTS.md` under "Repository organization". Launch checklists live in `docs/checklists/` (index: `docs/README.md`).

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars     # then fill in DATABASE_URL and AUTH_SECRET
npm run db:migrate                 # create the tables in Neon (idempotent)
npm run dev                        # http://localhost:3000
```

`npm run dev` is plain `next dev`, with the Worker's bindings and `.dev.vars`
provided by `initOpenNextCloudflareForDev()` (see `next.config.ts`) — the
`UPLOADS` KV namespace is simulated locally. Confirmation and password reset
links are printed to the dev server console instead of emailed (SMTP needs the
Workers runtime, so use `npm run preview` to send real mail locally).

Email confirmation is enforced only when the server can send email. Without
`SMTP_PASS` (or Resend) new accounts are confirmed on creation.

To run the real Workers build locally (workerd, same as production):

```bash
npm run preview
```

## Environment variables

Server secrets go in **`.dev.vars`** locally (git-ignored) and in **Wrangler
secrets** in production. Never put them in `.env*` files — those can be inlined
into the build.

| Name | Required | What it is |
|---|---|---|
| `DATABASE_URL` | yes | Neon **pooled** connection string (Neon console → Connect) |
| `AUTH_SECRET` | yes | ≥32 random characters; signs session cookies |
| `SMTP_USER` | for account email | Mailbox that sends mail (e.g. a Gmail). Not set yet: account email is paused |
| `SMTP_PASS` | for account email | That Gmail's 16-character app password (Google Account, Security, 2-Step Verification, App passwords). Secret |
| `SMTP_HOST`, `SMTP_PORT` | no | Default `smtp.gmail.com` and `465` |
| `RESEND_API_KEY` | no | Alternative to SMTP once GradLink has a verified domain |
| `EMAIL_FROM` | no | Sender shown in email. Defaults to `GradLink <SMTP_USER>`; required with Resend |
| `APP_URL` | yes, before launch | Public origin (your custom domain, for example `https://your-domain.example`) used in password-reset links, upload URLs and the Stripe return URL. Falls back to the request origin when empty. Set in `wrangler.jsonc` `vars` |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO` | for Placement Pro | Stripe keys |
| `ADMIN_EMAILS` | for `/admin` | Comma-separated emails that can open the owner dashboard. Sign up with the email first so nobody else can register it. Set as a secret |
| `NEXT_PUBLIC_SITE_URL` | recommended | **Build-time**, public. Canonical URL for share metadata — see `.env.example` |

Generate an `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## Neon

1. Create a project on the Free plan at <https://console.neon.tech>.
2. Copy the **pooled** connection string into `DATABASE_URL`.
3. `npm run db:migrate` applies `db/schema.sql`.
4. To bring existing data across, see `migration/README.md`.

The app only talks to Neon over HTTPS (`neon()` HTTP driver): one stateless
request per query, no pooled sockets held by the Worker, so Neon's compute can
scale to zero between visits. The only polling in the UI is the unread-messages
badge (once a minute) and the owner dashboard at `/admin` (every 30 seconds),
and both only run in a visible tab.

## Cloudflare

`wrangler.jsonc` defines one Worker, `gradlink`, with static assets and one KV
namespace. One-time setup:

```bash
npx wrangler login
npx wrangler kv namespace create UPLOADS      # paste the id into wrangler.jsonc
npx wrangler secret put DATABASE_URL
npx wrangler secret put AUTH_SECRET
npx wrangler secret put SMTP_PASS             # Gmail app password; turns on email confirmation and password reset
```

## Deploy

```bash
npm run deploy      # opennextjs-cloudflare build && deploy → https://gradlink.divitkej.workers.dev
npm run upload      # same build, uploaded as a preview version without going live
```

The old Vercel project (`gradlink-theta.vercel.app`) no longer builds the app.
`vercel.json` makes it skip the build and redirect every path to the Worker
(temporary 307, so it can be switched to permanent once the move is settled).

Stripe webhook endpoint: `https://<your-worker-url>/api/stripe/webhook`
(events: `checkout.session.completed`, `customer.subscription.updated`,
`customer.subscription.deleted`).

Free-plan notes: the Worker bundle is ~2.3 MiB gzipped against the 3 MiB
limit — check the `Total Upload … gzip` line when adding dependencies. Share
images are static PNGs for this reason (`docs/brand/README.md`).

## Data model

A user's **account id is their profile id**, and role rows (`students`,
`companies`, `colleges`) are keyed by that same id. Every ownership check is a
direct comparison against the signed-in session's profile id.

```
profiles            auth_credentials    password_reset_tokens
students  companies  colleges           (keyed by profile id)
events ── event_registrations, scans, shortlists, student_event_analytics
messages            checklist_items ── checklist_progress
subscriptions       orders              qr_codes (legacy, preserved)
```

Ids are `text`: Supabase-era rows have UUIDs, Firebase-era rows keep their
Firebase ids, so QR codes and links survive the migration.

All browser data access goes through `lib/db.ts`, `lib/events.ts` and
`lib/billing.ts`, which call `/api/rpc`. Auth goes through `lib/auth.ts`.
Components should not call `fetch('/api/…')` directly.

## Access rules

Enforced in the Worker (`lib/server/rpc.ts`), not the browser: every operation
needs a signed-in account; writes are owner-only and checked against the
account's role; event data (attendees, scans, shortlists, analytics) is visible
only to people registered for that event, and whole-event views only to its
staff; shortlist notes stay with the company that wrote them; messages are
readable only by their two participants; `subscriptions` is readable by its
owner and writable only by the Stripe webhook, so a paid plan can't be forged
from the browser. Open items are tracked in `docs/checklists/security.md`.

## History

GradLink ran on Supabase until July 2026, then briefly on Firebase. Both are
archived under `docs/archive/`; neither is used at runtime.

## Contributors

| Contributor | Role |
|---|---|
| [@divitkej](https://github.com/divitkej) | Creator and maintainer |
| [@BharatGupta09](https://github.com/BharatGupta09) | Contributor — Neon + Cloudflare Workers migration |
