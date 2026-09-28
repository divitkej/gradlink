# Student dashboard checklist

Scope: `/dashboard/student` and its pages (`schedule`, `passport`, `applications`), the career profile at `/dashboard/profile`, and the host-side Sessions tab on `/events/[eventId]` that feeds the student schedule.

Goal: everything the landing page shows a student is real in the dashboard. Remaining gaps are listed in `features-to-build.md`.

Status key as in `landing-page.md`.

## Progress: 11 / 14 done, 3 need the live database or site

## Before deploying

- [ ] **Apply the schema to Neon before the new code goes live.** Run `npm run db:migrate`. It adds `event_sessions`, `session_bookings`, `saved_companies`, `applications`, three student columns and `seed_event_checklist()`, and backfills a default checklist for every event that has none. `createEvent` calls the new function, so creating an event fails until this has run.
  `db/schema.sql` · Verify live

## Built

- [x] **Career Readiness Hub.** Overall readiness score with its weights shown, profile-complete percentage, six competency scores with the evidence behind each and links to fix them, personalised action plan, Fair-Ready badge.
  `lib/readiness.ts`, `components/dashboard/StudentReadiness.tsx` · Done in "Complete the student dashboard against the landing page"
- [x] **Career profile: goal, target roles, projects.** Up to 10 projects with link and description.
  `components/dashboard/StudentProfileEditor.tsx` · Done in "Complete the student dashboard against the landing page"
- [x] **Sessions, booking and waitlists.** Workshops, mock interviews, company sessions, 1:1 recruiter slots, networking and talks. Booking locks the session row so two students cannot take the last place (tested with 12 students racing for 3 places). Cancelling promotes the longest-waiting student.
  `lib/server/rpc.ts`, `components/dashboard/StudentSchedule.tsx`, `components/dashboard/SessionManager.tsx` · Done in "Complete the student dashboard against the landing page"
- [x] **Live schedule and event plan.** Filter by type, live and finished states, waitlist position, clash warnings, booked sessions and saved companies by booth with "Mark visited".
  `components/dashboard/StudentSchedule.tsx` · Done in "Complete the student dashboard against the landing page"
- [x] **Digital passport, engagement score, leaderboard.** Engagement is computed live from scans, shortlists, sessions and messages, with the points shown. Other students appear by first name and last initial.
  `components/dashboard/StudentPassport.tsx`, `lib/engagement.ts` · Done in "Complete the student dashboard against the landing page"
- [x] **Matched companies.** Match percentage from skills and target roles, with the reason and "Save to plan".
  `lib/readiness.ts`, `components/dashboard/StudentDashboard.tsx` · Done in "Complete the student dashboard against the landing page"
- [x] **Application tracker.** Applied, interviewing, offer, accepted, not selected, withdrawn, with interview dates and notes. Private to the student.
  `components/dashboard/StudentApplications.tsx` · Done in "Complete the student dashboard against the landing page"
- [x] **Saved companies in the database.** Save, interested, visited, follow-up and notes moved from localStorage to `saved_companies`. Existing browser copies move across the first time the student opens that company.
  `components/scan/CompanyScanView.tsx` · Done in "Complete the student dashboard against the landing page"
- [x] **New events had an empty checklist.** Only the old demo event had checklist items, so every student's checklist and readiness sat at zero. Every event now gets the default checklist, with new auto-tracked items for check-in, booking a prep session and logging applications.
  `db/schema.sql`, `components/dashboard/Checklist.tsx` · Done in "Complete the student dashboard against the landing page"
- [x] **Honest labels and copy.** "AI resume analysis" relabelled "Résumé check · Rule-based" (the score is not AI). Em dashes and emoji removed from dashboard copy. Dead header search box removed. Pill-shaped tab buttons squared off.
  Done in "Complete the student dashboard against the landing page"
- [x] **Automated check.** Production build driven by Playwright at 1440px and 375px against the real server code on Postgres 16: every student page loads with no console errors and no horizontal scroll, and booking, waitlisting, saving, applications, profile edits and host attendance all persist.
  Done in "Complete the student dashboard against the landing page"

## Verify on the live site

- [ ] **Two-account run on real phones.** Student books a full session, organiser marks attendance, student sees the passport stop and score change.
  Verify live
- [ ] **Session times across time zones.** Times are entered and shown in the viewer's local time. Confirm with the organiser's real time zone.
  Verify live
