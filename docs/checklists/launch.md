# Launch checklist

Scope: hosting, database, email, domain and the legal pages needed before GradLink is announced publicly.

Live now at `https://gradlink.divitkej.workers.dev` (Cloudflare Workers Free, Neon Free, region `aws-ap-southeast-1`).

## Progress: 10 / 14 done

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
- [ ] **Account email: confirm email and password reset.** Built without a domain: the Worker sends through `divitkej@gmail.com` over SMTP (`lib/server/smtp.ts`, about 500 emails a day). Sign-up now emails a confirm link and sign-in is refused until it is opened (`/verify-email`); a completed password reset also confirms the email. Tested end to end on the Workers runtime against a local mail server, including resend, single-use and superseded links, and a Gmail-style login refusal. Left: create a Gmail app password and set it with `npx wrangler secret put SMTP_PASS` (or in the dashboard as a secret). Until then accounts are confirmed on creation and "Forgot password" says it is not set up. Then send one real reset to confirm Gmail accepts it.
  `lib/server/auth-api.ts`, `lib/server/mail.ts`, `components/gradlink/VerifyEmail.tsx` · Done in "Send account email through Gmail and require email confirmation", waiting on the app password

## Legal and claims

- [x] **Privacy Policy page.** Written from what the app stores and who can read it (`db/schema.sql`, `lib/server/rpc.ts`, `lib/server/files.ts`), under the UAE Personal Data Protection Law. Operator Divit Kejriwal, Dubai. Linked from the footer and sitemap. When the domain is live, change `OPERATOR.email` in `lib/site.ts` to an address on it.
  `app/privacy/page.tsx`, `components/legal/PrivacyPolicy.tsx` · Done in "Add Privacy Policy and Terms pages"
- [x] **Terms and Conditions page.** Covers accounts, acceptable use, employer use of student data, Placement Pro billing (AED 3,600 per campus per year, cancel by email, no refunds except as stated), liability cap and Dubai law. Not reviewed by a lawyer: get a one-off review before taking the first payment.
  `app/terms/page.tsx`, `components/legal/TermsOfService.tsx` · Done in "Add Privacy Policy and Terms pages"
- [x] **"UAE data residency" claim removed.** Data sits in Singapore and Neon has no UAE region. The chip now reads "Free for students and employers", which matches the pricing page.
  `components/landing/CTASection.tsx` · Done in "Add Privacy Policy and Terms pages"
- [x] **Unregistered company name removed.** Footer now reads "© GradLink".
  `components/site/Footer.tsx` · Done in "Drop the unregistered company name from the footer"
- [x] **Favicon.** `app/icon.svg` and `app/apple-icon.png` served live.
  Done before this checklist
