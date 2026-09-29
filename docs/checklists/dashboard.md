# Dashboard checklist

Scope: signed-in pages (`app/dashboard/`, `app/events/`, `app/scan/`) and their components (`components/dashboard/`, `components/events/`, `components/scan/`), plus the 404 page.

Update this file in the same commit as the fix.

"Browser run-through" below means a Playwright run on the Workers runtime (`wrangler dev`) against Neon: a college creates an event, a student and a company join with the code, the company opens the student, shortlists, saves a note and messages, the student replies, the student saves a profile and uploads a résumé.

## Progress: 11 / 13 done

## Broken

- [x] **New events had no checklist.** Checklist items were only ever seeded for the old demo event, so every new event showed "0/0" (and students saw a loading spinner). New events now get the default checklist from `lib/server/checklist-template.ts` (15 student, 13 company, 10 college items); events without one get it the first time it is opened. A unique index stops duplicates.
  `lib/server/rpc.ts`, `lib/server/checklist-template.ts`, `db/schema.sql`, `components/dashboard/Checklist.tsx` · Done in "Fix the problems found in the site audit"
- [x] **Join code could not be found after creating an event.** It only appeared on `/dashboard/events`, which no sidebar link opens. It now shows, with a copy button, on the college overview and on the event page.
  `components/events/JoinCode.tsx`, `components/dashboard/EventManagerDashboard.tsx`, `components/dashboard/EventConsole.tsx` · Done in "Fix the problems found in the site audit"
- [x] **Opening a student without an active event caused a server error.** The scan was recorded against a missing event (500). Scans without an event are now skipped on both sides.
  `lib/server/rpc.ts`, `components/scan/StudentScanView.tsx`, `components/scan/CompanyScanView.tsx` · Done in "Fix the problems found in the site audit"
- [x] **Student profile page scrolled sideways on phones (46px).** Fields now stack below 640px and panel titles wrap.
  `components/dashboard/StudentProfileEditor.tsx`, `components/dashboard/widgets.tsx` · Done in "Fix the problems found in the site audit"

## Dead or misleading

- [x] **Dashboard search box did nothing.** Removed; there is no search feature behind it.
  `components/dashboard/DashboardShell.tsx` · Done in "Fix the problems found in the site audit"
- [x] **"AI résumé score" claims.** The score is rule-based (`lib/resume.ts`). Every "AI" label and sentence now says "résumé score" or "rule-based", and the student checklist item reads "Check your resume score".
  `components/dashboard/*`, `components/scan/StudentScanView.tsx`, `lib/resume.ts` · Done in "Fix the problems found in the site audit"
- [x] **College header said "Live Monitor" with a pulsing dot for events that had not started.** It now shows the real status (Draft, Upcoming, Live now, Ended).
  `components/dashboard/EventManagerDashboard.tsx`, `components/dashboard/EventConsole.tsx` · Done in "Fix the problems found in the site audit"
- [x] **"Everyone is engaged 🎉" with zero students.** Now "No students have registered yet." or "No students need attention right now.", no emoji. Symbol icons (★, ✓) replaced with words or a proper icon.
  `components/dashboard/EventConsole.tsx`, `components/dashboard/StudentDashboard.tsx`, `components/landing/SpatialShowcaseSection.tsx` · Done in "Fix the problems found in the site audit"
- [x] **"Upgrade to Placement Pro" showed a developer message** ("Add STRIPE_SECRET_KEY and STRIPE_PRICE_PRO"). It now tells the college to email the operator to upgrade.
  `app/api/checkout/route.ts` · Done in "Fix the problems found in the site audit"

## Copy and polish

- [x] **Em dashes in visible copy.** All 39 outside code comments replaced, including "—" used for missing values ("Booth —" is now "Booth not set", blank in CSV exports). Raw "qr" in scan history now reads "QR scan".
  `app/dashboard/*`, `components/*`, `lib/report.ts`, `lib/resume.ts`, `lib/db.ts` · Done in "Fix the problems found in the site audit"
- [x] **Unbranded 404 page.** Unknown addresses now show the site navbar and footer with links home and to sign in.
  `app/not-found.tsx`, `components/site/NotFound.tsx` · Done in "Fix the problems found in the site audit"
- [ ] **Pill shapes on labels and tabs.** Section badges on the landing page, role chips, the manual tabs and "Back to site" are fully rounded. Left as they are by decision for now.
  Tracked
- [ ] **Several Claude sessions deploy to the same Worker.** Each `npm run deploy` replaces the whole live site with that session's branch, so work from other branches disappears from the live site until merged. Deploy only from `main` after merging.
  Owner decision
