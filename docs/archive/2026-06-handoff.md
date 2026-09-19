# Handoff for New Claude Code Session

> Project: **GradLink** — a career-event intelligence platform for UAE colleges.
> Live: **https://gradlink-theta.vercel.app** · Local root: `C:\Users\Administrator\Documents\claude code\gradlink`

---

## 1. Goal We Are Working Toward

**Overall product goal:** GradLink turns campus career fairs into measurable outcomes. Tagline: *"Prepare students. Connect employers. Track outcomes."* Three roles use it:
- **Students** — build a profile, get an AI résumé score, show a QR at booths, scan companies, follow a checklist, message recruiters.
- **Companies** — set up a booth profile, scan student QR codes to see portfolios, shortlist/note/message candidates, pre-shortlist before the event.
- **Event managers** (a.k.a. "College / Event host") — run the event, see live scan analytics, readiness, employer engagement, and outcome reports.

**Current milestone:** The product has been taken from a "demo with fake personas" to a **real, working website**. The most recent work (this session's tail) added:
- Role-locked accounts (no switching between roles on one account).
- Real sign-up/sign-in that creates each user's own profile + data.
- Editable profiles with **real file upload** (résumé / brochure via Supabase Storage).
- AI résumé score **gated to 0** until a résumé is attached.
- An **auto-completing checklist** that reflects real student/company activity.
- A two-way **interactive messaging** inbox (reply to conversations).
- A **forgot-password** flow (Supabase reset email + `/reset-password` page).
- A **universal camera QR scanner** (works on iPhone Safari via jsQR, not just Chrome).
- **GSAP animations** (staggered reveals, scroll progress bar, hero parallax, magnetic buttons).
- Branded share card (Open Graph image), favicon, and branded Supabase auth email templates.

**User requirements that matter:**
- Each account is **locked to the role it registered as** — do NOT re-add role switching.
- Fresh accounts must start from **their own empty data**, not seeded demo personas.
- "Add my logo when sharing", custom favicon — both done.
- The user repeatedly wants things **"fixed for real" and deployed**, not just explained.

**Design/UX direction:** Dark, cinematic "command-center" aesthetic. Deep navy (`#050B14`/`#071827`), teal `#00C2A8`, cyan `#35D3FF`, amber `#F7C948`. Space Grotesk (display) + DM Sans (body). Glassmorphism panels, one continuous fixed background, smooth (Lenis) scroll, framer-motion + GSAP. **Keep this look — do not introduce a different UI style or component library.**

**Technical constraints / preferences:**
- This is a **modified Next.js 16.2.7** (Turbopack). See `AGENTS.md`: "This is NOT the Next.js you know" — read `node_modules/next/dist/docs/` before relying on Next APIs.
- Styling is **inline `style={{}}` objects + CSS variables** (defined in `app/globals.css`). There is NO Tailwind usage in components despite Tailwind being installed (only `@import "tailwindcss"` in globals). Match the inline-style convention.
- Windows + PowerShell environment. Node global bin at `C:\Users\Administrator\AppData\Roaming\npm`.
- `lucide-react@1.17.0` does **NOT** export `Linkedin` or `Github` icons — use `Link as LinkIcon` instead (this has bitten the build before).
- Deploys are manual: `vercel --prod --yes` from the project root (already linked to `gradlink/gradlink`).

---

## 2. Current State of the Website/App

**Visible routes (all build clean, all return 200 except `/demo` which is intentionally gone → 404):**
- `/` — marketing landing (cinematic intro, hero, problem/why/journey sections, CTA). Has scroll-progress bar, hero parallax, magnetic CTA buttons.
- `/sign-up` — role chooser (Student / Company / College-Event host).
- `/sign-up/student`, `/sign-up/company`, `/sign-up/college` — sign-up forms (live password checklist).
- `/sign-in` — sign-in + working "Forgot password?".
- `/reset-password` — set a new password (lands here from the reset email).
- `/dashboard` — redirects to the user's role dashboard or `/sign-in`.
- `/dashboard/student`, `/dashboard/company`, `/dashboard/event-manager` — the three role dashboards.
- `/dashboard/college` — redirects to `/dashboard/event-manager` (legacy alias).
- `/dashboard/profile` — role-aware: editable **student career profile** (with résumé upload) OR **company booth profile** (with brochure upload).
- `/dashboard/messages` — **interactive two-pane chat** (inbox list + thread + reply box).
- `/dashboard/scans` — real scan history for the logged-in user.
- `/dashboard/events` — lists the real event with a link to the console.
- `/events/[eventId]` — role-aware **Event Console** (tabs: Overview / People / My QR / Checklist / Manual). Tab content animates on switch.
- `/scan` — Scanner hub: My QR + camera scan (jsQR) + tap-a-person list + paste-link.
- `/scan/student/[studentId]?eventId=…` — role-aware student scan view (company → portfolio + actions; manager → analytics/flags). Sections cascade in (GSAP).
- `/scan/company/[companyId]?eventId=…` — role-aware company scan view (student → company profile + actions; manager → company analytics).

**What works (verified in-session against the live Supabase DB):**
- Real sign-up → creates `profiles` + role row + event registration + (students) analytics; logs straight in.
- Duplicate-email sign-up → clean "already exists, please sign in" message.
- Sign-in → resolves the user's own profile (and back-fills one for older accounts).
- Role lock → a student visiting `/dashboard/company` is redirected to `/dashboard/student`.
- Real QR generation (`qrcode.react`); scanning routes to the right scan view.
- Company → student scan shows live AI résumé score; Shortlist/Maybe/Reject persists to `shortlists`.
- Student profile editor saves to `students`; uploading a résumé sets `resume_url` and unlocks the score.
- Checklist auto-completes from real signals (profile filled, résumé uploaded, scans, messages, saves) and **un-checks when the data is removed**; progress persists to `checklist_progress`.
- Messaging: reply persists to `messages` and shows in the thread.
- Manager dashboard shows live scans/registrations/analytics with "No activity yet" states.
- Forgot-password: sends a real Supabase reset request (verified the recover endpoint returns 200 for fresh emails).
- Camera scanner falls back to jsQR on browsers without `BarcodeDetector`.
- GSAP: scroll-progress bar scrubs correctly synced to Lenis; smooth scroll works; zero console errors.

**Partially functional / caveats:**
- **Password-reset email delivery** depends on Supabase config you can't set from code (Site URL + redirect allow-list) and the built-in mailer's low rate limit. The CODE works; delivery needs config (see §7).
- **Camera scanning** needs HTTPS (fine on Vercel) + camera permission; on iOS use Safari.
- Student "saved/visited companies" + personal notes on a company are stored in **localStorage**, not the DB.

**Broken/incomplete:**
- **claude-mem worker** (the memory plugin the user installed) crashes on start with `Cannot find module 'zod/v3'` — a bug inside the claude-mem plugin, not this project.
- The landing's secondary marketing sections are static (by design).

**Known console/runtime problems:** None observed in the app itself (scan views, dashboards, messages, landing all verified with zero console errors). The only failure is the external claude-mem worker.

---

## 3. Current State of the Codebase

**Tech stack:** Next.js **16.2.7** (App Router, Turbopack) · React **19.2.4** · TypeScript · Tailwind v4 installed but **unused in components** (inline styles + CSS vars instead) · framer-motion 12 · **gsap 3.15 + @gsap/react 2** · lenis 1.3 (smooth scroll) · three + @react-three/fiber (landing shaders) · **@supabase/supabase-js 2** · **qrcode.react 4** (QR gen) · **jsqr 1.4** (camera decode) · lucide-react **1.17** (NOTE: no Linkedin/Github icons).

**Folder structure:**
- `app/` — routes (see §2). `app/layout.tsx` sets fonts + metadata (OG/Twitter) + mounts the global background. `app/globals.css` holds all design tokens. `app/opengraph-image.tsx` + `app/twitter-image.tsx` generate the share card via `next/og`. `app/icon.svg` + `app/apple-icon.tsx` are the favicon/home-screen icon.
- `components/` — UI. Subfolders: `anim/` (motion + GSAP helpers), `dashboard/` (dashboards, editors, checklist, QR, cards), `gradlink/` (auth chrome, sign-in/up forms, reset), `scan/` (scanner + scan views), `ui/` (Button/Badge/etc.), plus landing sections at the top level.
- `lib/` — `supabase.ts` (client + `signUpUser`), `db.ts` (all data-access functions + types), `demo-session.ts` (the localStorage session model + roles), `resume.ts` (`evaluateResume`), `utils.ts`.
- `supabase/` — `schema.sql` (early DDL), branded email templates (`email-templates/*.html`), and helper PowerShell scripts: `apply-email-templates.ps1`, `configure-smtp.ps1`, `disable-email-confirmation.ps1`, plus `CUSTOM-SMTP.md`.

**Important components:**
- `components/dashboard/DashboardShell.tsx` — the app chrome: sidebar nav per role, top bar, **auth gate + role lock** (redirects), sign-out. No role switcher (removed on purpose).
- `components/dashboard/StudentDashboard.tsx`, `app/dashboard/company/page.tsx`, `components/dashboard/EventManagerDashboard.tsx` — the three role overviews (data-driven, with empty states).
- `components/dashboard/EventConsole.tsx` — `/events/[id]` tabs (Overview/People/QR/Checklist/Manual), People tab has pre-shortlisting + filters.
- `components/dashboard/Checklist.tsx` — auto-completing checklist (student + company auto rules; tri-state managed items).
- `components/dashboard/StudentProfileEditor.tsx` / `CompanyProfileEditor.tsx` — editable profiles + file upload.
- `components/dashboard/QRCard.tsx` — real QR (download/share).
- `components/dashboard/cards.tsx` — shared primitives (SectionCard, StatTile, ScoreRing, FlagPill, Avatar, MeterBar, LoadingBlock, etc.).
- `components/scan/Scanner.tsx`, `StudentScanView.tsx`, `CompanyScanView.tsx`, `ViewerGate.tsx`, `ScanLayout.tsx` — the scan system.
- `components/anim/GsapReveal.tsx`, `Magnetic.tsx`, `ScrollProgress.tsx`, `ScrollSync.tsx` — the GSAP helpers added this session.
- `components/gradlink/GradLinkSignIn.tsx`, `SignUpForm.tsx`, `ResetPassword.tsx`, `AuthShell.tsx`, `PasswordChecklist.tsx` — auth.

**Styling approach:** Inline `style={{}}` + CSS variables from `app/globals.css` (`--bg`, `--teal`, `--cyan`, `--amber`, `--glass`, `--border`, `--r-md`, `--font-display`, etc.). Responsive handled via small inline `<style>` blocks with media queries. **Do not switch to Tailwind classes or shadcn.**

**Backend / DB / Auth (Supabase):**
- Project ref: **`dtagbttabqslphxlanel`** (URL `https://dtagbttabqslphxlanel.supabase.co`). A Supabase MCP server is connected (tools `mcp__dc00cd85-...__*`).
- Tables (public): `profiles`, `students`, `companies`, `colleges`, `events`, `event_registrations`, `qr_codes`, `scans`, `shortlists`, `messages`, `student_event_analytics`, `checklist_items`, `checklist_progress`.
- **RLS is demo-grade**: anon can read/write the event tables (so the app works without per-user auth sessions). The app links accounts by **email + `profile_id`**, NOT `auth_id` — the `auth_id → auth.users` foreign keys were **dropped** (they caused sign-up failures on Supabase's obfuscated duplicate-user response).
- Storage: a **public `uploads` bucket** holds résumés (`resumes/…`) and brochures (`brochures/…`); anon insert/select policies.
- One seeded event drives everything: `DEMO_EVENT_ID = e0000000-0000-0000-0000-000000000001` (defined in `lib/demo-session.ts`). 5 exhibitor **companies** + the **checklist library** (38 items) are seeded; fake **student** personas were deleted so student lists reflect real signups.
- Auth: email/password via `supabase.auth.signUp` / `signInWithPassword` / `resetPasswordForEmail` / `updateUser`. The app does NOT depend on email confirmation (it logs users in immediately; sign-up is tolerant of a throttled confirmation email).

**Env vars / external services:**
- `.env.local` (and Vercel Production/Preview/Development): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The anon key is public/safe (RLS-protected).
- The **`service_role` key is intentionally NOT stored** anywhere. ⚠️ It was pasted into chat earlier in the project history — **the user should rotate it.**
- Vercel: project `gradlink/gradlink`, account `divitkej-4296`, stable alias `gradlink-theta.vercel.app`. CLI installed + logged in.

**Config files that matter:** `AGENTS.md`/`CLAUDE.md` (the "modified Next.js" warning), `app/globals.css` (tokens), `.claude/launch.json` (preview dev server config), `.vercel/` (project link).

---

## 4. Files Actively Edited

`lib/supabase.ts`
- Changed: `signUpUser` now creates a `profiles` row + role row (with `profile_id`) + event registration + (students) analytics, returns `profileId`; added a duplicate-email pre-check; made it tolerant of email-delivery/rate-limit errors so sign-up never hard-fails on a throttled confirmation email.
- Why: turn sign-up into real per-user accounts; fix the `profiles_auth_id_fkey` and rate-limit failures.
- Status: Complete.

`lib/db.ts`
- Changed: the entire data-access layer + types. Added `detectIdentityByEmail`, `ensureProfile`, `getProfileNames`, `updateStudentProfile`, `updateCompanyProfile`, `uploadPublicFile`, plus `brochure_url` on `CompanyRow`. (Older functions: getEvent, get/list students & companies, analytics, scans, shortlists, messages, checklist.)
- Why: power every connected feature.
- Status: Complete.

`lib/demo-session.ts`
- Changed: localStorage session model (`GLSession`), `AppRole`, `DEMO_EVENT_ID`, `DEMO_IDENTITIES`, `startDemo`, `switchRole`, `useSession`. NOTE: `startDemo`/`switchRole` are now largely vestigial (role switching removed); `DEMO_IDENTITIES` is only a fallback.
- Why: app-wide auth/role state without requiring real auth sessions.
- Status: Complete (could be trimmed of unused exports).

`lib/resume.ts`
- Changed: `evaluateResume()` returns 0 when no `resume_url` is attached (with "upload your résumé to unlock your score").
- Why: user asked for the score to be 0 until a résumé is attached.
- Status: Complete.

`components/dashboard/DashboardShell.tsx`
- Changed: removed the role switcher; added an auth gate (no session → `/sign-in`) and role lock (wrong role → own dashboard); added "Company Profile" to company nav.
- Why: lock accounts to their registered role.
- Status: Complete.

`components/dashboard/StudentDashboard.tsx`, `app/dashboard/company/page.tsx`, `components/dashboard/EventManagerDashboard.tsx`
- Changed: rewritten to render the logged-in user's real data with empty/"no activity yet" states (was static mock).
- Why: real product, not demo.
- Status: Complete.

`components/dashboard/Checklist.tsx`
- Changed: auto-completion from real signals for **student and company** roles, tri-state (managed vs manual), persists to DB, un-checks when data is removed.
- Why: "checklist automated as the student does the stuff."
- Status: Complete.

`components/dashboard/StudentProfileEditor.tsx` (new), `components/dashboard/CompanyProfileEditor.tsx` (new), `app/dashboard/profile/page.tsx`
- Changed: editable profiles + Supabase Storage file upload (résumé / brochure); page is role-aware.
- Why: let users fill profiles so the score/checklist/booth become real.
- Status: Complete.

`components/scan/Scanner.tsx`
- Changed: camera scanning now uses native `BarcodeDetector` where available and **jsQR fallback** everywhere else (iPhone Safari, Firefox).
- Why: "browser cannot scan with camera" on non-Chrome.
- Status: Complete.

`components/scan/StudentScanView.tsx`, `components/scan/CompanyScanView.tsx`, `components/scan/ViewerGate.tsx`
- Changed: scan views wrapped in `GsapReveal` (cascade); `ViewerGate` now prompts sign-in (was a persona picker); CompanyScanView shows the brochure link.
- Why: de-demo + animation.
- Status: Complete.

`app/dashboard/messages/page.tsx`
- Changed: rewritten into a two-pane interactive chat (inbox + thread + reply, persists to `messages`, mobile responsive).
- Why: user wanted to message back.
- Status: Complete.

`app/dashboard/scans/page.tsx`, `app/dashboard/events/page.tsx`, `app/dashboard/page.tsx`, `app/dashboard/college/page.tsx`
- Changed: scans/events made real; `/dashboard` redirects; `/dashboard/college` → `/dashboard/event-manager`.
- Status: Complete.

`components/gradlink/GradLinkSignIn.tsx`
- Changed: sign-in resolves real identity + back-fills profile; added working **Forgot password?** (`resetPasswordForEmail` → `/reset-password`).
- Status: Complete.

`components/gradlink/ResetPassword.tsx` (new) + `app/reset-password/page.tsx` (new)
- Changed: new-password page using `supabase.auth.updateUser` after the recovery link.
- Status: Complete (delivery depends on Supabase URL config — see §7).

`components/gradlink/SignUpForm.tsx`
- Changed: on success sets an `auth`-mode session with the user's real name + returned `profileId`, routes to the role dashboard.
- Status: Complete.

`app/layout.tsx`, `app/opengraph-image.tsx` (new), `app/twitter-image.tsx` (new), `app/icon.svg` (new), `app/apple-icon.tsx` (new)
- Changed: OG/Twitter share card with the logo + tagline; favicon + Apple touch icon; metadata (`metadataBase`, title, description). Removed default `favicon.ico`.
- Status: Complete.

`components/anim/GsapReveal.tsx`, `Magnetic.tsx`, `ScrollProgress.tsx`, `ScrollSync.tsx` (all new) + `components/Providers.tsx` + `components/HeroSection.tsx` + `app/page.tsx` + `components/dashboard/EventConsole.tsx`
- Changed: GSAP — staggered reveals (scan views, profile editors), keyed tab-transition in EventConsole, scroll-progress bar, hero parallax, magnetic CTAs, and `ScrollSync` to keep ScrollTrigger in sync with Lenis.
- Why: "add animations / push further."
- Status: Complete.

`components/Navbar.tsx`, `components/CTASection.tsx`
- Changed: "Book a Demo/Book Demo" CTAs → "Get Started" → `/sign-up`.
- Why: remove demo features.
- Status: Complete.

`supabase/email-templates/*.html`, `supabase/apply-email-templates.ps1`, `supabase/configure-smtp.ps1`, `supabase/disable-email-confirmation.ps1`, `supabase/CUSTOM-SMTP.md` (all new)
- Changed: branded GradLink auth emails + one-command scripts the **user** runs locally with their own Supabase token (auto-confirm, SMTP, rate limit, templates).
- Why: brand the emails + lift the email rate limit (can't be done from code/MCP).
- Status: Complete as artifacts; NOT yet applied (need the user's token).

**Deleted this session:** `app/demo/page.tsx`, `components/demo/DemoPicker.tsx` (the demo-persona picker), and `app/favicon.ico`.

---

## 5. What Has Been Accomplished

- **De-demoed the product:** removed the `/demo` persona picker + role switching; every dashboard now shows the logged-in user's real data with proper empty states; deleted fake student personas from the DB (kept the event + exhibitor companies + checklist library).
- **Real accounts:** sign-up creates `profiles` + role row + event registration + analytics and returns a real `profileId`; sign-in resolves the user's own profile (and back-fills one for older accounts).
- **Role lock:** accounts can't switch roles; cross-role URLs redirect to the user's own dashboard.
- **Editable profiles + file upload:** student career profile (degree/year/skills/links/bio + **résumé PDF upload**) and company booth profile (sector/industry/roles/booth/skills + **brochure PDF upload**) via a public Supabase Storage `uploads` bucket (anon upload verified → 200).
- **AI résumé score gated to 0** until a résumé is attached; live recompute in the editor.
- **Auto-completing checklist** (student + company) driven by real activity, persisted to `checklist_progress`, with un-check-on-reverse.
- **Interactive messaging:** two-pane inbox/thread with reply (persists to `messages`).
- **Working forgot-password** (`resetPasswordForEmail` + `/reset-password` page).
- **Universal camera QR scanner** (jsQR fallback for iOS Safari/Firefox).
- **GSAP animation pass:** scan-view/profile cascade reveals, EventConsole tab transitions, top scroll-progress bar synced to Lenis, hero parallax, magnetic CTA buttons — all reduced-motion safe, zero console errors.
- **Branding:** Open Graph + Twitter share card (logo + tagline), SVG favicon + Apple touch icon, branded Supabase auth email templates.
- **Sign-up bug fixes:** dropped `auth_id` FKs (fixed `profiles_auth_id_fkey`), duplicate-email pre-check, tolerant of throttled confirmation emails.
- **DB migrations applied** (via Supabase MCP): event-platform schema, RLS, seed data, colleges `profile_id`, storage bucket + policies, dropped auth FKs. Orphan profile rows cleaned up.
- **Deployed to Vercel** repeatedly; each change verified in the Claude Preview browser and via SQL against the live DB. All routes 200 (except intentional `/demo` 404).
- **Build is green** (TypeScript passes, ~26 routes).

---

## 6. What Was Tried but Failed

**Attempt: Start the claude-mem memory worker**
- Tried: `npx claude-mem start` (and `install`).
- Files involved: external plugin at `C:\Users\Administrator\.claude\plugins\marketplaces\thedotmack\plugin\scripts\worker-service.cjs` (not this repo).
- Result: install succeeded; worker did NOT start.
- Error/problem: `error: Cannot find module 'zod/v3' from ...worker-service.cjs` (Bun crash) — a zod version mismatch inside the claude-mem plugin.
- Current status: Unresolved, **external** to this project. Memory streaming/dashboard at http://localhost:37777 won't run until claude-mem fixes it. Do not rabbit-hole into patching their node_modules.

**Attempt: Lift the Supabase email rate limit from code/MCP**
- Tried: investigating whether the rate limit / email confirmation could be changed via the Supabase MCP or SQL.
- Files involved: `lib/supabase.ts`, `supabase/*.ps1`.
- Result: Not possible from here — auth config (rate limit, SMTP, autoconfirm, Site URL) is not exposed by the MCP or SQL, and the built-in mailer is hard-capped.
- Error/problem: `429 over_email_send_rate_limit` during heavy testing.
- Current status: Worked around app-side (sign-up tolerant of throttled emails) + provided `supabase/configure-smtp.ps1` and `disable-email-confirmation.ps1` for the **user** to run with their own token. Not applied yet.

**Attempt: `npx skills add` GSAP skills usable mid-session**
- Tried: `npx skills add https://github.com/greensock/gsap-skills` (installed 8 skills to `.agents/skills/` + symlinked for Claude Code).
- Result: installed OK, but the skills did not appear in the invokable-skills list until later.
- Current status: They became available after the session re-scanned; GSAP code was written directly regardless. A **Claude Code restart** guarantees they're registered.

**Note:** The Claude Preview `preview_screenshot` tool intermittently timed out on some heavy pages (renderer hiccup, not an app bug). `preview_eval`/`preview_console_logs` were used to verify instead and confirmed correctness.

No application code was reverted — all attempted features shipped.

---

## 7. Known Problems / Open Issues (priority order)

1. **(Security) RLS is demo-grade** — anon can read/write event tables; portfolios/messages are broadly readable. Fine for a demo, **must be tightened by `auth.uid()`/membership before real production.** Run `mcp__dc00cd85-…__get_advisors` (security) for the current advisory list.
2. **(Security) Rotate the `service_role` key** — it was pasted in chat earlier in the project's history. It is NOT in the repo, but rotate it in the Supabase dashboard.
3. **(Email delivery) Password-reset / confirm emails** need Supabase config the code can't set: **Site URL** = `https://gradlink-theta.vercel.app` and redirect allow-list `…/**` (so the reset link lands on `/reset-password`), plus the built-in mailer's low rate limit. Fix by running `supabase/disable-email-confirmation.ps1` and/or `configure-smtp.ps1`, or set in the dashboard. The branded templates in `supabase/email-templates/` also still need to be pasted/applied (`apply-email-templates.ps1`).
4. **claude-mem worker** crash (`zod/v3`) — external; memory plugin dashboard won't run.
5. **Vestigial code** — `startDemo`/`switchRole`/`DEMO_IDENTITIES` in `lib/demo-session.ts` are now mostly unused (role switching removed). Safe to leave; could be trimmed.
6. **localStorage-only data** — student "saved/visited companies" and per-company personal notes are not in the DB (won't sync across devices).
7. **Manager analytics use stored `student_event_analytics`** rows (seeded/zeroed at signup), not live recomputation, so a fresh student shows résumé 0 / engagement 0 there even after they fill their profile (the live résumé score elsewhere is correct).
8. **Needs broader manual testing** on a real phone for the full QR loop (student shows QR ↔ company scans) across two accounts.

---

## 8. Next Recommended Step

**Immediate next task: Apply the Supabase auth configuration so the email flows (reset password + sign-up confirmation) work end-to-end, then re-verify the reset loop.**

- **Why now:** The forgot-password feature is fully coded and deployed, but the reset email's redirect can bounce to localhost and the built-in mailer throttles — both are Supabase *settings*, not code. This is the only thing blocking a clean, demoable auth experience, and it's a ~5-minute, token-only job.
- **Likely files involved:** `supabase/disable-email-confirmation.ps1` (stops sign-up emails consuming the quota), `supabase/configure-smtp.ps1` (optional, for branded sender + high limit), `supabase/apply-email-templates.ps1` (branded templates). The relevant app code is already done in `components/gradlink/GradLinkSignIn.tsx` + `components/gradlink/ResetPassword.tsx`.
- **Command to run first (the user must supply their Supabase access token — you cannot enter it for them):**
  ```powershell
  powershell -ExecutionPolicy Bypass -File supabase/disable-email-confirmation.ps1 -Token "sbp_xxx"
  ```
  Then in the Supabase dashboard set **Authentication → URL Configuration → Site URL** = `https://gradlink-theta.vercel.app` and add `https://gradlink-theta.vercel.app/**` to Redirect URLs (or run `configure-smtp.ps1`, which sets `uri_allow_list`).
- **Success looks like:** request a reset on `/sign-in` → receive the branded email → its link opens `https://gradlink-theta.vercel.app/reset-password` (not localhost) with a valid recovery session → set a new password → sign in with it.

**Short follow-up list (after the above):**
1. Tighten RLS policies by `auth.uid()`/membership (production hardening) and re-run `get_advisors`.
2. Add event-manager "edit the event" (title/dates/location/status) so it isn't fixed to "Abu Dhabi Career Fair 2025".
3. Make `student_event_analytics` update from real activity (so manager readiness reflects live data).
4. Optional: allow starting a brand-new message to someone you haven't talked to (people picker in `/dashboard/messages`).

---

## 9. Commands Run

```bash
npm run build
```
Result:
- The primary verification gate, run after every change. Currently **green** (Next.js 16.2.7, TypeScript passes, ~26 routes). One past failure was a stale `.next/dev/types` reference to the deleted `/demo` route — fixed with `rm -rf .next && npm run build`.

```bash
vercel --prod --yes
```
Result:
- Deploys to production, aliased to `https://gradlink-theta.vercel.app`. Used many times; all succeeded. Env vars already set on Vercel.

```bash
npm install qrcode.react jsqr gsap @gsap/react
```
Result:
- Added QR generation, camera QR decode, and GSAP. All installed OK (benign `allow-scripts` warnings).

```bash
npx --yes skills add https://github.com/greensock/gsap-skills
```
Result:
- Installed 8 GSAP skills to `.agents/skills/` (symlinked for Claude Code). Needs a Claude Code restart to be invokable.

```bash
npx --yes claude-mem install   # then: npx --yes claude-mem start
```
Result:
- Plugin installed (v13.6.0); worker **failed**: `Cannot find module 'zod/v3'` (see §6).

```bash
curl -s -o /dev/null -w "%{http_code}" https://gradlink-theta.vercel.app<path>
```
Result:
- Live-route checks. `/`, `/sign-in`, `/sign-up`, `/dashboard/*`, `/scan`, `/reset-password` → **200**; `/demo` → **404** (intentional); old `/favicon.ico` → **404** (replaced by icon.svg).

Supabase work was done through the **Supabase MCP** (`apply_migration`, `execute_sql`) rather than the shell — schema, RLS, seed, storage bucket, dropping auth FKs, and verification queries.

---

## 10. Current Errors and Logs

- **Build:** No errors. `npm run build` is green.
- **TypeScript:** Passes. (Past fixes worth remembering: cast Supabase dynamic-`select` results through `unknown` before a typed cast; never import `Linkedin`/`Github` from lucide-react@1.17.)
- **App runtime / console:** No known errors — scan views, dashboards, messages, and the landing were each verified with `preview_console_logs` returning no errors.
- **Supabase:** `over_email_send_rate_limit` (429) appears only under heavy email testing (built-in mailer cap). Not a code bug.
- **External:** claude-mem worker → `Cannot find module 'zod/v3'` (plugin bug, not this project).

There are no outstanding build/type/runtime errors in the app. The app should still get **broader manual testing on a real phone** for the full QR scan loop across two accounts.

---

## 11. Important User Preferences / Constraints

- **Keep the existing dark cinematic design** — do not introduce a different UI style, Tailwind classes, or a component library. Match the inline-style + CSS-variable convention.
- **Accounts are locked to one role** — do NOT re-add the ability to switch between student/company/event-manager on a single account.
- **Real product, not a demo** — fresh users start from their own empty data; no fake persona logins. The `/demo` route was removed deliberately.
- **The user wants things actually fixed and deployed**, with verification — not just explained. Build → verify in the preview → deploy is the expected loop.
- **Branding matters** — logo on share links (done), custom favicon (done), branded emails (artifacts ready).
- **Security guardrails respected in-session:** never store/enter the `service_role` key or any API token; the user runs token-based scripts themselves.
- **Tools in use:** Supabase (DB/auth/storage), Vercel (hosting), GSAP + framer-motion + Lenis (animation), qrcode.react + jsQR (QR). The user has also been installing extra tooling (GSAP skills, claude-mem) — those are optional and external.
- **Priority order observed:** working auth/data > role-correct dashboards > QR/scan flows > checklist/manual/analytics > messaging > polish/animations > email/branding config.

---

## 12. Continuation Prompt for New Session

```md
You are continuing from a previous Claude Code session. First read `handoff.md` completely, then inspect the files mentioned in it. Continue from the "Next Recommended Step" section. Do not restart the project or rewrite working code unless necessary. Preserve the existing design direction and make targeted changes based on the handoff.
```
