# Student dashboard checklist

Scope: `/dashboard/student` and its pages (`schedule`, `passport`, `applications`), the career profile at `/dashboard/profile`, and the host-side Sessions tab on `/events/[eventId]` that feeds the student schedule.

Goal: everything the landing page shows a student is real in the dashboard. Remaining gaps are listed in `features-to-build.md`.

Status key as in `landing-page.md`.

## Progress: 23 / 25 done, 2 need a real device or the go-live step

## Before deploying

- [x] **Schema applied to the live Neon database.** `npm run db:migrate` on 2026-09-29, after merging main: 30 tables, including `event_sessions`, `session_bookings`, `saved_companies`, `applications`, `notifications`, `interview_invites`, `booth_queue` and `student_courses`. Additive only; the live site kept working throughout.
  `db/schema.sql` · Done on 2026-09-29, no commit (database change)
- [x] **Tested live on a preview version.** Uploaded with `npm run upload` as Worker version `1efa9168` (preview URL only, production traffic untouched). With three short-lived test accounts against the live database and coursera.org: event creation and its 18-item student checklist, session booking, the student overview, a Coursera course added, someone else's certificate and a fake link refused, the employer view showing the course and no scores, and the API refusing student analytics to an employer. All 15 checks passed; the test accounts and event were deleted afterwards.
  Done on 2026-09-29
- [ ] **Put the branch live.** Merge the PR into main, then `NEXT_PUBLIC_SITE_URL=https://gradlink.divitkej.workers.dev npm run deploy` (or promote version `1efa9168` with `wrangler versions deploy`).
  Verify live

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

## Student side, second pass

- [x] **Interview invites and bookings.** Company proposes up to five times; the student picks one, which books the interview into their applications (updating an existing application for that role rather than duplicating it). Only students the company scanned or shortlisted can be invited, one open invite at a time.
  Done in "Finish the student side: invites, queues, alerts, opportunities"
- [x] **Booth queues.** Only while the event is live, up to 3 queues per student, re-joining goes to the back, the student's page checks for their turn every 20 seconds.
  Done in "Finish the student side: invites, queues, alerts, opportunities"
- [x] **Notifications.** Interview invites and replies, a waitlist place opening up, and "It's your turn". The bell counts these and unread messages.
  Done in "Finish the student side: invites, queues, alerts, opportunities"
- [x] **Opportunities.** Every open role at the event, target-role matches first, internships marked, "I applied" adds it to applications.
  Done in "Finish the student side: invites, queues, alerts, opportunities"
- [x] **Alumni mentoring sessions.** New session type, counted toward Communication.
  Done in "Finish the student side: invites, queues, alerts, opportunities"
- [x] **Event history and company connections** on the career profile, across every event the student joined.
  Done in "Finish the student side: invites, queues, alerts, opportunities"

## Coursera courses

- [x] **Verified Coursera certificates and courses in progress.** Coursera has no API for a learner to share their own courses (its learner API is only for Coursera for Business and Campus customers), so students paste a certificate link and the Worker reads the facts from Coursera's public verify page: course, issuer, completion date and skills. The name on the certificate must match the student's GradLink name, and a certificate can sit on one account only. Courses in progress are checked against Coursera's catalog and shown as "Currently taking". The student picks which ones employers see, and can add the course's skills to their profile in one click. Tested against live coursera.org pages.
  `lib/server/coursera.ts`, `components/dashboard/StudentCourses.tsx`, `components/scan/VerifiedCourses.tsx` · Done in "Verify Coursera certificates on the student profile"
- [x] **Coursera check from Cloudflare.** A temporary Worker running this code on Cloudflare's network (deployed, tested, then deleted) read real certificates, the course catalog and issuer names from coursera.org in under a second each. It also runs in the local Workers runtime, the Cloudflare build succeeds, and a certificate page costs under 1 ms of CPU to parse. A Coursera outage shows "Coursera didn't respond", never "no such course".
  `lib/server/coursera.ts` · Done in "Tell a Coursera outage apart from a missing course"

## Employer privacy

Colleges want their students hired, so employers see strengths, never assessments. See the decision in `features-to-build.md`.

- [x] **Scores and engagement are student and college only.** Résumé score, readiness, analytics, engagement, leaderboard and other people's scans are refused by the API for employers. The employer's view of a student shows goals, projects, skills and links instead of a score and an improvement list. The hard-coded "Checked in" badge is gone.
  `lib/server/rpc.ts`, `components/scan/StudentScanView.tsx`, `components/dashboard/EventConsole.tsx` · Done in "Keep student assessments away from employers"
- [x] **Shortlist decisions stay with their owner.** A company sees only its own decisions and notes. A student sees only who shortlisted them, without notes. Previously any account could read every company's "not a fit" and private notes.
  `lib/server/rpc.ts` · Done in "Keep student assessments away from employers"
- [x] **Company candidate tools.** Real filters replaced the decorative chips (which listed Readiness and Resume), the dead Export button became a CSV export, and bulk follow-up is limited to students that company scanned or shortlisted.
  `components/dashboard/CompanyCandidates.tsx` · Done in "Keep student assessments away from employers"

## Verify on the live site

- [ ] **Two-account run on real phones.** Student books a full session, organiser marks attendance, student sees the passport stop and score change.
  Verify live
- [ ] **Session times across time zones.** Times are entered and shown in the viewer's local time. Confirm with the organiser's real time zone.
  Verify live
