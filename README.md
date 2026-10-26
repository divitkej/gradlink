# GradLink

Campus career-fair platform: prepare students, connect employers, track outcomes.

GradLink runs a college's career fair end to end. Students build a verified career profile and plan their day, employers scan students at their booth and manage candidates, and the college sees what the fair actually produced: shortlists, interviews, offers and a placement rate.

- Live site: <https://gradlink.bharatg0904.workers.dev>
- Repository: <https://github.com/divitkej/gradlink>
- Launch progress: [`launch-board/`](launch-board/), generated from [`docs/checklists/`](docs/checklists/)

## Contents

1. [Who it is for](#who-it-is-for)
2. [What GradLink does](#what-gradlink-does)
3. [Pricing](#pricing)
4. [Product decisions](#product-decisions)
5. [Design rules](#design-rules)
6. [Project history](#project-history)
7. [Launch status](#launch-status)
8. [Architecture](#architecture)
9. [Stack](#stack)
10. [Repo layout](#repo-layout)
11. [Local development](#local-development)
12. [Environment variables](#environment-variables)
13. [Neon](#neon)
14. [Cloudflare](#cloudflare)
15. [Deploy](#deploy)
16. [Data model](#data-model)
17. [Access rules](#access-rules)
18. [Contributors](#contributors)

## Who it is for

| Account | Signs up with | Main pages |
|---|---|---|
| College (the customer) | Campus email domain, approved by the owner at `/admin/colleges` | `/dashboard/college`, `/dashboard/event-manager` |
| Student | The college's student email domain, plus the event's student code | `/dashboard/student` and its `schedule`, `passport`, `applications`, `opportunities` pages |
| Employer | A company email domain, plus the event's employer code | `/dashboard/company` |
| Alumni mentor | Any address that is not throwaway, through the college's alumni invite link | `/dashboard/alumni` |
| Owner | An email listed in `ADMIN_EMAILS` | `/admin` (owner dashboard), `/admin/colleges` (domain approvals) |

Sign-up refuses personal, throwaway and test addresses for every role except alumni and owners.

## What GradLink does

### Students

- Career profile: degree, graduation year, skills, résumé upload, LinkedIn, GitHub, portfolio, bio, career goal, target roles and projects.
- Rule-based résumé score (`lib/resume.ts`), labelled "Rule-based" wherever it shows. It is not AI.
- Career Readiness Hub: readiness score, profile completion, six competencies with the evidence behind each, a personal action plan and the Fair-Ready badge (`lib/readiness.ts`).
- Verified achievements:
  - Coursera certificates checked with Coursera, and the name on the certificate must match the student (`lib/server/coursera.ts`).
  - LeetCode and Codeforces profiles verified after the student proves the account is theirs (`lib/server/coding.ts`).
  - Credly badges verified with Credly; other certificates are marked self-reported (`lib/server/credly.ts`).
- Event sessions (workshops, mock interviews, company sessions, 1:1 recruiter slots, networking, talks, alumni mentoring) with booking, waitlists that promote automatically and attendance.
- Live event schedule and a personal event plan of booked sessions and saved companies by booth.
- Digital event passport, live engagement score and leaderboard (`lib/engagement.ts`).
- Company matching on skills and target roles, and an Opportunities page ranking every open role at the event.
- Application tracker with interview dates and outcomes.
- Live booth queues (up to three at once) with a notification when it is their turn.
- Interview invites: pick one of up to five times proposed by a company.
- Event history and company connections across every event.

### Employers

- QR scanning at the booth, with notes. A scan counts only when the QR's scan key comes with it.
- Candidate list with filters (degree, graduation year, skill, target role, stage), bulk follow-up messages and CSV export.
- Stages: Scanned, Shortlisted, Contacted, Interview, Offer. Contacted is set automatically on a message or interview invite.
- Shortlists (shortlisted, priority, maybe, not a fit) with private notes.
- Interview invites, offers, booth queue control and direct messages.
- A student's email is shown only after the company has scanned them.

### Colleges

- Events with separate student, employer and alumni codes, statuses, time zones and check-in.
- Role checklists for before, during and after each event.
- Live analytics computed from real activity, interview counts, offers and placement rate.
- Outcome report with CSV export (Placement Pro), including:
  - Event ROI score out of 10 with its breakdown (`ROI_PARTS` in `lib/report.ts`).
  - Year-over-year comparison against an earlier event the college ran.

### Alumni mentors

- Join through the college's invite link (`/sign-up/alumni?code=`), host mentoring sessions students book, keep a mentor profile.
- See students as a fellow attendee does: no contact details, scores or verified achievements. Their scans record nothing.

### Everyone

- Direct messages with unread counts per event, in-app notifications behind the header bell, scan history.
- Privacy Policy (`/privacy`) and Terms and Conditions (`/terms`).

## Pricing

| Plan | Who pays | Price | Includes |
|---|---|---|---|
| Starter | Free | Free | Unlimited events and the full student and employer experience |
| Placement Pro | The college | AED 3,600 per campus per year | Outcome report, CSV exports, Event ROI score, year-over-year comparison |

- Students and employers never pay.
- Billing runs through Stripe Checkout and a signed webhook (`app/api/checkout`, `app/api/stripe/webhook`). A plan cannot be set from the browser.
- The Terms cover cancellation by email and no refunds except as stated. They have not been reviewed by a lawyer yet.

## Product decisions

Decisions made during the project that the code now enforces.

- **Employers see strengths, never assessments.** Colleges are the customer and want their students hired, so nothing an employer sees should count against a student. Enforced in `lib/server/rpc.ts`:
  - Résumé score, readiness, competencies, engagement score, leaderboard and scan history are visible only to the student and their college.
  - Employers see only the profile the student chose to share.
  - A student sees only the companies that shortlisted them, never "maybe", "not a fit" or a company's notes.
  - No filtering or sorting by readiness, résumé score, GPA or event activity for employers.
- **Verified certificates replaced test scores.** Achievements must be checked with the issuing site or marked self-reported.
- **Honest landing page.** Every mockup is labelled "Product preview · sample data". Claims that were not true were removed:
  - "UAE data residency" became "Free for students and employers", because data is stored in Singapore and Neon has no UAE region.
  - "GradLink Technologies LLC" became "© GradLink" until the company is registered.
  - Footer links to pages that do not exist were removed.
- **$0 to run.** Everything fits the Neon Free and Cloudflare Workers Free plans (details under [Architecture](#architecture)).
- **Account email is paused.** Confirmation and password-reset email are built and tested, but sending from the founder's personal Gmail was paused. Until a sender is chosen, accounts are confirmed on creation.
- **The logo is a graduation cap** whose tassel ends in a dot. The earlier G mark read as a monochrome Google logo.
- **Privacy law.** The Privacy Policy is written under the UAE Personal Data Protection Law. Operator: Divit Kejriwal, Dubai.

## Design rules

The site must not look generated. These rules apply to every page and every piece of copy.

Never use:

- Purple gradients
- Pill-shaped buttons
- Fake reviews or fake metrics
- Vague hero text
- Emoji icons
- Em dashes, in code comments, docs or visible copy
- Over-the-top scroll animations (scroll-triggered animations were removed from the landing page)
- AI-generated stock photos or filler copy
- Cursor animations
- Fake counters

Visual direction: a monochrome matte theme, inline `style={{}}` objects and CSS variables in `app/globals.css`.

Do not launch until:

- [ ] A custom domain is connected
- [x] A favicon is added
- [x] No "made with AI" tag anywhere
- [x] A Privacy Policy page exists
- [x] A Terms and Conditions page exists

## Project history

Built from 19 September to 15 October 2026 across 48 pull requests. Every pull request below was merged into `main`.

### Phase 0: Starting point (19 to 24 September)

- Baseline committed as GradLink stood after its Firebase migration. Earlier Supabase assets and stale planning docs were archived.
- A real multi-event model replaced the hardcoded demo event.
- The committed Supabase export was pseudonymised before the repo was published.

### Phase 1: New platform and landing redesign (24 to 28 September)

| PR | What it did |
|---|---|
| [#1](https://github.com/divitkej/gradlink/pull/1) | Moved from Firebase to Neon Postgres and Cloudflare Workers, both on Free plans |
| [#2](https://github.com/divitkej/gradlink/pull/2) | Added the Contributors section |
| [#3](https://github.com/divitkej/gradlink/pull/3) | Landing redesign: monochrome matte theme, honest content, working links, no scroll-triggered animations |
| [#4](https://github.com/divitkej/gradlink/pull/4) | Pointed the old Vercel site at the Cloudflare Worker |
| [#5](https://github.com/divitkej/gradlink/pull/5) | Launch on Cloudflare and Neon, Privacy Policy and Terms, email confirmation, working Employer CRM preview filters |
| [#8](https://github.com/divitkej/gradlink/pull/8) | Security hardening (locked-down data API, uploads and response headers) and per-IP rate limits on sign-in, sign-up and password reset |

### Phase 2: Core product (27 September to 6 October)

| PR | What it did |
|---|---|
| [#6](https://github.com/divitkej/gradlink/pull/6) | Core loop: role checklists, event editing, event navigation, event data visible to members only, analytics computed live |
| [#7](https://github.com/divitkej/gradlink/pull/7) | Separate student and employer codes, college plan choice, owner dashboard, graduation-cap logo, site audit fixes |
| [#9](https://github.com/divitkej/gradlink/pull/9) | Sign-up limited to campus and company email domains |
| [#10](https://github.com/divitkej/gradlink/pull/10) | Student dashboard completed: readiness, schedule, passport, invites, booth queues, alerts, opportunities, Coursera, certificates, coding profiles, event time zones |
| [#12](https://github.com/divitkej/gradlink/pull/12) | Self-updating launch board generated from the checklists |
| [#13](https://github.com/divitkej/gradlink/pull/13) | Phase-wise section on the launch board |

### Phase 3: Live testing, review and hardening (11 to 14 October)

| PR | What it did |
|---|---|
| [#14](https://github.com/divitkej/gradlink/pull/14) | Six audit follow-ups (pricing button, sidebar links, Stripe result, sign-in redirects, live messages) and interview counts for colleges |
| [#15](https://github.com/divitkej/gradlink/pull/15) | Production database checks recorded in the checklists |
| [#16](https://github.com/divitkej/gradlink/pull/16) | Company side fixes: notes, student interest, messages, student emails shown only after a scan |
| [#17](https://github.com/divitkej/gradlink/pull/17) | Closed an open redirect in the sign-in return path |
| [#18](https://github.com/divitkej/gradlink/pull/18) | Bugs from the post-merge review of `main` |
| [#19](https://github.com/divitkej/gradlink/pull/19) | Blocked dot-segment open redirects |
| [#20](https://github.com/divitkej/gradlink/pull/20) | Event tabs in the URL, failed message drafts kept, shortlist status rollback |
| [#21](https://github.com/divitkej/gradlink/pull/21) | A scan counts only when the QR's scan key comes with it |
| [#22](https://github.com/divitkej/gradlink/pull/22) | Removed every Vercel, Supabase and Firebase leftover |
| [#23](https://github.com/divitkej/gradlink/pull/23) | Stopped double charges and wrong plans in checkout and the Stripe webhook |
| [#24](https://github.com/divitkej/gradlink/pull/24) | Stopped unregistered owner addresses being claimed while email is off |
| [#25](https://github.com/divitkej/gradlink/pull/25) | Privacy Policy brought in line with what the app does |
| [#26](https://github.com/divitkej/gradlink/pull/26) | A replaced join code stops working on older events |
| [#27](https://github.com/divitkej/gradlink/pull/27) | Return to the scanned profile after signing up from a QR |
| [#28](https://github.com/divitkej/gradlink/pull/28) | Event membership and input checks in more data API operations |
| [#29](https://github.com/divitkej/gradlink/pull/29) | An edited application stays at the event it was logged at |
| [#30](https://github.com/divitkej/gradlink/pull/30) | Stuffed profile names no longer match other people's certificates |
| [#31](https://github.com/divitkej/gradlink/pull/31) | Unread messages at other events show in the inbox |
| [#32](https://github.com/divitkej/gradlink/pull/32) | Company page no longer resets; booth visitors counted once |
| [#33](https://github.com/divitkej/gradlink/pull/33) | Sidebar section links scroll once the section has loaded |
| [#34](https://github.com/divitkej/gradlink/pull/34) | Replies stay on screen; read marks per event |
| [#35](https://github.com/divitkej/gradlink/pull/35) | An un-marked booking returns to the waitlist when the session is full |
| [#36](https://github.com/divitkej/gradlink/pull/36) | Long real names allowed in the certificate name check |
| [#37](https://github.com/divitkej/gradlink/pull/37) | A late Stripe retry for an old subscription can no longer take over billing |
| [#38](https://github.com/divitkej/gradlink/pull/38) | Achievements, names and files limited to the people the Privacy Policy names |
| [#39](https://github.com/divitkej/gradlink/pull/39) | Scan pages: history, saves, camera shutdown, sign-in copy |
| [#40](https://github.com/divitkej/gradlink/pull/40) | Return paths through sign-up, pricing and admin sign-in; Pro shown as the current plan |
| [#41](https://github.com/divitkej/gradlink/pull/41) | Booth queue keeps checking after a failed check |
| [#42](https://github.com/divitkej/gradlink/pull/42) | Company dashboard checklist count corrected |
| [#43](https://github.com/divitkej/gradlink/pull/43) | Go-live items ticked after `main` was deployed |

### Phase 4: Outcome features (14 October)

Every feature the public site showed but the app did not yet have was built.

| PR | What it did |
|---|---|
| [#44](https://github.com/divitkej/gradlink/pull/44) | Contacted and Offer stages, offer tracking and placement rate |
| [#45](https://github.com/divitkej/gradlink/pull/45) | Event ROI score on the outcome report |
| [#46](https://github.com/divitkej/gradlink/pull/46) | Year-over-year comparison between a college's events |
| [#47](https://github.com/divitkej/gradlink/pull/47) | Alumni mentor accounts invited by their college |

### Phase 5: New owner accounts and automatic deploys (15 October)

| PR | What it did |
|---|---|
| [#48](https://github.com/divitkej/gradlink/pull/48) | Moved GradLink to the new owner's Neon project and Cloudflare account, deploys from `main` through GitHub Actions with a health check, removed a committed 21st.dev API key from `.mcp.json` |

- The new Neon project started empty: nothing was copied from the earlier database.
- Before the move, 144 API checks and 9 Stripe webhook checks passed on the Workers runtime against the new database.

## Launch status

Live counts are on the [launch board](launch-board/). Items still open, by checklist:

| Item | Checklist | Who |
|---|---|---|
| Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets (or deploy from a signed-in machine), then set the Worker secrets | `launch.md` | Owner |
| Verify live: `/api/health` reports the database connected, public pages return 200, one test account signs up and is deleted | `launch.md` | Owner |
| Connect a custom domain, then update `APP_URL` in `wrangler.jsonc` and `SITE_URL` in `lib/site.ts` | `launch.md` | Owner |
| Choose an email sender (dedicated Gmail or Resend) and turn on confirmation and password-reset email | `launch.md` | Owner |
| Set `ADMIN_EMAILS` and sign up with that email straight away | `organiser-access.md` | Owner |
| Revoke the 21st.dev API key that sits in the public history | `security.md` | Key holder |
| Confirm secrets, backups (Free plan keeps 6 hours of history) and account verification | `security.md` | Owner |
| Optional WAF rate limit on `/api/auth/*` once the domain is live | `security.md` | Owner |
| Check headers with securityheaders.com and test the QR camera on a phone | `security.md` | Owner |
| Two-account run on real phones (booking, attendance, passport) | `student-dashboard.md` | Owner |
| Opening hero on a low-end phone, link preview card | `landing-page.md` | Owner |
| Confirm or reword "Setup in 48 hours", "No contract lock-in", "Dedicated onboarding" | `features-to-build.md` | Owner |
| Pill shapes on labels and tabs, left as they are for now | `dashboard.md` | Decision |
| College sidebar Profile link, pending a decision | `audit-follow-ups.md` | Decision |

## Architecture

```
Browser ──► Cloudflare Workers (one Worker: "gradlink")
             ├─ static assets   pages, JS/CSS, prerendered HTML, share images
             ├─ Next.js server  dynamic pages (/events/[id], /scan/…)
             ├─ /api/*          auth, data (rpc), uploads, Stripe, health
             │     │
             │     ├──► Neon PostgreSQL   (HTTP driver, scales to zero)
             │     └──► Workers KV        résumés / brochures / logos
             └─ deployed with Wrangler via OpenNext
```

**Cost target: $0.** GradLink is designed to run entirely on the **Neon Free** plan and the **Cloudflare Workers Free** plan, within their current limits. Nothing in this repo requires a paid plan: no Workers Paid features, no R2, Durable Objects, Queues or Images bindings, no cron triggers, and no always-on database compute.

| Concern | Where it lives |
|---|---|
| Database | Neon Postgres, schema in `db/schema.sql` |
| Server runtime | Cloudflare Workers, Next.js via [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) |
| Auth | Email and password in `lib/server/auth-api.ts`; HttpOnly signed session cookie |
| Authorization | Per-operation checks in `lib/server/rpc.ts` |
| File uploads | Workers KV namespace `UPLOADS` (`lib/server/files.ts`) |
| Account email (confirm email, password reset) | Gmail over SMTP from the Worker (`lib/server/smtp.ts`), no domain needed; Resend once there is a domain (`lib/server/mail.ts`) |
| Payments | Stripe Checkout and webhook (`app/api/checkout`, `app/api/stripe/webhook`) |
| Health check | `app/api/health`, used by the deploy workflow |

## Stack

- **Next.js 16** (App Router). Note `AGENTS.md`: this is a modified build, so check `node_modules/next/dist/docs/` before assuming an API works.
- **React 19**, TypeScript
- **Neon** (`@neondatabase/serverless`) and **Cloudflare Workers** (`wrangler`, `@opennextjs/cloudflare`)
- **GSAP, Framer Motion, Lenis and three.js** for the landing page
- Styling is inline `style={{}}` objects and CSS variables in `app/globals.css`. Tailwind is installed but unused in components. Keep it that way.

## Repo layout

Folder and branch rules are in `AGENTS.md` under "Repository organization". Launch checklists live in `docs/checklists/` (index: `docs/README.md`). Share image and icon sources are in `docs/brand/`.

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars     # then fill in DATABASE_URL and AUTH_SECRET
npm run db:migrate                 # create the tables in Neon (idempotent)
npm run dev                        # http://localhost:3000
npm run check                      # typecheck and lint
```

- `npm run dev` is plain `next dev`, with the Worker's bindings and `.dev.vars` provided by `initOpenNextCloudflareForDev()` (see `next.config.ts`). The `UPLOADS` KV namespace is simulated locally.
- Confirmation and password reset links are printed to the dev server console instead of emailed. SMTP needs the Workers runtime, so use `npm run preview` to send real mail locally.
- Email confirmation is enforced only when the server can send email. Without `SMTP_PASS` (or Resend) new accounts are confirmed on creation.

To run the real Workers build locally (workerd, same as production):

```bash
npm run preview
```

## Environment variables

Server secrets go in **`.dev.vars`** locally (git-ignored) and in **Wrangler secrets** in production. Never put them in `.env*` files, which can be inlined into the build.

| Name | Required | What it is |
|---|---|---|
| `DATABASE_URL` | yes | Neon **pooled** connection string for the `gradlink_app` role (see Neon below). Use the owner role only for `npm run db:migrate` |
| `AUTH_SECRET` | yes | 32 or more random characters; signs session cookies |
| `SMTP_USER` | for account email | Mailbox that sends mail (for example a Gmail). Not set yet: account email is paused |
| `SMTP_PASS` | for account email | That Gmail's 16-character app password (Google Account, Security, 2-Step Verification, App passwords). Secret |
| `SMTP_HOST`, `SMTP_PORT` | no | Default `smtp.gmail.com` and `465` |
| `RESEND_API_KEY` | no | Alternative to SMTP once GradLink has a verified domain |
| `EMAIL_FROM` | no | Sender shown in email. Defaults to `GradLink <SMTP_USER>`; required with Resend |
| `APP_URL` | yes | Public origin used in password-reset links, upload URLs and the Stripe return URL. Set in `wrangler.jsonc` `vars` to `https://gradlink.bharatg0904.workers.dev` until the custom domain is attached. Falls back to the request origin when empty |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO` | for Placement Pro | Stripe keys |
| `ADMIN_EMAILS` | for `/admin` | Comma-separated emails that can open the owner dashboard at `/admin` and approve college domains at `/admin/colleges`. These emails also skip the sign-up email rules. Sign up with the email right after setting it, so nobody else can register it. Secret |
| `NEXT_PUBLIC_SITE_URL` | recommended | **Build-time**, public. Canonical URL for share metadata, see `.env.example` |

Generate an `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## Neon

Production database: Neon project `gradlink` (id `round-sun-26602992`) in the owner's Neon organisation, Free plan, region `aws-ap-southeast-1` (Singapore, as the Privacy Policy states), branch `production`, database `gradlink`.

It has two roles:

| Role | Can | Used by |
|---|---|---|
| `gradlink_owner` | everything (owns the tables) | `npm run db:migrate` only |
| `gradlink_app` | select, insert, update, delete on the app tables; no DDL | the Worker's `DATABASE_URL` |

`gradlink_app` was created with SQL (not in the Neon console), so it is not a member of `neon_superuser`. Its grants also cover tables `gradlink_owner` creates later, so a schema change needs no new grant. To give it a new password, run `alter role gradlink_app with password '…'` as the owner, then update the Worker's `DATABASE_URL` secret.

Setting up a fresh database:

1. Create a project on the Free plan at <https://console.neon.tech>.
2. Run `npm run db:migrate` with the owner's **pooled** connection string as `DATABASE_URL`: it applies `db/schema.sql` and is safe to repeat.
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

The app only talks to Neon over HTTPS (`neon()` HTTP driver): one stateless request per query, no pooled sockets held by the Worker, so Neon's compute can scale to zero between visits. The only polling in the UI is the unread-messages badge (once a minute) and the owner dashboard at `/admin` (every 30 seconds), and both only run in a visible tab.

## Cloudflare

`wrangler.jsonc` defines one Worker, `gradlink`, on the owner's Cloudflare account (the one serving `*.bharatg0904.workers.dev`), with static assets and one KV namespace, `gradlink-UPLOADS`, whose id is already in `wrangler.jsonc`. It runs next to the Neon database (`placement` in `wrangler.jsonc`), because each API request makes several queries in a row.

One-time setup, from a machine signed in to that account:

```bash
npx wrangler login
npx wrangler secret put DATABASE_URL          # gradlink_app's pooled connection string
npx wrangler secret put AUTH_SECRET           # a new random value (command above)
npx wrangler secret put ADMIN_EMAILS          # your email, then sign up with it straight away
npx wrangler secret put SMTP_PASS             # optional: Gmail app password; turns on email confirmation and password reset
```

If the Worker does not exist yet, `wrangler secret put` offers to create it; or run `npm run deploy` first and set the secrets after (the site answers 503 until `DATABASE_URL` and `AUTH_SECRET` are set). Secrets are kept across deploys.

## Deploy

```bash
npm run deploy      # opennextjs-cloudflare build && deploy → https://gradlink.bharatg0904.workers.dev
npm run upload      # same build, uploaded as a preview version without going live
```

Every push to `main` deploys through GitHub Actions (`.github/workflows/deploy.yml`): typecheck and lint, `npm run db:migrate`, `npm run deploy`, then it waits until `/api/health` answers `{"ok":true,"database":"connected"}`. It needs these repository secrets (Settings, Secrets and variables, Actions), and skips with a notice until the first two exist:

| Secret | What it is |
|---|---|
| `CLOUDFLARE_API_TOKEN` | API token with "Edit Cloudflare Workers" on the GradLink account |
| `CLOUDFLARE_ACCOUNT_ID` | That account's id |
| `NEON_MIGRATE_URL` | Optional. `gradlink_owner`'s connection string, for `npm run db:migrate` only |

A second workflow, `.github/workflows/launch-board.yml`, rebuilds `launch-board/` from `docs/checklists/` whenever a checklist changes on `main`, when a pull request opens, changes or closes, and every 6 hours.

Deploy from `main` only: `npm run deploy` from a branch replaces the whole live site with that branch. Use `npm run upload` for a preview version. Plain `next build` and `wrangler deploy` do not work, because the Worker is the OpenNext output in `.open-next/`.

Stripe webhook endpoint: `https://<your-worker-url>/api/stripe/webhook` (events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`).

Free-plan notes: the Worker bundle is about 2.5 MiB gzipped (2,490 KiB on 2026-10-15) against the 3 MiB limit. Check the `Total Upload … gzip` line when adding dependencies. Share images are static PNGs for this reason (`docs/brand/README.md`).

## Data model

A user's **account id is their profile id**, and role rows (`students`, `companies`, `colleges`, `alumni`) are keyed by that same id. Every ownership check is a direct comparison against the signed-in session's profile id.

```
profiles  auth_credentials  password_reset_tokens  email_verification_tokens
students  companies  colleges  alumni          (keyed by profile id)
student_courses  student_scores  student_certificates
events ── event_codes, event_registrations, scans, shortlists,
          student_event_analytics, event_sessions, session_bookings,
          saved_companies, applications, interview_invites, offers, booth_queue
messages  notifications  checklist_items ── checklist_progress
subscriptions  orders  college_domains  rate_limits  app_errors
qr_codes (legacy, preserved)
```

All 34 tables are defined in `db/schema.sql`. Ids are `text` holding UUIDs; printed QR codes and `/scan/...` links carry them.

All browser data access goes through `lib/db.ts`, `lib/events.ts` and `lib/billing.ts`, which call `/api/rpc`. Auth goes through `lib/auth.ts`. Components should not call `fetch('/api/…')` directly.

## Access rules

Enforced in the Worker (`lib/server/rpc.ts`), not the browser:

- Every operation needs a signed-in account.
- Writes are owner-only and checked against the account's role.
- Event data (attendees, scans, shortlists, analytics) is visible only to people registered for that event, and whole-event views only to its staff.
- Shortlist notes stay with the company that wrote them.
- Messages are readable only by their two participants.
- `subscriptions` is readable by its owner and writable only by the Stripe webhook, so a paid plan cannot be forged from the browser.

Open items are tracked in `docs/checklists/security.md`.

## Contributors

| Contributor | Role |
|---|---|
| [@divitkej](https://github.com/divitkej) | Creator and maintainer |
| [@BharatGupta09](https://github.com/BharatGupta09) | Contributor: Neon and Cloudflare Workers migration, review fixes, outcome features, new owner accounts and deploys |
