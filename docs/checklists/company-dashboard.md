# Company dashboard checklist

Scope: `/dashboard/company`, the company profile at `/dashboard/profile`, company messages, the Students tab on `/events/[eventId]`, and the scan pages a company uses (`/scan/student/[studentId]`) or that students use to reach a company (`/scan/company/[companyId]`).

Started from the company items on the RoadMap#1 launch board (C1 to C7, Q4, Q5, G3, G4). Every item was checked in a browser run: a college creates an event, a student and a company join with their codes, the company scans, shortlists, writes a note and messages, the student marks the company and replies. Runs used a throwaway Neon branch, never the live database.

Status key as in `landing-page.md`.

## Progress: 15 / 16 done

## Broken

- [x] **Pre-shortlisting from the event console deleted the recruiter's note.** Marking a student Priority, Shortlist or Maybe on the Students tab sent no note, and the server overwrote the saved one with nothing. A status change without a note now keeps the existing note; clearing a note on purpose still works.
  `lib/server/rpc.ts` · Done in "Fix the company-side problems found in the live test"
- [x] **A note typed while the student page was still loading could be wiped.** The page reloaded itself whenever the session object was refreshed and reset the note and decision. It now reloads only when the account changes, and never overwrites a note or decision the recruiter has already touched.
  `components/scan/StudentScanView.tsx` · Done in "Fix the company-side problems found in the live test"
- [x] **"Live" badge showed for events that had not started (C3).** Both badges now show the real status (Upcoming, Live now, Ended).
  `app/dashboard/company/page.tsx` · Fixed on main before this checklist, confirmed in the browser run

## Dead or misleading

- [x] **Export button did nothing (C1).** Export CSV now downloads the shown candidates with stage, notes and links.
  `components/dashboard/CompanyCandidates.tsx` · Fixed on main before this checklist, confirmed in the browser run
- [x] **Filter chips were plain labels (C2).** Search plus degree, year, skill, target role and stage filters now work.
  `components/dashboard/CompanyCandidates.tsx` · Fixed on main before this checklist, confirmed in the browser run
- [x] **"Checked in" showed on every student a company opened.** It now only shows to college staff, from a real check-in scan.
  `components/scan/StudentScanView.tsx` · Fixed on main before this checklist, confirmed in the browser run
- [x] **Real brand names as profile placeholders.** "Ride-hailing & Delivery" and "careem.com" replaced with generic examples.
  `components/dashboard/CompanyProfileEditor.tsx` · Done in "Fix the company-side problems found in the live test"
- [x] **"1 roles posted".** Singular when a company has one role.
  `app/dashboard/company/page.tsx` · Done in "Fix the company-side problems found in the live test"

## Partial

- [x] **Student interest never reached the company (Q5).** Interested and Request follow-up were saved but no company screen showed them. The company dashboard now has a "Students interested in you" panel, follow-up requests first. Only those two marks are shared; Save, Visited and the student's note stay private, and the student page says so. Students and companies outside the event are refused.
  `lib/server/rpc.ts`, `lib/db.ts`, `components/dashboard/CompanyInterest.tsx`, `components/scan/CompanyScanView.tsx`, `components/legal/PrivacyPolicy.tsx` · Done in "Fix the company-side problems found in the live test"
- [x] **New messages needed a reload (G3).** The inbox checks for new messages every 15 seconds while the tab is open and when you come back to it.
  `app/dashboard/messages/page.tsx` · Done in "Fix the company-side problems found in the live test"
- [x] **A failed send stayed on screen as if delivered (G4).** It is now taken out of the thread, the text goes back in the box and an error says it was not sent.
  `app/dashboard/messages/page.tsx` · Done in "Fix the company-side problems found in the live test"
- [x] **Student saves lived only in the browser (Q5, first half).** Saves are stored in `saved_companies`, and old browser saves move there on first visit.
  `components/scan/CompanyScanView.tsx` · Fixed on main before this checklist, confirmed in the browser run

- [x] **The company page reset itself and over-counted booth visits.** A student's view of a company reloaded whenever the session refreshed (it watched the whole session object), resetting their saves and note; and the college's "Students who scanned this booth" counted scans, so a student who scanned twice counted twice. The page now reloads only for a different person, and the figure counts students.
  `components/scan/CompanyScanView.tsx` · Done in "Stop the company page resetting and count booth visitors once"

## Owner decisions

- [x] **Companies could see every registered student's email before scanning them.** By owner decision, a company now gets a student's email only after it has scanned that student. Before that, profiles, the event's student list and the candidate CSV leave the email out. College staff still see it.
  `lib/server/rpc.ts`, `lib/db.ts`, `components/dashboard/CompanyCandidates.tsx`, `components/legal/PrivacyPolicy.tsx` · Done in "Show companies a student's email only after scanning them"
- [x] **Opening a student's page counted as a scan.** In-app links ("View", the scanner's attendee list) open the same page a QR scan opens, and that page recorded a scan, so a company could click through every student to get their emails, and a college viewing a student checked them in. A QR now carries the person's scan key (`&k=`, derived from `AUTH_SECRET`), and the server only records a scan with the right key. Opening a profile from the app is a view.
  `lib/server/session.ts`, `lib/server/rpc.ts`, `components/dashboard/QRCard.tsx`, `components/scan/StudentScanView.tsx`, `components/scan/CompanyScanView.tsx` · Done in "Count a scan only when the QR's scan key comes with it"
- [ ] **Put the fixes live.** Merge the PR into main, then deploy from main.
  Verify live
