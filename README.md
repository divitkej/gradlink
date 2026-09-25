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
| Password-reset email | Resend HTTP API (free tier), `lib/server/mail.ts` |
| Payments | Stripe Checkout + webhook (`app/api/checkout`, `app/api/stripe/webhook`) |

## Stack

- **Next.js 16** (App Router) — note `AGENTS.md`: this is a modified build, check
  `node_modules/next/dist/docs/` before assuming an API works.
- **React 19**, TypeScript
- **Neon** (`@neondatabase/serverless`) · **Cloudflare Workers** (`wrangler`, `@opennextjs/cloudflare`)
- **GSAP + Framer Motion + Lenis + three.js** for the landing page
- Styling is inline `style={{}}` objects + CSS variables in `app/globals.css`.
  Tailwind is installed but unused in components — keep it that way.

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars     # then fill in DATABASE_URL and AUTH_SECRET
npm run db:migrate                 # create the tables in Neon (idempotent)
npm run dev                        # http://localhost:3000
```

`npm run dev` is plain `next dev`, with the Worker's bindings and `.dev.vars`
provided by `initOpenNextCloudflareForDev()` (see `next.config.ts`) — the
`UPLOADS` KV namespace is simulated locally. Without a Resend key, password
reset links are printed to the dev server console instead of emailed.

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
| `RESEND_API_KEY` | for "Forgot password" | Resend API key (free tier) |
| `EMAIL_FROM` | for "Forgot password" | e.g. `GradLink <no-reply@yourdomain>` (a Resend-verified domain) |
| `APP_URL` | no | Public origin for emailed links; defaults to the request origin. Set in `wrangler.jsonc` `vars` |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO` | for Placement Pro | Stripe keys |
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
scale to zero between visits. The only polling in the UI (the unread-messages
badge) runs once a minute and only in a visible tab.

## Cloudflare

`wrangler.jsonc` defines one Worker, `gradlink`, with static assets and one KV
namespace. One-time setup:

```bash
npx wrangler login
npx wrangler kv namespace create UPLOADS      # paste the id into wrangler.jsonc
npx wrangler secret put DATABASE_URL
npx wrangler secret put AUTH_SECRET
npx wrangler secret put RESEND_API_KEY        # optional, enables password reset
npx wrangler secret put EMAIL_FROM            # optional, enables password reset
```

## Deploy

```bash
npm run deploy      # opennextjs-cloudflare build && deploy → https://gradlink.<subdomain>.workers.dev
npm run upload      # same build, uploaded as a preview version without going live
```

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
needs a signed-in account; writes are owner-only; messages are readable only by
their two participants; `subscriptions` is readable by its owner and writable
only by the Stripe webhook, so a paid plan can't be forged from the browser.

## History

GradLink ran on Supabase until July 2026, then briefly on Firebase. Both are
archived under `docs/archive/`; neither is used at runtime.

## Contributors

| Contributor | Role |
|---|---|
| [@divitkej](https://github.com/divitkej) | Creator and maintainer |
| [@BharatGupta09](https://github.com/BharatGupta09) | Contributor — Neon + Cloudflare Workers migration |
