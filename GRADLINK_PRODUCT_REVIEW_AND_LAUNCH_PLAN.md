# GradLink — Product Review & Launch Plan

> **Audit date:** 2026-06-14
> **Live URL:** https://gradlink-theta.vercel.app
> **Repo root:** `gradlink/`
> **Reviewer scope:** product strategy, full-stack architecture, UX, security, launch readiness.
> **Method:** code audit of the full repo + live Supabase schema/RLS inspection (project `dtagbttabqslphxlanel`) + the prior session handoff. Where a claim is inferred from code rather than a live cross-account test, it is marked **(needs live test)**.

**Bottom line up front:** GradLink is a genuinely impressive *single-event demo* with real auth, real file uploads, real QR scanning, and a polished cinematic UI. It is **not yet launch-ready as a multi-college SaaS**, for three structural reasons:

1. **It is hardwired to one event.** Every dashboard, nav link, and query points at a single seeded `DEMO_EVENT_ID`. There is no event creation, no multi-event support, and no concept of "this college's events."
2. **There is no college → student → event boundary.** The `colleges` table is just event-manager *accounts*; students store a free-text `university` string. Nothing scopes who can see which event. The headline promise — "students only see their own college's events" — is not implemented at any layer.
3. **Security is demo-grade.** Every table has fully-open Row Level Security (`USING (true)` for the `anon` role). Résumé scores, messages, and all student/company data are world-readable and world-writable with the public key. This must be fixed before any real college data goes in.

Everything else (landing length, unread badges, analytics depth) is secondary to those three.

---

## 1. Product Vision

GradLink should become the **operating system for campus career events** in the UAE and India — the tool a placement office or career-services team opens to run a career fair end-to-end and *prove the outcome* afterward.

- **A college event/career-fair platform**, multi-tenant by college, where each institution runs its own events, invites its own students and employers, and sees its own data — never another college's.
- **A dashboard-driven product for three roles** — students, companies/recruiters, and college admins/event managers — each with a distinct, role-locked workspace.
- **A platform where every landing-page promise is backed by a working dashboard feature** (or honestly labelled "coming soon"). Today the landing promises measurement, employer CRM, and readiness analytics; the dashboards partially deliver but against fabricated/single-event data.
- **A monetizable SaaS** colleges adopt per-year or per-event, with premium analytics, recruiter access, and placement-office reporting as upsells.

The north-star metric is **"measurable placement outcomes per event"** — the tagline already in the product (*"Prepare students. Connect employers. Track outcomes."*) is the right one. The job now is to make the "track outcomes" half true across many events and many colleges.

---

## 2. Current State

### 2.1 Tech stack (verified in `package.json`)
- **Next.js 16.2.7** (App Router, Turbopack) — a *modified* build; `AGENTS.md` warns APIs differ from upstream.
- **React 19.2.4**, **TypeScript 5**.
- **Tailwind v4 installed but unused in components** — styling is inline `style={{}}` objects + CSS variables in `app/globals.css`. (Intentional; keep it.)
- **framer-motion 12**, **gsap 3.15 + @gsap/react**, **lenis 1.3** (smooth scroll), **three + @react-three/fiber** (landing shaders).
- **@supabase/supabase-js 2** (DB/auth/storage), **qrcode.react 4** (QR gen), **jsqr 1.4** (camera decode), **lucide-react 1.17** (no `Linkedin`/`Github` exports — known footgun).

### 2.2 Routes / pages (from `app/`)
- `/` — marketing landing: **13 stacked sections** (`OpeningHero`, `HeroSection`, `ProductReveal`, `ProblemSection`, `StatementBand`, `WhyGradLinkSection`, `ProductJourneySection`, `SpatialShowcaseSection`, `ReadinessSection`, `LiveEventSection`, `AnalyticsSection`, `EmployerCRMSection`, `CTASection`) + scroll-progress + scroll-thread.
- `/sign-up` → role chooser; `/sign-up/{student,company,college}` → forms; `/sign-in` (+ forgot password); `/reset-password`.
- `/dashboard` → redirect; `/dashboard/{student,company,event-manager}` → role dashboards; `/dashboard/college` → alias to event-manager.
- `/dashboard/profile` (role-aware editor), `/dashboard/messages` (two-pane chat), `/dashboard/scans`, `/dashboard/events`.
- `/events/[eventId]` — role-aware Event Console (Overview / People / My QR / Checklist / Manual).
- `/scan`, `/scan/student/[studentId]`, `/scan/company/[companyId]`.

### 2.3 Database (live, project `dtagbttabqslphxlanel`)
14 tables in `public`. Row counts at audit time:

| Table | Rows | Notes |
|---|---|---|
| `profiles` | 18 | shared identity; `role` ∈ student/company/event_manager/admin |
| `students` | 2 | real signups (seeded personas deleted) |
| `companies` | 12 | 5 seeded exhibitors + signups |
| `colleges` | 5 | **event-manager accounts**, not institutions |
| `events` | **1** | the single `DEMO_EVENT_ID` |
| `event_registrations` | 14 | everyone joins the one event |
| `qr_codes` | 1 | |
| `scans` | 22 | |
| `shortlists` | 3 | |
| `messages` | 3 | **no read/unread column** |
| `student_event_analytics` | 2 | seeded/zeroed; not live-recomputed |
| `checklist_items` | 38 | library |
| `checklist_progress` | 27 | |

### 2.4 Auth flow
- Email/password via `supabase.auth.signUp` / `signInWithPassword` / `resetPasswordForEmail` / `updateUser`.
- **But the app does not use the Supabase auth session for data access.** It links accounts by **email + `profile_id`** and stores a `GLSession` in **localStorage** (`lib/demo-session.ts`). `auth.uid()` is effectively unused for RLS. The `auth_id → auth.users` FKs were dropped in a prior session to work around sign-up failures.
- Role lock works: `DashboardShell` redirects a wrong-role user to their own dashboard. Accounts cannot switch roles (by design).

### 2.5 What actually works
- Real sign-up creates `profiles` + role row + event registration (+ student analytics) and logs the user straight in; duplicate-email is handled cleanly.
- Editable profiles with **real Supabase Storage uploads** (résumé / brochure to a public `uploads` bucket).
- AI résumé score gated to **0 until a résumé is attached** (deterministic heuristic in `lib/resume.ts`, *not* an LLM).
- Auto-completing checklist driven by real activity signals, persisted, un-checks on reversal.
- Two-way messaging (inbox/thread/reply) persists to `messages`.
- Real QR generation + universal camera scanning (native `BarcodeDetector` with **jsQR fallback** for iOS Safari/Firefox).
- Company→student scan shows the live résumé score; shortlist/maybe/reject persists.
- Forgot-password code path works (delivery depends on Supabase config).
- GSAP polish: scroll-progress synced to Lenis, hero parallax, magnetic CTAs, cascade reveals — reduced-motion safe.

### 2.6 What is incomplete / single-event / faked
- **Event model is a singleton.** `EventManagerDashboard` calls `getEvent(DEMO_EVENT_ID)`; nav builds `EV = /events/${DEMO_EVENT_ID}`; `signUpUser` hard-registers every student/company into `DEMO_EVENT_ID`. No create-event UI; no event editing (title is frozen as "Abu Dhabi Career Fair 2025").
- **No college scoping.** No FK from students/events to an institution. "Students see only their college's events" — absent.
- **No invite-link / token mechanism.** `/dashboard/events` links to the one console; there is no per-event join link, no access request, no approval flow.
- **Manager analytics read stored `student_event_analytics`** (seeded/zeroed at signup), not live recomputation — a freshly-onboarded student shows résumé 0 / engagement 0 in the manager view even after filling their profile.
- **Company dashboard "candidates"** are drawn from event registrations of the single event.
- **localStorage-only data:** student saved/visited companies and per-company notes don't sync across devices.

### 2.7 Landing-page claims vs. reality (gap preview — full table in §3)
- "Measure the journey, not the attendance" / readiness analytics / employer CRM — **partially real**, but against one fabricated event and zeroed analytics.
- "AI résumé score" — **real heuristic**, presented as "AI"; acceptable but should be described accurately.

### 2.8 Bugs / risks / issues found
- **(Critical security)** Fully-open RLS — see §7.1.
- **(Security)** Service-role key was pasted into chat earlier in project history — **rotate it** (it is not in the repo).
- **(Functional)** Multi-event impossible; college boundary absent (see §3).
- **(Data correctness)** Manager analytics not live (zeros for real students).
- **(Email)** Reset/confirm email delivery needs Supabase Site-URL + redirect allow-list config + rate-limit lift (code is done).
- **(Notifications)** Header bell shows a **permanent static amber dot** (`DashboardShell.tsx:185`) — fake; never clears.
- **No automated tests, no typecheck script** beyond `next build`; `lint` exists but isn't enforced.

### 2.9 Performance
- Landing loads three.js shaders + GSAP + Lenis + framer-motion. Heavy but acceptable on desktop; **(needs live test)** on low-end Android, which is a large share of the Indian market.
- Dashboards fetch with `Promise.all` and render empty/loading states — fine.

### 2.10 UI/UX
- Strong, distinctive dark "command-center" aesthetic; consistent tokens. This is a real asset — keep it.
- Landing is **long and text-heavy** (13 sections) — opposite of the "short, visual, product-led" goal.
- The three audiences (colleges / students / companies) are not cleanly separated above the fold.

---

## 3. Product Gap Analysis (promise vs. reality)

| Capability | Landing implies | Actually works? | Gap |
|---|---|---|---|
| Run a career fair | Yes | Single hardcoded event | **No create/manage events** |
| College-specific events | Strongly implied | No | **No college entity / scoping** |
| Students see only their college's events | Implied | No | **No access boundary** |
| Event invite/share links | Implied ("join an event via link") | No | **No token/invite system** |
| Company registration & event participation | Yes | Registered into the one event | **No per-event company application/approval** |
| Student profile + AI résumé score | Yes | Yes (heuristic), score private in UI | Score row is **world-readable in DB** |
| Company profile / booth | Yes | Yes | OK |
| Messaging | Yes | Yes (2-way) | **No unread state / notifications** |
| Notifications | Implied (bell) | **Fake static dot** | No real notifications |
| QR / scan | Yes | Yes (universal) | Needs cross-account live test |
| Analytics | Yes | Partial; **zeroed/seeded**, not live | Not trustworthy for a real event |
| Admin controls | Yes | Read-only dashboards | No event/user management |
| Monetization | — | None | No billing, no tiers, no limits |

**Net:** the *experience* of a single event is ~70% there; the *product* (many colleges, many events, scoped + secure + measurable) is ~25% there.

---

## 4. Launch-Ready Requirements

Must be **true** before showing a paying college:

- [ ] **Stable auth** that the data layer actually trusts (move RLS onto `auth.uid()`, or a deliberate server-side trust model).
- [ ] **Role-based dashboards** — done, keep.
- [ ] **Multi-event**: an event manager can create, edit, and run multiple events.
- [ ] **College entity** linking students ↔ college ↔ events (institution-scoped tenancy).
- [ ] **College-specific events**: students see only their own college's events unless an event is explicitly public/invited.
- [ ] **Event sharing / invite links** with a token, so students/companies can join a specific event.
- [ ] **Company registration & per-event participation** (apply/approve, not auto-join-everything).
- [ ] **Working message notifications** (unread indicator that clears on read).
- [ ] **Résumé tools** that feel real (current heuristic + concrete suggestions is acceptable for v1 if labelled honestly).
- [ ] **Security/RLS** scoped by user + event + college membership; résumé scores and messages private.
- [ ] **Mobile responsiveness** verified on real low-end Android + iOS Safari.
- [ ] **Empty / loading / error states** everywhere (mostly done; audit new flows).
- [ ] **Realistic seeded demo data** per college so a sales demo isn't blank.
- [ ] **Production deployment checks**: env vars set, build green, no console errors, rotated keys, email delivery working.

---

## 5. Monetization Strategy

GradLink should sell to the **placement office / career-services department**, which already has budget for career fairs.

**Models (combine 2–3):**
- **College annual subscription** — the core. Per-institution license, tiered by student headcount.
- **Per-event pricing** — for colleges that only run 1–2 fairs/year or want to try before subscribing.
- **Premium analytics package** — outcome reports, employer-engagement heatmaps, year-over-year placement trends, exportable PDFs/CSVs for accreditation (NAAC/NBA in India, KHDA/MoE in UAE).
- **Recruiter / company access fee** — companies pay to access multiple colleges' fairs, pre-shortlist, and message candidates at scale.
- **White-label college portal** — the college's branding/domain; premium tier.
- **Résumé / AI improvement add-on** — per-student or bundled; "career-readiness" upsell.
- **Event check-in / QR analytics package** — attendance tracking, booth dwell, lead capture for employers.
- **Placement-office dashboard package** — multi-event, multi-year cohort tracking for the central office.

**Suggested tiers (illustrative — validate with 3–5 colleges before pricing):**

*India* (price-sensitive, volume play):
- **Starter** ₹40–60k/yr — 1 college, up to 2 events/yr, core dashboards, basic analytics.
- **Growth** ₹1.5–2.5L/yr — unlimited events, full analytics, exports, recruiter access.
- **Placement Suite** ₹4L+/yr — white-label, multi-year cohort tracking, API/CSV, priority support.

*UAE* (higher willingness to pay, fewer/larger institutions):
- **Starter** AED 6–9k/yr — 1 college, up to 2 events.
- **Growth** AED 18–30k/yr — unlimited events, full analytics, recruiter access.
- **Enterprise** AED 60k+/yr — white-label, SSO, dedicated success, custom reports.

Charge employers separately (e.g. AED/₹ per-event booth + a "talent access" subscription) to create a second revenue line that scales with the network.

---

## 6. Recommended Features to Add

Prioritized for placement offices, career-services teams, students, recruiters, and organizers.

**Tenancy & events (highest leverage):**
- College entity + invite links so a college onboards its own students/employers.
- College-specific event pages; student eligibility rules (branch/major/year/CGPA).
- Multi-event management; event approval flow (admin approves manager-created events).
- Company **booth pages** per event; company application + approval per event.

**Recruiter workflow:**
- Recruiter notes + shortlisting pipeline (shortlist → maybe → priority → offer).
- Post-event follow-ups; candidate export.
- Branch/major/year/skills filters over the candidate pool.

**Student workflow:**
- Résumé improvement suggestions (already heuristic — make them concrete + per-section).
- Eligibility-aware event list; checklist (done); follow-up inbox (done).

**Organizer / placement office:**
- QR check-in + attendance tracking; booth dwell analytics.
- Admin analytics dashboard; exportable reports (CSV/PDF) for accreditation.
- Bulk CSV upload of students/companies.
- WhatsApp/email follow-up support (India runs on WhatsApp; integrate a provider).
- Role-based permissions (admin vs. event manager vs. staff).

---

## 7. Technical Risks

### 7.1 Security (most urgent)
- **Fully-open RLS.** Every table has a policy `USING (true)` (and `WITH CHECK (true)`) for the `anon` role for `SELECT` and `ALL`. With the public anon key, **anyone can read and write every row** — all students, résumé scores, messages, shortlists. The narrower `*_select_own` policies that exist are dead (the permissive `*_select_all` already allows everything). This is the #1 launch blocker.
- **Auth not wired to data.** Because the app trusts a localStorage session and `auth.uid()` isn't used, simply tightening RLS will break the app unless auth is wired through first. Fixing security therefore requires an auth refactor (use the real Supabase session) — plan for it as one coupled workstream.
- **Service-role key exposure** (historical, in chat) — rotate it in the Supabase dashboard.
- **Public storage bucket** — résumés/brochures are in a public bucket with anon insert; anyone with a URL can read, and uploads aren't type/size-restricted. Move to authenticated, scoped storage with signed URLs.

### 7.2 Data model
- Singleton event; no college tenancy; no invite tokens (see §3). Schema changes needed: `colleges`/institutions as first-class, `college_id` on events + students, an `event_invites` table.

### 7.3 Client-side data exposure
- All data access is client-side with the anon key; combined with open RLS, the browser can query the entire DB. Sensitive aggregates (résumé scores, who-messaged-whom) leak.

### 7.4 Files / résumés
- Public bucket, no validation. Risk: arbitrary file upload, PII exposure.

### 7.5 AI scoring
- Deterministic heuristic presented as "AI." Low technical risk; **reputational risk** if oversold. Either label as "résumé readiness score" or back it with a real model via a server route (keep keys server-side).

### 7.6 Messaging / notifications
- No read state, no realtime, no rate limiting; messages world-readable under current RLS.

### 7.7 Event access control
- None. Any logged-in (or anon) client can read any event's people.

### 7.8 Deployment
- Manual `vercel --prod`. No CI, no preview-deploy gating, no automated tests. One past break from stale `.next` types.

### 7.9 Performance
- Heavy landing animation stack; verify on low-end Android (key India segment).

---

## 8. UI/UX Review

**Keep:** the dark cinematic command-center aesthetic, the token system, the inline-style convention. It's distinctive and not generic — a real asset.

**Landing page (the big one):**
- **Too long (13 sections) and too text-heavy.** Users won't read it. Cut to ~6 punchy, visual sections.
- **Recommended structure:**
  1. **Hero** — one-line value prop ("Run career fairs that prove outcomes"), one primary CTA ("Book a demo / Create your event"), a real product screenshot or animated dashboard mockup above the fold.
  2. **Three-audience split** — clear "For Colleges / For Students / For Companies" cards, each one line + one visual.
  3. **How it works** — 3-step visual flow (Set up event → Students & employers connect via QR → Track outcomes), not paragraphs.
  4. **Product proof** — 2–3 real dashboard/console screenshots or card mockups (analytics, scan monitor, candidate pipeline).
  5. **Trust** — UAE + India use-case strip (placement office, career fair, accreditation reporting) + logos/placeholders.
  6. **CTA** — colleges book/demo; students/companies join via link.
- **Reduce copy by ~50%**, replace with imagery, cards, and motion. Lead with product, not prose.
- Ensure one **clear CTA above the fold**; today the opening is cinematic but the action is buried.

**Dashboards:**
- Solid structure and empty states. Main UX debt is the **fake header notification dot** (remove or make real) and the single-event framing (every dashboard reads like there's only one event).
- Add real **unread message badge** in the sidebar (implemented this session — see §9/§final report).

**Mobile:**
- Sidebar collapses to a burger; messages page is responsive. **(Needs live test)** on real devices, especially the heavy landing on low-end Android.

---

## 9. Implementation Plan (prioritized)

**P0 — Critical fixes (launch blockers)**
1. **Auth → data trust + RLS hardening (coupled).** Wire the Supabase auth session into the client; rewrite RLS to scope by `auth.uid()` and event/college membership; make résumé scores and messages private. Rotate the service-role key. Lock down storage.
2. **Multi-event + college tenancy.** Add institution/`college_id`, `event_invites`; build create/edit-event UI; replace `DEMO_EVENT_ID` hardcoding with the selected event; scope student event lists by college/invite.

**P1 — Product completion**
3. Event invite/share links + join/approval flow (students & companies).
4. Live analytics (recompute `student_event_analytics` from real scans/shortlists/messages, or compute on read).
5. **Real notifications** — unread message indicator (✅ done this session), then extend to scans/shortlists; remove the fake bell dot.
6. Candidate filters (branch/major/year/skills), recruiter notes/pipeline, exports (CSV).

**P2 — UI / animation polish**
7. Rebuild the landing to ~6 visual, product-led sections (preserve the aesthetic).
8. Add real product screenshots/mockups; sharpen above-the-fold CTA + three-audience split.

**Throughout — security & launch readiness**
9. Add a typecheck/lint gate; seed realistic per-college demo data; verify on real devices; run `get_advisors` after every DDL change; deploy-checklist before outreach.

---

## 10. Final Launch Checklist

**Security**
- [ ] RLS rewritten to scope by user + event + college; verified with `get_advisors` (security) clean.
- [ ] Auth session actually used for data access.
- [ ] Service-role key rotated.
- [ ] Storage bucket private + signed URLs + upload type/size limits.
- [ ] No sensitive data readable with the anon key.

**Core product**
- [ ] Event manager can create + edit + run **multiple** events.
- [ ] Colleges are first-class; students belong to a college.
- [ ] Students see **only** their college's events (or explicitly invited/public ones).
- [ ] Event invite links work for students **and** companies.
- [ ] Companies apply/join per event (not auto-joined to everything).
- [ ] Analytics reflect **live** activity, not seeded zeros.
- [ ] Unread message indicator appears and clears on read.
- [ ] AI résumé score private + honestly labelled.

**Quality**
- [ ] `next build` green; typecheck/lint gate passing.
- [ ] No console errors on landing + all dashboards.
- [ ] Verified on real iOS Safari + low-end Android (incl. full QR loop across two accounts).
- [ ] Empty/loading/error states on every new flow.
- [ ] Branded auth emails applied + reset loop verified end-to-end.

**Go-to-market**
- [ ] Realistic seeded demo college + event for sales.
- [ ] Pricing tiers validated with 3–5 colleges.
- [ ] Landing rebuilt: short, visual, product-led, clear CTA.

---

### Honest verdict
**Not launch-ready.** It is an excellent, demoable single-event prototype with real plumbing and a great UI. To sell to colleges it needs, in order: **(1) secure the data + wire auth, (2) make it multi-event and college-scoped, (3) make analytics live, (4) shorten/sharpen the landing.** Items 1 and 2 are the hard, high-value work; everything else is comparatively quick.

**Show colleges first:** the **event manager live console + readiness/employer analytics** on a *seeded, realistic* event — that's the most differentiated, "why pay" surface. Pair it with the student QR + résumé-score flow as the "and your students love it too" follow-up.
