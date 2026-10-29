# Launch checklist

Scope: hosting, database, email, domain and the legal pages needed before GradLink is announced publicly.

GradLink runs on Free plans: the `gradlink` Worker moves back to the owner's own Cloudflare account, the one serving `https://gradlink.divitkej.workers.dev` and the `gradleap.online` zone. It uses that account's own database, the Neon project `Gradlink` (`plain-tooth-17985241`, Singapore). The copy at `https://gradlink.bharatg0904.workers.dev` and its Neon project `round-sun-26602992` are left as they are; nothing in this repo points at them any more.

## Progress: 10 / 14 done

## Hosting and database

- [x] **Neon project and tables created.** Project `gradlink` in the owner's Neon organisation (Free plan), in Singapore as the Privacy Policy says, branch `production`, database `gradlink`. `npm run db:migrate` applied `db/schema.sql` (34 tables) and a second run changed nothing. It started empty: nothing was copied from the previous owner's database.
  `db/schema.sql` · Done on 2026-10-15, no commit (database change)
- [x] **Worker points at the owner's KV namespace.** `UPLOADS` is bound to `UPLOADS` (`c980a363...`) in the divitkej account. Files uploaded to the bharatg0904 copy's `gradlink-UPLOADS` namespace are not copied over.
  `wrangler.jsonc` · Done in "Move the Worker back to the divitkej Cloudflare account"
- [x] **Tested on the Workers runtime against the new database.** The OpenNext build ran in `wrangler dev` (workerd) against the new Neon project as the least-privilege role: 144 API checks passed (every public page, the five account types, event codes, QR scan keys, scans, messages, interviews, offers, sessions and waitlist, booth queue, uploads and who may open them, Coursera, Credly, LeetCode and Codeforces lookups, owner pages, sign-out, password change) and 9 Stripe webhook checks passed (unsigned, forged and stale deliveries refused; signed ones move a college to Pro and back). Every test row was deleted afterwards.
  Done on 2026-10-15, no commit (test run)
- [ ] **Point deploys and secrets at the divitkej account.** Owner action. In GitHub (Settings, Secrets and variables, Actions) replace `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` with a token and id from the divitkej account; the token needs Workers Scripts edit, Workers KV edit, and Zone DNS edit plus Workers Routes edit on `gradleap.online`. The divitkej `gradlink` Worker already has `ADMIN_EMAILS`, `AUTH_SECRET` and `DATABASE_URL`. By decision its `DATABASE_URL` stays as it is, on the owner's own Neon project `Gradlink` (`plain-tooth-17985241`), not the bharatg0904 copy's data; `db/schema.sql` was applied there on 2026-10-29 (adds `alumni` and `offers`) after a backup branch `backup-before-gradleap-2026-10-29`. That project has only the `neondb_owner` role, so the Worker's `DATABASE_URL` is most likely the owner role: create `gradlink_app` there (README.md, Neon) and switch the secret to it. Add any other secret from README.md (Cloudflare) the site needs, such as Stripe.
- [ ] **Verify live.** After the first deploy, `https://gradleap.online/api/health` answers `{"ok":true,"database":"connected"}`, the public pages return 200, and one test account signs up, signs in and is deleted again.
- [x] **Only Neon and Cloudflare in the repo.** Every file, script, setting and mention of earlier hosts removed, along with the old data export that was never imported into Neon.
  Done in "Remove Vercel, Supabase and Firebase leftovers"
- [x] **Cloudflare GitHub builds fail on every commit.** The previous owner's `gradlink` Worker is connected to this repo through Cloudflare Workers Builds, and every build since PR #5 has failed; its logs are in that account, which this project no longer uses. Deploys to the new Worker now run from GitHub Actions instead, the same way the owner's other Workers deploy: typecheck and lint, `npm run db:migrate`, `npm run deploy`, then wait for `/api/health` to report the database connected. The job skips with a notice until the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets exist. The previous owner can disconnect the old Worker's Workers Builds so commits stop starting failed builds there.
  `.github/workflows/deploy.yml`, `app/api/health/route.ts` · Done in "Deploy from main with GitHub Actions and add a health check"

## Domain and email

- [ ] **Custom domain.** `gradleap.online` is registered at Hostinger and its nameservers already point at Cloudflare (`celeste` and `david.ns.cloudflare.com`). The repo side is done in "Serve GradLink on gradleap.online": `wrangler.jsonc` attaches `gradleap.online` and `www.gradleap.online` to the `gradlink` Worker on deploy, `APP_URL`, the `SITE_URL` fallback and the deploy health check use it, and www and the workers.dev address redirect to it (`next.config.ts`). The zone is active in the divitkej Cloudflare account, the same account as the Worker. Still open, owner action before merging: in Cloudflare DNS delete the parked-page `A gradleap.online 2.57.91.91` record and the `CNAME www` record (keep the Hostinger MX, SPF, DMARC, DKIM, autoconfig and autodiscover records), and finish the item above. Then merge to main and check `https://gradleap.online/api/health`.
  `wrangler.jsonc`, `lib/site.ts`, `next.config.ts`, `.github/workflows/deploy.yml`
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
