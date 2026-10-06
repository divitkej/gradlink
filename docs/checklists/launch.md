# Launch checklist

Scope: hosting, database, email, domain and the legal pages needed before GradLink is announced publicly.

Live now at `https://gradlink.divitkej.workers.dev` (Cloudflare Workers Free, Neon Free, region `aws-ap-southeast-1`).

## Progress: 10 / 15 done

## Hosting and database

- [x] **Neon tables created.** `npm run db:migrate` applied `db/schema.sql`: 17 tables including `password_reset_tokens`. No old data imported (by decision).
  `db/schema.sql` · Done on 2026-09-27, no commit (database change)
- [x] **Worker points at the real KV namespace.** `UPLOADS` binding set to the namespace created in the GradLink Cloudflare account.
  `wrangler.jsonc` · Done in "Point the UPLOADS binding at the real KV namespace"
- [x] **Worker secrets set.** `AUTH_SECRET` and `DATABASE_URL` (Neon pooled string) are Worker secrets.
  Done on 2026-09-27, no commit (Cloudflare setting)
- [x] **Deployed and tested live.** All public pages, robots.txt, sitemap and favicon return 200. A test student account signed up, held a session and signed in against Neon, then was deleted.
  Done on 2026-09-27 with `NEXT_PUBLIC_SITE_URL=https://gradlink.divitkej.workers.dev npm run deploy`
- [x] **Vercel removed from the repo.** Starter SVGs in `public/` and the `.vercel` ignore entry deleted.
  Done in "Remove leftover Vercel starter files and ignore entry"
- [ ] **Cloudflare GitHub builds fail on every commit.** The Worker is connected to this repo in Cloudflare (Workers Builds) and every build since PR #5 opened has failed; the live site is unaffected because it was deployed with `npm run deploy`. In the dashboard (Workers, gradlink, Settings, Build) set the build command to `npx opennextjs-cloudflare build` and the deploy command to `npx opennextjs-cloudflare deploy`, or disconnect the repo. The API token cannot read build logs, so the exact error is unconfirmed.
  Owner action
- [ ] **Old Vercel site still live.** `https://gradlink-theta.vercel.app` returns 200. Delete the project in the Vercel dashboard (no repo access to it).
  Owner action

## Domain and email

- [ ] **Custom domain.** Add the domain to Cloudflare, then attach it to the `gradlink` Worker, set `APP_URL` in `wrangler.jsonc` and change the `SITE_URL` fallback in `lib/site.ts` to it.
  Owner action, then `wrangler.jsonc`
- [ ] **Account email: confirm email and password reset.** Built and tested (`lib/server/smtp.ts`, `lib/server/mail.ts`, `/verify-email`): sign-up emails a confirm link and sign-in waits for it, and "Forgot password" emails a reset link. Sending through `divitkej@gmail.com` is paused by decision, so no sender is configured: accounts are confirmed on creation and "Forgot password" says it is not set up. To turn it on, pick a sender (a dedicated Gmail with an app password as `SMTP_USER` + `SMTP_PASS`, or Resend once the domain exists), then add it to the Privacy Policy's list of services.
  Done in "Send account email through Gmail and require email confirmation" · Paused in "Pause account email from the personal Gmail"

- [ ] **Remove the test accounts.** `admin1@example.com`, `student1@example.com`, `college1@example.com` and `employer1@example.com` share one known password and exist only for the test pass. Delete them, and take `admin1@example.com` out of `ADMIN_EMAILS`, before the public launch. They are created by `npm run db:seed-test-users` (`scripts/seed-test-users.mjs`).
  `scripts/seed-test-users.mjs` · Owner action

## Legal and claims

- [x] **Privacy Policy page.** Written from what the app stores and who can read it (`db/schema.sql`, `lib/server/rpc.ts`, `lib/server/files.ts`), under the UAE Personal Data Protection Law. Operator Divit Kejriwal, Dubai. Linked from the footer and sitemap. When the domain is live, change `OPERATOR.email` in `lib/site.ts` to an address on it.
  `app/privacy/page.tsx`, `components/legal/PrivacyPolicy.tsx` · Done in "Add Privacy Policy and Terms pages"
- [x] **Terms and Conditions page.** Covers accounts, acceptable use, employer use of student data, Placement Pro billing (AED 3,600 per campus per year, cancel by email, no refunds except as stated), liability cap and Dubai law. Not reviewed by a lawyer: get a one-off review before taking the first payment.
  `app/terms/page.tsx`, `components/legal/TermsOfService.tsx` · Done in "Add Privacy Policy and Terms pages"
- [x] **"UAE data residency" claim removed.** Data sits in Singapore and Neon has no UAE region. The chip now reads "Free for students and employers", which matches the pricing page.
  `components/landing/CTASection.tsx` · Done in "Add Privacy Policy and Terms pages"
- [x] **Unregistered company name removed.** Footer now reads "© GradLink".
  `components/site/Footer.tsx` · Done in "Drop the unregistered company name from the footer"
- [x] **Favicon.** `app/icon.svg` and `app/apple-icon.png` served live. The G mark read as a monochrome Google logo, so the logo, favicon, home-screen icon and share images now use a graduation cap whose tassel ends in a dot.
  `components/Logo.tsx`, `app/icon.svg`, `docs/brand/` · Done in "Replace the G logo with a graduation cap"
