# Launch checklist

Scope: hosting, database, email, domain and the legal pages needed before GradLink is announced publicly.

Live now at `https://gradlink.divitkej.workers.dev` (Cloudflare Workers Free, Neon Free, region `aws-ap-southeast-1`).

## Progress: 7 / 13 done

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
- [ ] **Old Vercel site still live.** `https://gradlink-theta.vercel.app` returns 200. Delete the project in the Vercel dashboard (no repo access to it).
  Owner action

## Domain and email

- [ ] **Custom domain.** Add the domain to Cloudflare, then attach it to the `gradlink` Worker, set `APP_URL` in `wrangler.jsonc` and rebuild with `NEXT_PUBLIC_SITE_URL` set to it.
  Owner action, then `wrangler.jsonc`
- [ ] **Password reset email.** Neon side is ready. Needs the domain verified in Resend, then `RESEND_API_KEY` and `EMAIL_FROM` set as Worker secrets. Until then "Forgot password" says it is not set up.
  `lib/server/mail.ts` · Blocked on the domain

## Legal and claims

- [ ] **Privacy Policy page.** Must cover the data in `db/schema.sql`, who sees student profiles, Stripe, Neon and Cloudflare as processors, the 30-day sign-in cookie and how to request deletion (UAE Federal Decree-Law 45 of 2021). Needs the operator's name, a contact email on the domain and the city.
  `app/privacy/page.tsx` (to create) · Waiting on the domain
- [ ] **Terms and Conditions page.** Needs the same three details.
  `app/terms/page.tsx` (to create) · Waiting on the domain
- [ ] **"UAE data residency" claim is false.** Data sits in Singapore and Neon has no UAE region. Reword or remove.
  `components/landing/CTASection.tsx` · Waiting on a decision
- [x] **Unregistered company name removed.** Footer now reads "© GradLink".
  `components/site/Footer.tsx` · Done in "Drop the unregistered company name from the footer"
- [x] **Favicon.** `app/icon.svg` and `app/apple-icon.png` served live.
  Done before this checklist
