# Launch checklist

Scope: hosting, database, email, domain and the legal pages needed before GradLink is announced publicly.

GradLink now runs on the new owner's accounts, both on Free plans: the Neon project `gradlink` (id `round-sun-26602992`, region `aws-ap-southeast-1`, Singapore) and the `gradlink` Worker at `https://gradlink.bharatg0904.workers.dev`. The earlier site at `https://gradlink.divitkej.workers.dev` runs on the previous owner's Neon and Cloudflare accounts; nothing in this repo points at those any more, and they were not read, changed or deleted.

## Progress: 9 / 14 done

## Hosting and database

- [x] **Neon project and tables created.** Project `gradlink` in the owner's Neon organisation (Free plan), in Singapore as the Privacy Policy says, branch `production`, database `gradlink`. `npm run db:migrate` applied `db/schema.sql` (34 tables) and a second run changed nothing. It started empty: nothing was copied from the previous owner's database.
  `db/schema.sql` · Done on 2026-10-15, no commit (database change)
- [x] **Worker points at the new KV namespace.** `UPLOADS` is bound to `gradlink-UPLOADS`, created in the owner's Cloudflare account.
  `wrangler.jsonc` · Done in "Move GradLink to the new owner's Neon project and Cloudflare account"
- [x] **Tested on the Workers runtime against the new database.** The OpenNext build ran in `wrangler dev` (workerd) against the new Neon project as the least-privilege role: 144 API checks passed (every public page, the five account types, event codes, QR scan keys, scans, messages, interviews, offers, sessions and waitlist, booth queue, uploads and who may open them, Coursera, Credly, LeetCode and Codeforces lookups, owner pages, sign-out, password change) and 9 Stripe webhook checks passed (unsigned, forged and stale deliveries refused; signed ones move a college to Pro and back). Every test row was deleted afterwards.
  Done on 2026-10-15, no commit (test run)
- [ ] **Create the Worker and set its secrets.** Owner action: this needs a Cloudflare API token, which no tool in the setup session had. Either add the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets and let the Deploy workflow run, or run `npx wrangler login` and `npm run deploy` on your own machine. Then set the secrets listed in README.md (Cloudflare): `DATABASE_URL` must be the `gradlink_app` role's pooled connection string, not the owner role's, and `AUTH_SECRET` a new random value.
- [ ] **Verify live.** After the first deploy, `https://gradlink.bharatg0904.workers.dev/api/health` answers `{"ok":true,"database":"connected"}`, the public pages return 200, and one test account signs up, signs in and is deleted again.
- [x] **Only Neon and Cloudflare in the repo.** Every file, script, setting and mention of earlier hosts removed, along with the old data export that was never imported into Neon.
  Done in "Remove Vercel, Supabase and Firebase leftovers"
- [ ] **Cloudflare GitHub builds fail on every commit.** The Worker is connected to this repo in Cloudflare (Workers Builds) and every build since PR #5 opened has failed; the live site is unaffected because it was deployed with `npm run deploy`. In the dashboard (Workers, gradlink, Settings, Build) set the build command to `npx opennextjs-cloudflare build` and the deploy command to `npx opennextjs-cloudflare deploy`, or disconnect the repo. The API token cannot read build logs, so the exact error is unconfirmed.
  Owner action

## Domain and email

- [ ] **Custom domain.** Add the domain to Cloudflare, then attach it to the `gradlink` Worker, set `APP_URL` in `wrangler.jsonc` and change the `SITE_URL` fallback in `lib/site.ts` to it.
  Owner action, then `wrangler.jsonc`
- [ ] **Account email: confirm email and password reset.** Built and tested (`lib/server/smtp.ts`, `lib/server/mail.ts`, `/verify-email`): sign-up emails a confirm link and sign-in waits for it, and "Forgot password" emails a reset link. Sending through `divitkej@gmail.com` is paused by decision, so no sender is configured: accounts are confirmed on creation and "Forgot password" says it is not set up. To turn it on, pick a sender (a dedicated Gmail with an app password as `SMTP_USER` + `SMTP_PASS`, or Resend once the domain exists), then add it to the Privacy Policy's list of services.
  Done in "Send account email through Gmail and require email confirmation" · Paused in "Pause account email from the personal Gmail"

## Legal and claims

- [x] **Privacy Policy page.** Written from what the app stores and who can read it (`db/schema.sql`, `lib/server/rpc.ts`, `lib/server/files.ts`), under the UAE Personal Data Protection Law. Operator Divit Kejriwal, Dubai. Linked from the footer and sitemap. When the domain is live, change `OPERATOR.email` in `lib/site.ts` to an address on it.
  `app/privacy/page.tsx`, `components/legal/PrivacyPolicy.tsx` · Done in "Add Privacy Policy and Terms pages" · Brought in line with later features (verified achievements and the sites that check them, scores, applications, who can see what, browser storage) in "Bring the Privacy Policy in line with what the app does"
- [x] **Terms and Conditions page.** Covers accounts, acceptable use, employer use of student data, Placement Pro billing (AED 3,600 per campus per year, cancel by email, no refunds except as stated), liability cap and Dubai law. Not reviewed by a lawyer: get a one-off review before taking the first payment.
  `app/terms/page.tsx`, `components/legal/TermsOfService.tsx` · Done in "Add Privacy Policy and Terms pages"
- [x] **"UAE data residency" claim removed.** Data sits in Singapore and Neon has no UAE region. The chip now reads "Free for students and employers", which matches the pricing page.
  `components/landing/CTASection.tsx` · Done in "Add Privacy Policy and Terms pages"
- [x] **Unregistered company name removed.** Footer now reads "© GradLink".
  `components/site/Footer.tsx` · Done in "Drop the unregistered company name from the footer"
- [x] **Favicon.** `app/icon.svg` and `app/apple-icon.png` served live. The G mark read as a monochrome Google logo, so the logo, favicon, home-screen icon and share images now use a graduation cap whose tassel ends in a dot.
  `components/Logo.tsx`, `app/icon.svg`, `docs/brand/` · Done in "Replace the G logo with a graduation cap"
