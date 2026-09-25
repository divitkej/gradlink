# GradLink Feature Roadmap and Test Plan

Every feature in the codebase, grouped by where the user meets it, in the order a real user walks through the product. Each item has a test to run and a status based on reading the code as of commit `cb381b7`.

## Status key

- **[OK]** Code is wired end to end. Still run the test once on the live site.
- **[VERIFY]** Code looks right but depends on config or Firestore behaviour that has to be confirmed live.
- **[PARTIAL]** Works but is missing part of what the UI promises.
- **[DEAD]** Visible control that does nothing when clicked.
- **[FAKE]** Hardcoded or placeholder content presented as real.
- **[BROKEN]** Will fail or give wrong results as written.
- **[SECURITY]** Works for honest users but can be abused.

---

## 0. Launch blockers (your checklist)

- [ ] **Custom domain.** Site still points at `gradlink-theta.vercel.app` (`app/layout.tsx` `SITE_URL`, `lib/auth.ts` reset fallback URL). Update both once the domain is connected.
- [ ] **Favicon.** [OK] `app/icon.svg` and `app/apple-icon.tsx` exist. Confirm it shows in the browser tab.
- [ ] **Remove leftover starter files.** `public/next.svg`, `public/vercel.svg`, `public/file.svg`, `public/globe.svg`, `public/window.svg` are create-next-app defaults and unused.
- [ ] **Privacy Policy page.** [DEAD] No route exists. Footer link points to `#`.
- [ ] **Terms and Conditions page.** [DEAD] No route exists. Footer link points to `#`.
- [ ] **Contact.** [DEAD] Footer link points to `#`.
- [ ] **No fake metrics.** [FAKE] Landing sections show invented numbers and real company names as if they were results (see section 1).
- [ ] **No em dashes in visible copy.** Page titles (`GradLink — ...`), section copy and error messages use them in 50+ places.
- [ ] **No "AI" claims that are not AI.** "AI resume analysis" and "AI résumé score" are a rule-based checklist in `lib/resume.ts`. Rename or build real analysis.
- [ ] **Copyright year.** Footer says 2025.

---

## 1. Landing page (`/`)

Order on the page: `app/page.tsx`

### 1.1 Global chrome
- **Scroll progress bar and scroll thread** (`ScrollProgress`, `ScrollThread`). Test: scroll top to bottom, bar fills, no jank. [OK]
- **Smooth scrolling** (Lenis, `components/anim/SmoothScroll.tsx`). Test: wheel and trackpad scroll, anchor links still land on the right section. [VERIFY]
- **Background paths** (`gradlink-background.tsx`) on every page. Test: no layout shift, readable text. [OK]

### 1.2 Navbar (`components/Navbar.tsx`)
- Logo links to `#top`. [OK] on `/`. **[BROKEN] on `/pricing`**: there is no `#top` there, so the logo does not take you home.
- Links: Platform `#product`, Students `#readiness`, Employers `#employers`, Colleges `#analytics`, Analytics `#analytics`, Pricing `/pricing`.
  - Test each on `/`. [OK]
  - "Colleges" and "Analytics" go to the same section. [PARTIAL]
  - **[BROKEN] on `/pricing`**: all hash links resolve to `/pricing#...` which do not exist. Change to `/#product` etc.
- Login button to `/sign-in`, Get Started to `/sign-up`. [OK]
- Mobile menu open, close, link tap closes menu. Test at 375px width. [OK]

### 1.3 Sections (test: each renders, animates once, readable at 375px, no horizontal scroll)
- **OpeningHero** (`#top`): shader background, particle text, "scroll" link to `#hero`. [OK] Check performance on a low-end phone (three.js + shader).
- **HeroSection** (`#hero`): cycling headline, Get Started to `/sign-up`, Explore Platform to `#product`, `HeroDashboard` mockup. [OK] Mockup uses "Career Fair 2025" and sample data. [FAKE, acceptable only if labelled as a preview]
- **ProductReveal**: scroll-scaling dashboard mock with stats and schedule. [FAKE] Same mock data.
- **ProblemSection** (`#problem`): 3 problem cards. [OK]
- **StatementBand**: "Measure the journey, not the attendance." [OK]
- **WhyGradLinkSection** (`#why`): 6 cards. [PARTIAL] Claims "mock interviews", "bulk messages", "alumni mentoring", "internships", "pipeline stages" features that do not exist in the app.
- **ProductJourneySection** (`#journey`): 4-step journey. [OK]
- **SpatialShowcaseSection** (`#product`): interactive module tabs. Test clicking each tab. [OK]
- **ReadinessSection** (`#readiness`): readiness rings for sample student "SA". [FAKE] sample data.
- **LiveEventSection** (`#live`): schedule and live scan feed with named people and Careem, PwC UAE, G42. [FAKE] Real company names imply partnerships.
- **AnalyticsSection** (`#analytics`): "Career Fair 2025 Outcome Funnel" 500 registered, 312 resume prep, 180 scans, 74 shortlisted, 26 interviews, 14 offers, ROI 8.4/10, 28 companies. [FAKE] These read as real results. Highest-priority copy fix.
- **EmployerCRMSection** (`#employers`): "Careem Candidate Pipeline". [FAKE] real brand name.
- **CTASection** (`#cta`): Get Started to `/sign-up`, Explore Platform to `#product`. [OK]

### 1.4 Footer (`components/Footer.tsx`)
- LinkedIn, Twitter, Instagram. [DEAD] all `#`.
- 20 column links (Platform, Students, Employers, Colleges). [DEAD] all `#`. Several name features that do not exist (Job Board, Mock Interviews, Alumni Network, Book Fair Booth).
- Privacy Policy, Terms of Service, Contact. [DEAD] all `#`.

### 1.5 SEO and sharing
- Page title and description (`app/layout.tsx`). [OK]
- Open Graph and Twitter images (`app/opengraph-image.tsx`, `app/twitter-image.tsx`). Test: paste the URL into a LinkedIn/WhatsApp preview. [VERIFY]
- No `robots.txt` or `sitemap.xml`. [PARTIAL]

---

## 2. Pricing (`/pricing`, `components/PricingSection.tsx`, `lib/billing.ts`)

- Two plans: Starter (Free) and Placement Pro (AED 3,600 per campus per year). Confirm the price is real before launch.
- **"Start free" button.** [DEAD] `onCta` returns immediately for the free plan. Should link to `/sign-up`.
- **"Upgrade to Pro" signed out.** Sends to `/sign-up/college`. [OK]
- **"Upgrade to Pro" as student/company.** Shows "Placement Pro is a college plan" error. [OK]
- **"Upgrade to Pro" as event manager.** Calls `/api/checkout`, redirects to Stripe. [VERIFY] needs `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO`, Firebase Admin credentials in Vercel.
- **Returning from Stripe.** `?canceled=1` on pricing and `?upgraded=1` on the manager dashboard are sent but never read. [PARTIAL] No success or cancel message.
- **Plan promises vs reality.** [PARTIAL]
  - "One live event" on Free is not enforced. Any college can create unlimited events.
  - "CSV exports of students, employers & shortlists": only the outcome report CSV exists.
  - "Year-over-year comparison": not built.
  - "Priority support": no support channel exists.
- Navbar hash links broken on this page (see 1.2).

---

## 3. Sign up

### 3.1 Role picker (`/sign-up`, `RoleSelect.tsx`)
- Three cards: Student, Company, College / Event host. Each links to its form. [OK]
- "Already have an account? Sign in". [OK]
- Page meta description says "as a student or a company", missing college. [PARTIAL]

### 3.2 Sign-up form (`/sign-up/student`, `/sign-up/company`, `/sign-up/college`, `SignUpForm.tsx`)
Test for each of the three roles:
- Fields: full name, organisation (university / company / institution), email, password. [OK]
- Password checklist live-updates and blocks weak passwords (`PasswordChecklist.tsx`). [OK]
- Submit with an empty field shows an error. [OK]
- Submit with an existing email shows "already exists, sign in instead". [OK]
- Success creates Firebase Auth user, `profiles/{uid}`, and `students|companies|colleges/{uid}`, then redirects to the role dashboard. [VERIFY] with rules deployed.
- College sign-up is stored as role `event_manager`. [OK]
- "Use your university/company email" is advice only, any email is accepted. [PARTIAL] decide if you want domain checks.
- No email verification step. [PARTIAL] anyone can sign up as any company.
- No Terms/Privacy consent checkbox. [PARTIAL] needed once those pages exist.
- Partial failure (auth created, Firestore write failed) says "sign in to retry". Sign-in then falls back to `ensureProfile`, which creates a profile with a random id instead of the uid, so security rules will block that user's writes. [BROKEN] edge case.

---

## 4. Sign in and password reset

### 4.1 Sign in (`/sign-in`, `GradLinkSignIn.tsx`)
- Email + password sign in, redirect to role dashboard. [OK]
- Wrong password shows "Incorrect email or password". [OK]
- Too many attempts message. [OK]
- Legacy account fallback via email lookup. [PARTIAL] see 3.2 last point.
- Signed-in user visiting `/sign-in` is not redirected to their dashboard. [PARTIAL]
- After signing in from a scanned QR (`ViewerGate`), the user lands on their dashboard, not the profile they scanned. [PARTIAL] add a return URL.

### 4.2 Forgot password
- Enter email, click "Forgot password?", Firebase sends reset email. [OK]
- Email link goes to `/reset-password?oobCode=...`. [VERIFY] requires the Firebase console "Action URL" for password reset to point at `https://<domain>/reset-password`. Otherwise users get Firebase's default page.
- `/reset-password`: validates code, sets new password with checklist, redirects to sign in. [OK]
- Expired or used link shows a clear error. [OK]

### 4.3 Sign out
- Sidebar sign out clears local session and Firebase session, goes to `/sign-in`. [OK]

---

## 5. Dashboard shell (every signed-in page, `DashboardShell.tsx`)

- Auth gate: signed-out users go to `/sign-in`. [OK]
- Role lock: a student opening `/dashboard/company` is bounced to their own dashboard. [OK] (client-side only; data protection relies on Firestore rules)
- `/dashboard` redirects to the right role home. [OK]
- `/dashboard/college` redirects to `/dashboard/event-manager`. [OK]
- Sidebar nav per role with active highlighting and unread message badge. [OK]
- Mobile burger menu. [OK]
- **Top bar search box.** [DEAD] input does nothing.
- **Bell icon.** Goes to Messages, amber dot when unread. [OK] (it is not a notification centre)
- **Event switching.** `/dashboard/events` is only in the nav while the user has no event. Once they have one, the "Event" link goes to the console and there is no way to reach the event list, switch events, or create a second event. [BROKEN] navigation gap.
- Event manager sidebar has no Messages or Profile link. [PARTIAL]

---

## 6. Events: create and join (`/dashboard/events`, `EventGate`, `lib/events.ts`)

This is the first thing every new account sees. Test it first.

- **New college, no events:** dashboard shows "Create your first event" form. [OK]
- **Create event:** name (required), location, status, start/end date, description. Generates a 6-character join code (no 0/O/1/I/L). Registers the creator into the event. [VERIFY] with rules deployed.
- **New student/company, no events:** dashboard shows "Join your event" code form. [OK]
- **Join by code:** uppercases, strips spaces, rejects unknown code and ended events, creates registration (and a zeroed analytics doc for students). [OK]
- **Joined events appear in the list.** [VERIFY, HIGH RISK] `listEventsForProfile` uses a collection-group query on `registrations` filtered by `profile_id`. The only collection-group rule is `allow read: if isMe(profileId)` keyed on the document id, which Firestore cannot prove from a field filter, so this query is likely rejected with permission-denied. If so, students and companies stay stuck on "Join your event" forever after joining. Test this first on the live project.
- Events list: status badge, location, date, copyable join code, "Open console", "Switch to this event". [OK]
- **Edit event** (rename, change status to live/ended). [DEAD] `updateEvent` exists in `lib/events.ts` but no UI calls it. Event status can never change after creation.
- Leave event / delete event. Not built.
- **Checklist items for new events.** [BROKEN] Checklists are loaded by `event_id`, but creating an event never seeds `checklist_items`. Every new event has an empty checklist and student readiness is always 0%.

---

## 7. Student dashboard (`/dashboard/student`, `StudentDashboard.tsx`)

- Header with event badge, name, stats: Readiness %, Resume score %, Profile complete %. [PARTIAL] Readiness is always 0 on new events (see 6).
- **My QR** (`QRCard.tsx`): QR of `/scan/student/{id}?eventId=...`, Download PNG, Share (native share or copy link). [OK] Test scanning it from another phone.
- **Checklist** (`Checklist.tsx`): phased items, manual toggle, auto-ticked items from real activity (resume uploaded, scans, messages). [BROKEN] empty on new events.
- **"AI resume analysis" card**: score and suggestions from `lib/resume.ts`. [FAKE] rule-based, not AI. Rename.
- **Companies to visit / matched companies**: registered companies ranked by overlap with your skills, link to company profile. [OK] needs companies to have filled roles/skills.
- **Recruiter activity**: scans of you and shortlists. [OK]
- **Manual** (`ManualSection.tsx`): role how-to guide. [OK]

---

## 8. Company dashboard (`/dashboard/company`)

- Header: event title, booth number, org name, "Scan students" button. [OK]
- Stats: Students scanned, Shortlisted, Priority, Maybe, Open roles. [OK]
- **Export button.** [DEAD] no click handler.
- **"This event" card** shows a "Live" badge regardless of real event status. [FAKE]
- **Company QR** to `/scan/company/{id}?eventId=...`, download and share. [OK]
- **Checklist.** [BROKEN] empty on new events.
- **Scanned students list** with resume score and "View profile". [OK]
- **Filter chips** (Degree, Graduation Year, Skills, Readiness, Resume, Stage). [DEAD] static labels, not clickable.
- **Candidate pipeline** bar chart. [OK]
- Link to Event console. [OK]
- Manual. [OK]

---

## 9. Event manager / college dashboard (`/dashboard/event-manager`, `EventManagerDashboard.tsx`)

- Header badge "{event} · Live Monitor" with pulse, shown regardless of real status. [FAKE]
- Stats: Registered students, Companies, Total scans, Shortlists. [OK]
- **Readiness analytics**: avg resume, resume-ready count, need-help count. [OK]
- **Live scan monitor**: recent scans list. [PARTIAL] loads once, not live. Needs refresh to update.
- **Company engagement table**: booth, student scans, shortlisted. [OK]
- **Students needing attention** (engagement below 40). [BROKEN] `engagement_score` is written as 0 on join and never updated anywhere, so every student is always listed.
- **Post-event outcome report** (`OutcomeReportCard.tsx`, `lib/report.ts`): headline numbers for everyone, CSV export for Pro, upgrade button for Free. [OK] [VERIFY] Stripe config.
- **Checklist.** [BROKEN] empty on new events.
- Manual. [OK]
- No way to invite, remove or check in attendees. Check-in (`checked_in`) is set false on join and never changed. [PARTIAL]

---

## 10. Event console (`/events/[eventId]`, `EventConsole.tsx`)

Role-aware page with tabs. Test once per role.
- Header: status badge (defaults to "Live now" if status missing), counts, Scanner button. [OK]
- **Overview tab**: students see "Companies to visit first", companies see "Recommended students", managers see readiness overview and students needing attention. [OK] manager list has the same bug as 9.
- **People tab**: search + filter chips (sector for students, graduation year for companies). Companies can pre-shortlist students (priority / shortlisted / maybe / not a fit). [OK]
- **My QR tab** (students, companies). [OK]
- **Checklist tab.** [BROKEN] empty on new events.
- **Manual tab.** [OK]
- Opening a console for an event you did not join: page still loads data. [VERIFY] decide if that should be blocked.

---

## 11. Profile (`/dashboard/profile`)

### 11.1 Student career profile (`StudentProfileEditor.tsx`)
- Fields: degree, graduation year, university, LinkedIn, portfolio, GitHub, skills (comma list), bio. Save with toast. [OK]
- Résumé upload (PDF/DOC/DOCX, 10MB limit in storage rules), view link. [VERIFY] Storage rules deployed and bucket configured.
- Live resume score ring. [OK] rename "AI".

### 11.2 Company profile (`CompanyProfileEditor.tsx`)
- Fields: company name, booth, sector, industry, website, logo URL, hiring roles, skills wanted, description. [OK]
- Brochure upload (PDF). [VERIFY] storage config.
- Profile completeness %. [OK]

### 11.3 Event manager
- Shows "no booth profile to edit" message. [PARTIAL] no way to edit institution name or account details.

### 11.4 Missing for all roles
- Change email, change password while signed in, delete account. Not built.

---

## 12. Messages (`/dashboard/messages`)

- Inbox grouped by conversation, newest first, scoped to the active event. [OK]
- Thread view, Enter to send, Shift+Enter newline, optimistic send. [OK]
- Mark as read on open, clears sidebar badge. [OK]
- Mobile list/thread toggle with back button. [OK]
- Start a conversation: only from a scanned profile ("Message" on scan views). [OK]
- New incoming messages do not appear until reload. [PARTIAL] no real-time listener.
- Failed send is not reported, the optimistic message stays. [PARTIAL]

---

## 13. Scan history (`/dashboard/scans`)

- Lists incoming and outgoing scans for the active event with names and dates. [OK]
- **Not linked from any sidebar.** [PARTIAL] only reachable by typing the URL.

---

## 14. Scanner and scanned profiles

### 14.1 Scanner (`/scan`, `Scanner.tsx`)
- No active event: prompt with link to `/dashboard/events`. [OK]
- Camera scan: BarcodeDetector where supported, jsQR fallback (iOS Safari). [VERIFY] test on iPhone Safari and Android Chrome, HTTPS only.
- Camera permission denied message. [OK]
- Paste a QR link or ID and Open. [OK]
- Tap-to-open list of registered students/companies. [OK]

### 14.2 Student profile view (`/scan/student/[id]`, `StudentScanView.tsx`)
- Signed out: `ViewerGate` asks to sign in or sign up. [OK]
- Company viewing: records a scan, shows profile, resume/portfolio/LinkedIn links, shortlist actions, private notes, send message, scan history. [OK]
- Event manager viewing: engagement stats and which companies scanned the student. [OK] stats are always 0 (see 9).

### 14.3 Company profile view (`/scan/company/[id]`, `CompanyScanView.tsx`)
- Student viewing: records a scan, shows company, roles, website, brochure, send message. [OK]
- **Save / Interested / Visited / Request follow-up toggles and personal note.** [PARTIAL] stored only in the browser's localStorage. The company never sees "Request follow-up", and it is lost on another device.
- Event manager viewing: company scan and shortlist stats, manager note. [OK]

---

## 15. Payments backend

- `POST /api/checkout`: verifies the profile is an event manager, creates Stripe subscription checkout. [VERIFY] env vars.
  - [SECURITY] It trusts `profileId` from the request body without checking the caller's Firebase ID token. Low impact (someone could open a checkout for another college) but should verify the token.
- `POST /api/stripe/webhook`: signature-verified, writes `subscriptions/{profileId}` on completed, updated, deleted. [VERIFY] webhook endpoint registered in Stripe with the three events.
- `isPro` treats `past_due` as Pro and checks period end. [OK]

---

## 16. Security rules (`firestore.rules`, `storage.rules`)

- [SECURITY, HIGH] **Role self-promotion.** `profiles/{id}` allows the owner to update any field, including `role`. A student can set `role: "event_manager"` and gain manager rights everywhere below.
- [SECURITY] `registrations` and `analytics` writes allow any event manager on any event, not just the event's creator.
- [SECURITY] `checklist_items` writable by any event manager for any event.
- [SECURITY] Students can write their own `analytics` doc, so engagement numbers can be self-inflated once they are used.
- [VERIFY, HIGH] Collection-group read on `registrations` (see 6).
- Storage: owner-only upload by filename prefix, 10MB, allowed folders. [OK]
- Deploy with `npx firebase deploy --only firestore:rules,firestore:indexes,storage`. [VERIFY] live rules match the repo.

---

## 17. Order of work

**Phase 1: make the core loop work (blocks all real use)**
1. Test join flow end to end (section 6). Fix the registrations collection-group rule if it fails.
2. Lock `role` in the profiles rule. Scope manager writes to the event creator.
3. Seed default checklist items when an event is created.
4. Add event list access and event editing (status to live/ended) to the nav.

**Phase 2: remove dead and fake UI**
5. Wire or remove: company Export, company filter chips, dashboard search, pricing "Start free".
6. Replace hardcoded "Live" badges with real event status.
7. Compute or remove `engagement_score` and "Students needing attention".
8. Fix navbar links on `/pricing`, add Scan history to the sidebar.

**Phase 3: launch requirements**
9. Privacy Policy, Terms, Contact pages and footer links. Remove or build every `#` footer link.
10. Replace landing fake metrics and real brand names with clearly labelled sample data or real pilot numbers.
11. Remove em dashes from visible copy, rename "AI resume analysis".
12. Custom domain, update `SITE_URL`, Firebase reset Action URL, Stripe webhook URL.
13. Delete unused `public/*.svg` starter files.

**Phase 4: polish**
14. Real-time messages and scan monitor (Firestore listeners).
15. Stripe success/cancel messages, enforce Free plan event limit, build or drop YoY comparison.
16. Return-to-URL after sign in from a scanned QR, redirect signed-in users away from `/sign-in`.
17. Account settings (email, password, delete account), email verification.
