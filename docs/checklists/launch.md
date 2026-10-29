# Launch checklist

Scope: hosting, database, email, domain and the legal pages needed before GradLeap is announced publicly.

GradLeap runs on Free plans: the `gradlink` Worker moves back to the owner's own Cloudflare account, the one serving `https://gradlink.divitkej.workers.dev` and the `gradleap.online` zone. It uses that account's own database, the Neon project `Gradlink` (`plain-tooth-17985241`, Singapore). The copy at `https://gradlink.bharatg0904.workers.dev` and its Neon project `round-sun-26602992` are left as they are; nothing in this repo points at them any more.

## Progress: 12 / 15 done

## Hosting and database

- [x] **Neon project and tables created.** Project `gradlink` in the owner's Neon organisation (Free plan), in Singapore as the Privacy Policy says, branch `production`, database `gradlink`. `npm run db:migrate` applied `db/schema.sql` (34 tables) and a second run changed nothing. It started empty: nothing was copied from the previous owner's database.
  `db/schema.sql` · Done on 2026-10-15, no commit (database change)
- [x] **Worker points at the owner's KV namespace.** `UPLOADS` is bound to `UPLOADS` (`c980a363...`) in the divitkej account. Files uploaded to the bharatg0904 copy's `gradlink-UPLOADS` namespace are not copied over.
  `wrangler.jsonc` · Done in "Move the Worker back to the divitkej Cloudflare account"
- [x] **Tested on the Workers runtime against the new database.** The OpenNext build ran in `wrangler dev` (workerd) against the new Neon project as the least-privilege role: 144 API checks passed (every public page, the five account types, event codes, QR scan keys, scans, messages, interviews, offers, sessions and waitlist, booth queue, uploads and who may open them, Coursera, Credly, LeetCode and Codeforces lookups, owner pages, sign-out, password change) and 9 Stripe webhook checks passed (unsigned, forged and stale deliveries refused; signed ones move a college to Pro and back). Every test row was deleted afterwards.
  Done on 2026-10-15, no commit (test run)
- [x] **Point deploys and secrets at the divitkej account.** `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in GitHub Actions are the divitkej account's, `NEON_MIGRATE_URL` is removed, and the account's Workers Builds connection is disconnected, so GitHub Actions is the only deployer. By decision the Worker's `DATABASE_URL` stays on the owner's own Neon project `Gradlink` (`plain-tooth-17985241`), not the bharatg0904 copy's data; `db/schema.sql` was applied there on 2026-10-29 (adds `alumni` and `offers`) after a backup branch `backup-before-gradleap-2026-10-29`. Deploy run 4 on 2026-10-29 deployed to this account and its health check passed.
  Done in "Move the Worker back to the divitkej Cloudflare account"
- [ ] **Least-privilege database role.** The `Gradlink` project has only the `neondb_owner` role, so the Worker's `DATABASE_URL` is most likely the owner role. Create `gradlink_app` there (README.md, Neon), switch the secret to it with `npx wrangler secret put DATABASE_URL`, and add any other secret from README.md (Cloudflare) the site needs, such as Stripe.
- [ ] **Verify live.** After the first deploy, `https://gradleap.online/api/health` answers `{"ok":true,"database":"connected"}`, the public pages return 200, and one test account signs up, signs in and is deleted again.
- [x] **Only Neon and Cloudflare in the repo.** Every file, script, setting and mention of earlier hosts removed, along with the old data export that was never imported into Neon.
  Done in "Remove Vercel, Supabase and Firebase leftovers"
- [x] **Cloudflare GitHub builds fail on every commit.** The previous owner's `gradlink` Worker is connected to this repo through Cloudflare Workers Builds, and every build since PR #5 has failed; its logs are in that account, which this project no longer uses. Deploys to the new Worker now run from GitHub Actions instead, the same way the owner's other Workers deploy: typecheck and lint, `npm run db:migrate`, `npm run deploy`, then wait for `/api/health` to report the database connected. The job skips with a notice until the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets exist. Now that the site deploys to the divitkej `gradlink` Worker again, its Workers Builds connection is still on and still fails within a second on every push ("Workers Builds: gradlink" on PR #49), so GitHub Actions and Workers Builds would both have deployed the same Worker. The owner disconnected it on 2026-10-29 (Workers & Pages, `gradlink`, Settings, Build).
  `.github/workflows/deploy.yml`, `app/api/health/route.ts` · Done in "Deploy from main with GitHub Actions and add a health check"

## Domain and email

- [x] **Custom domain.** `gradleap.online` (registered at Hostinger, nameservers on Cloudflare, zone in the divitkej account) is attached to the `gradlink` Worker with `www.gradleap.online`. The parked-page `A` and `CNAME www` records were deleted and the Hostinger mail records kept. `APP_URL`, the `SITE_URL` fallback and the deploy health check use it, and www and `gradlink.divitkej.workers.dev` redirect to it. Live on 2026-10-29: home, Privacy, Terms, sitemap and `icon.svg` return 200 and `/api/health` reports the database connected.
  `wrangler.jsonc`, `lib/site.ts`, `next.config.ts`, `.github/workflows/deploy.yml` · Done in "Serve GradLink on gradleap.online" and "Fix the www home page redirect and keep workers.dev redirecting"
- [ ] **Account email: confirm email and password reset.** Built and tested (`lib/server/smtp.ts`, `lib/server/mail.ts`, `/verify-email`): sign-up emails a confirm link and sign-in waits for it, and "Forgot password" emails a reset link. Sending through `divitkej@gmail.com` is paused by decision, so no sender is configured: accounts are confirmed on creation and "Forgot password" says it is not set up. To turn it on, pick a sender (a dedicated Gmail with an app password as `SMTP_USER` + `SMTP_PASS`, or Resend once the domain exists), then add it to the Privacy Policy's list of services.
  Done in "Send account email through Gmail and require email confirmation" · Paused in "Pause account email from the personal Gmail"

## Legal and claims

- [x] **Privacy Policy page.** Written from what the app stores and who can read it (`db/schema.sql`, `lib/server/rpc.ts`, `lib/server/files.ts`), under the UAE Personal Data Protection Law. Operator Divit Kejriwal, Dubai. Linked from the footer and sitemap. When the domain is live, change `OPERATOR.email` in `lib/site.ts` to an address on it.
  `app/privacy/page.tsx`, `components/legal/PrivacyPolicy.tsx` · Done in "Add Privacy Policy and Terms pages" · Brought in line with later features (verified achievements and the sites that check them, scores, applications, who can see what, browser storage) in "Bring the Privacy Policy in line with what the app does"
- [x] **Terms and Conditions page.** Covers accounts, acceptable use, employer use of student data, Placement Pro billing (AED 3,600 per campus per year, cancel by email, no refunds except as stated), liability cap and Dubai law. Not reviewed by a lawyer: get a one-off review before taking the first payment.
  `app/terms/page.tsx`, `components/legal/TermsOfService.tsx` · Done in "Add Privacy Policy and Terms pages"
- [x] **"UAE data residency" claim removed.** Data sits in Singapore and Neon has no UAE region. The chip now reads "Free for students and employers", which matches the pricing page.
  `components/landing/CTASection.tsx` · Done in "Add Privacy Policy and Terms pages"
- [x] **Unregistered company name removed.** Footer now reads "© GradLeap".
  `components/site/Footer.tsx` · Done in "Drop the unregistered company name from the footer"
- [x] **Favicon.** `app/icon.svg` and `app/apple-icon.png` served live. The G mark read as a monochrome Google logo, so the logo, favicon, home-screen icon and share images now use a graduation cap whose tassel ends in a dot.
  `components/Logo.tsx`, `app/icon.svg`, `docs/brand/` · Done in "Replace the G logo with a graduation cap"
