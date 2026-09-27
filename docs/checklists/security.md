# Security checklist

Scope: the API routes (`app/api/`), server code (`lib/server/`), the database schema (`db/schema.sql`) and the response headers in `next.config.ts`.

Update this file in the same commit as the fix.

## Fixed in code

- [x] **Event data was readable by any signed-in account.** Attendee lists (with emails), scans, shortlists, analytics and events are now limited to people registered for that event. Whole-event views are limited to its staff (the owner, or a college account registered for it). `lib/server/rpc.ts` · Done in "Lock down the data API, uploads and response headers"
- [x] **Private shortlist notes leaked.** Any user could read any company's shortlists and notes. Notes are now visible to the company and event staff only; students see their status without notes. `lib/server/rpc.ts` · Done in "Lock down the data API, uploads and response headers"
- [x] **Students could set their own résumé score.** `resume_score` and `ai_feedback` are no longer writable from the browser. `lib/server/rpc.ts` · Done in "Lock down the data API, uploads and response headers"
- [x] **Role checks on writes.** Only students edit student profiles, only companies edit company profiles and shortlist, scans record the account's real role, and messages need both people at the same event. `lib/server/rpc.ts` · Done in "Lock down the data API, uploads and response headers"
- [x] **Unsafe links in profiles.** Profile, website, logo, résumé and brochure links must be http(s). `lib/server/rpc.ts` · Done in "Lock down the data API, uploads and response headers"
- [x] **Fellow students saw each other's emails.** Students now see other students without contact details. `lib/server/rpc.ts` · Done in "Lock down the data API, uploads and response headers"
- [x] **Uploads accepted any file type.** Résumés take .pdf, .doc, .docx; brochures .pdf; logos and avatars images only. The stored type comes from the extension, not the browser. `lib/server/files.ts` · Done in "Lock down the data API, uploads and response headers"
- [x] **No security headers.** Added Content-Security-Policy, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy (camera for the scanner only) and COOP. Removed `X-Powered-By`. `next.config.ts` · Done in "Lock down the data API, uploads and response headers"
- [x] **Third-party script loaded at runtime.** The unused `components/ui/shader-lines.tsx` pulled three.js from a CDN; deleted. · Done in "Lock down the data API, uploads and response headers"
- [x] **Checkout trusted request data.** Now same-origin only, uses the account's own email, and returns to `APP_URL` instead of the request's Origin header. `app/api/checkout/route.ts` · Done in "Lock down the data API, uploads and response headers"
- [x] **No per-IP limit on the auth endpoints.** Per IP: 30 wrong passwords per 15 minutes (correct sign-ins never count), 50 sign-ups per hour, 10 reset emails per hour, 30 reset-link checks per 15 minutes. Limits are generous because a whole campus can share one Wi-Fi address. Counters live in Postgres with hashed IPs, because WAF rules cannot attach to a workers.dev address. `lib/server/rate-limit.ts` · Done in "Rate-limit sign-in, sign-up and password reset per IP"
- [x] **Sign-in timing revealed which emails have accounts.** Unknown emails now take the same hashing time. `lib/server/auth-api.ts` · Done in "Lock down the data API, uploads and response headers"

## Already sound (checked, no change needed)

- Every SQL query is parameterised; dynamic column names come from fixed allowlists.
- Passwords: PBKDF2-SHA256 with per-user salt, constant-time compare, lockout after 10 failures.
- Sessions: HttpOnly, SameSite=Lax, Secure on https, signed, revoked on password change.
- Reset tokens: random, stored only as SHA-256, single use, expire in 60 minutes, 3 per hour.
- Cross-site requests to the API are refused (Origin check plus JSON-only bodies).
- Stripe webhook verifies its signature and is the only writer of `subscriptions`.
- No secrets in the repository or its git history; `.dev.vars` and `.env*` are ignored.

## Needs doing outside the code (before launch)

- [ ] **Set `APP_URL`** in `wrangler.jsonc` to the custom domain. Reset emails, upload links and Stripe return URLs use it.
- [ ] **Run `npm run db:migrate`** against production Neon to create the `rate_limits` table. Until it exists the per-IP limits are skipped and the Worker logs a warning.
- [ ] **Optional, after the custom domain is connected:** add a Cloudflare WAF rate limiting rule on `/api/auth/*` as a second layer. WAF rules attach to your own domain, so they cannot cover the workers.dev address.
- [ ] **Least-privilege database role.** In Neon, create a role with only select, insert, update, delete on the app tables and use it for `DATABASE_URL`, instead of the owner role. Keep the owner role for `npm run db:migrate` only.
- [ ] **Backups.** Confirm Neon's restore window covers at least 7 days.
- [ ] **Secrets.** Confirm `AUTH_SECRET` is 32+ random characters and differs between local and production. Use Stripe live keys only in production.
- [ ] **Account verification.** Anyone can sign up as a company or college and email is not verified. Decide whether college and company accounts need approval before they can create or join events.
- [ ] **Verify live:** after deploy, check the headers with https://securityheaders.com and test the QR scanner camera on a phone.
