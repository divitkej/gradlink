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
| Authorization | Per-operation checks in `lib/server/rpc.ts` |
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
| `DATABASE_URL` | yes | Neon **pooled** connection string for the `gradlink_app` role (see Neon below). Use the owner role only for `npm run db:migrate` |
| `AUTH_SECRET` | yes | ≥32 random characters; signs session cookies |
| `SMTP_USER` | for account email | Mailbox that sends mail (e.g. a Gmail). Not set yet: account email is paused |
| `SMTP_PASS` | for account email | That Gmail's 16-character app password (Google Account, Security, 2-Step Verification, App passwords). Secret |
| `SMTP_HOST`, `SMTP_PORT` | no | Default `smtp.gmail.com` and `465` |
| `RESEND_API_KEY` | no | Alternative to SMTP once GradLink has a verified domain |
| `EMAIL_FROM` | no | Sender shown in email. Defaults to `GradLink <SMTP_USER>`; required with Resend |
| `APP_URL` | yes | Public origin used in password-reset links, upload URLs and the Stripe return URL. Set in `wrangler.jsonc` `vars` to `https://gradlink.bharatg0904.workers.dev` until the custom domain is attached. Falls back to the request origin when empty |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO` | for Placement Pro | Stripe keys |
| `ADMIN_EMAILS` | for `/admin` | Comma-separated emails that can open the owner dashboard at `/admin` and approve college domains at `/admin/colleges`. These emails also skip the sign-up email rules. Sign up with the email right after setting it, so nobody else can register it. Secret |
| `NEXT_PUBLIC_SITE_URL` | recommended | **Build-time**, public. Canonical URL for share metadata — see `.env.example` |

Generate an `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## Neon

Production database: Neon project `gradlink` (id `round-sun-26602992`) in the
owner's Neon organisation, Free plan, region `aws-ap-southeast-1` (Singapore,
as the Privacy Policy states), branch `production`, database `gradlink`.

It has two roles:

| Role | Can | Used by |
|---|---|---|
| `gradlink_owner` | everything (owns the tables) | `npm run db:migrate` only |
| `gradlink_app` | select, insert, update, delete on the app tables; no DDL | the Worker's `DATABASE_URL` |

`gradlink_app` was created with SQL (not in the Neon console), so it is not a
member of `neon_superuser`. Its grants also cover tables `gradlink_owner`
creates later, so a schema change needs no new grant. To give it a new
password, run `alter role gradlink_app with password '…'` as the owner, then
update the Worker's `DATABASE_URL` secret.

Setting up a fresh database:

1. Create a project on the Free plan at <https://console.neon.tech>.
2. Run `npm run db:migrate` with the owner's **pooled** connection string as
   `DATABASE_URL`: it applies `db/schema.sql` and is safe to repeat.
3. As the owner, create the app role:
   ```sql
   create role gradlink_app with login password '<32+ random characters>';
   grant connect on database gradlink to gradlink_app;
   grant usage on schema public to gradlink_app;
   grant select, insert, update, delete on all tables in schema public to gradlink_app;
   alter default privileges for role gradlink_owner in schema public
     grant select, insert, update, delete on tables to gradlink_app;
   ```
4. Use `gradlink_app`'s pooled connection string as the app's `DATABASE_URL`.

The app only talks to Neon over HTTPS (`neon()` HTTP driver): one stateless
request per query, no pooled sockets held by the Worker, so Neon's compute can
scale to zero between visits. The only polling in the UI is the unread-messages
badge (once a minute) and the owner dashboard at `/admin` (every 30 seconds),
and both only run in a visible tab.

## Cloudflare

`wrangler.jsonc` defines one Worker, `gradlink`, on the owner's Cloudflare
account (the one serving `*.bharatg0904.workers.dev`), with static assets and
one KV namespace, `gradlink-UPLOADS`, whose id is already in `wrangler.jsonc`.
It runs next to the Neon database (`placement` in `wrangler.jsonc`), because
each API request makes several queries in a row.

One-time setup, from a machine signed in to that account:

```bash
npx wrangler login
npx wrangler secret put DATABASE_URL          # gradlink_app's pooled connection string
npx wrangler secret put AUTH_SECRET           # a new random value (command above)
npx wrangler secret put ADMIN_EMAILS          # your email, then sign up with it straight away
npx wrangler secret put SMTP_PASS             # optional: Gmail app password; turns on email confirmation and password reset
```

If the Worker does not exist yet, `wrangler secret put` offers to create it;
or run `npm run deploy` first and set the secrets after (the site answers 503
until `DATABASE_URL` and `AUTH_SECRET` are set). Secrets are kept across deploys.

## Deploy

```bash
npm run deploy      # opennextjs-cloudflare build && deploy → https://gradlink.bharatg0904.workers.dev
npm run upload      # same build, uploaded as a preview version without going live
```

Every push to `main` deploys through GitHub Actions
(`.github/workflows/deploy.yml`): typecheck and lint, `npm run db:migrate`,
`npm run deploy`, then it waits until `/api/health` answers
`{"ok":true,"database":"connected"}`. It needs these repository secrets
(Settings, Secrets and variables, Actions), and skips with a notice until the
first two exist:

| Secret | What it is |
|---|---|
| `CLOUDFLARE_API_TOKEN` | API token with "Edit Cloudflare Workers" on the GradLink account |
| `CLOUDFLARE_ACCOUNT_ID` | That account's id |
| `NEON_MIGRATE_URL` | Optional. `gradlink_owner`'s connection string, for `npm run db:migrate` only |

Deploy from `main` only: `npm run deploy` from a branch replaces the whole
live site with that branch. Use `npm run upload` for a preview version.
Plain `next build` and `wrangler deploy` do not work, because the Worker is
the OpenNext output in `.open-next/`.

Stripe webhook endpoint: `https://<your-worker-url>/api/stripe/webhook`
(events: `checkout.session.completed`, `customer.subscription.updated`,
`customer.subscription.deleted`).

Free-plan notes: the Worker bundle is ~2.5 MiB gzipped (2,490 KiB on 2026-10-15) against the 3 MiB
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

Ids are `text` holding UUIDs; printed QR codes and `/scan/...` links carry them.

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

## Contributors

| Contributor | Role |
|---|---|
| [@divitkej](https://github.com/divitkej) | Creator and maintainer |
| [@BharatGupta09](https://github.com/BharatGupta09) | Contributor — Neon + Cloudflare Workers migration |
