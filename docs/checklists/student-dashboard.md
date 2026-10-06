# Student dashboard checklist

Scope: `/dashboard/student` and its pages (`schedule`, `passport`, `applications`), the career profile at `/dashboard/profile`, and the host-side Sessions tab on `/events/[eventId]` that feeds the student schedule.

Goal: everything the landing page shows a student is real in the dashboard. Remaining gaps are listed in `features-to-build.md`.

Status key as in `landing-page.md`.

## Progress: 29 / 33 done, 4 need a real device, the live database or the go-live step

## Before deploying

- [ ] **Apply the new schema to the live Neon database.** `npm run db:migrate` adds `events.timezone` and the `student_scores` table. Additive; until then the live site keeps working as before.
  `db/schema.sql` · Verify live
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

## Coding profiles and test scores

- [x] **Verified LeetCode and Codeforces profiles.** Neither site lets a user sign in to another app, so the student proves the account is theirs on the site itself: a one-time code in their LeetCode Summary, or a Codeforces submission to problem 4A that fails to compile (it doesn't touch their rating). Only then is the profile shown to anyone else, and a handle can be verified on one account only. Stats are read from the sites, never from the browser: LeetCode problems solved by difficulty, contest rating, top percentage and contests; Codeforces rating, rank, best rating and rated contests. The student can refresh them (at most every 10 minutes). Tested with fakes for every path and against the real sites' public data.
  `lib/server/coding.ts`, `components/dashboard/StudentScores.tsx`, `components/scan/VerifiedScores.tsx` · Done in "Add event time zones, coding profiles and test scores"
- [x] **Test scores.** GRE, GMAT, TOEFL, IELTS, Duolingo, PTE, SAT, ACT, GATE, CAT or any other test, checked against each exam's real score range. None of these exams lets another site check a score, so employers see them marked "Self-reported".
  `lib/scores.ts` · Done in "Add event time zones, coding profiles and test scores"
- [ ] **LeetCode and Codeforces from Cloudflare.** Checked from a normal server so far. Confirm on a preview version that both sites answer requests from Cloudflare's network before going live.
  Verify live

## Employer privacy

Colleges want their students hired, so employers see strengths, never assessments. See the decision in `features-to-build.md`.

- [x] **Scores and engagement are student and college only.** Résumé score, readiness, analytics, engagement, leaderboard and other people's scans are refused by the API for employers. The employer's view of a student shows goals, projects, skills and links instead of a score and an improvement list. The hard-coded "Checked in" badge is gone.
  `lib/server/rpc.ts`, `components/scan/StudentScanView.tsx`, `components/dashboard/EventConsole.tsx` · Done in "Keep student assessments away from employers"
- [x] **Shortlist decisions stay with their owner.** A company sees only its own decisions and notes. A student sees only who shortlisted them, without notes. Previously any account could read every company's "not a fit" and private notes.
  `lib/server/rpc.ts` · Done in "Keep student assessments away from employers"
- [x] **Company candidate tools.** Real filters replaced the decorative chips (which listed Readiness and Resume), the dead Export button became a CSV export, and bulk follow-up is limited to students that company scanned or shortlisted.
  `components/dashboard/CompanyCandidates.tsx` · Done in "Keep student assessments away from employers"

- [x] **Courses and scores follow the profile's visibility.** Main now shows a student's profile only to people who share an event with them. Coursera courses, coding profiles and test scores were still readable by any signed-in account; they now follow the same rule.
  `lib/server/rpc.ts` · Done in "Show courses and scores only to people who share an event"

## Verify on the live site

- [ ] **Two-account run on real phones.** Student books a full session, organiser marks attendance, student sees the passport stop and score change.
  Verify live
- [x] **Session times across time zones.** Times used to follow each viewer's device, so a student whose phone was on another zone, or an organiser setting up from another city, saw different times for the same session. Events now store a time zone (picked on creation, defaulting to the organiser's), sessions are entered and shown in it, and the schedule says so when the viewer's device is on another zone. Older events without one ask the organiser to set it. Interview times name their zone. Tested with an organiser in New York and a student in London for an event in India: both see 10:00.
  `lib/format.ts`, `components/dashboard/SessionManager.tsx`, `components/ui/TimeZoneSelect.tsx` · Done in "Add event time zones, coding profiles and test scores"
- [x] **Event dates shifted a day west of London.** A 1 October event showed as 30 September in the Americas, because the date was read as midnight UTC in the viewer's zone. Event dates are now shown as calendar dates.
  `lib/format.ts` · Done in "Add event time zones, coding profiles and test scores"
