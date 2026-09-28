# Features to build

Features the public site shows or promises that the app does not have yet. They stay on the landing page by decision (the mockups are labelled "Product preview · sample data"), so each one needs building before launch or its mention removed.

Audited against `db/schema.sql`, `lib/db.ts` and the dashboards.

## What exists today (for reference)

- Student career profile: degree, graduation year, skills, résumé upload, LinkedIn, GitHub, portfolio, bio
- Résumé score: rule-based (`lib/resume.ts`), scores skills, education, links, résumé, bio. Not AI, and labelled "Rule-based" everywhere it shows.
- Career goal, target roles and projects on the student profile
- Career Readiness Hub: overall readiness score, profile-complete percentage, six competencies (communication, technology, professionalism, teamwork, critical thinking, leadership) with the evidence behind each, a personalised action plan and the Fair-Ready badge (`lib/readiness.ts`, `components/dashboard/StudentReadiness.tsx`)
- Event sessions: workshops, mock interviews, company sessions, 1:1 recruiter slots, networking, talks. Organisers and companies publish them from the event page, students book them, full sessions have a waitlist that promotes automatically, hosts mark attendance
- Live event schedule and personal event plan (booked sessions plus saved companies by booth) at `/dashboard/student/schedule`
- Digital event passport, live engagement score and engagement leaderboard at `/dashboard/student/passport` (`lib/engagement.ts`)
- Company matching on skills and target roles, with save to plan
- Student application tracker with interview dates and outcomes (applied, interviewing, offer, accepted) at `/dashboard/student/applications`
- Saved companies, interest, booth visits and notes stored per event in the database (were localStorage)
- Manager analytics computed live from real activity (were stored rows seeded to zero)
- Interview invites: a company invites a student it met with up to five proposed times; the student picks one, which books it into their applications; either side is notified (`components/scan/InterviewInvite.tsx`, `components/dashboard/StudentApplications.tsx`)
- Live booth queues: students join from their plan or a company's page (up to 3 at once) and see their place; the company calls the next student, who is told it is their turn (`components/dashboard/QueueControl.tsx`, `components/dashboard/CompanyQueue.tsx`)
- In-app notifications for interview invites and replies, waitlist places and queue calls, behind the header bell (`/dashboard/notifications`)
- Opportunities: every open role at the event, ranked for the student, with internships marked and one-click tracking (`/dashboard/student/opportunities`)
- Alumni mentoring as a session type the college publishes and students book
- Event history and company connections on the career profile, across every event (`components/dashboard/StudentHistory.tsx`)
- Company candidate list with filters (degree, graduation year, skill, target role, stage), bulk follow-up messages to scanned or shortlisted students, and CSV export (`components/dashboard/CompanyCandidates.tsx`)

## Decision: employers see strengths, never assessments

Colleges are the customer and want their students hired, so nothing an employer sees should count against a student. Enforced in the API (`lib/server/rpc.ts`), not only hidden in the UI:

- Résumé score, readiness, competencies, engagement score, leaderboard and scan history are visible to the student and their college (the event's organiser) only.
- Employers see the profile the student chose to share: degree, year, skills, target roles, career goal, projects, résumé and links.
- A company sees only its own shortlist decisions and notes. A student sees only the companies that shortlisted them, never "maybe" or "not a fit", and never a company's notes.

So these are not planned for employers: filtering or sorting by readiness, résumé score, GPA or event activity. The landing page Employer CRM mockup was changed to match.
- Role checklists for before, during and after each event
- Events with join codes, statuses and check-in
- QR codes and two-way scanning, with notes
- Company shortlists: shortlisted, priority, maybe, not a fit, with notes
- Direct messages between students and companies
- Per-student event stats: profile views, company scans, shortlists, messages received, engagement score
- Outcome report with CSV export (Placement Pro)

## Not built yet

| Feature | Where the site shows it | Notes |
|---|---|---|
| Interview counts for colleges | Analytics funnel, Hero dashboard, Product reveal, Journey step 04 | Invites and bookings are built for students and companies; the college dashboard and outcome report do not count them yet |
| Offer tracking and placement rate | Analytics funnel, stats panels, Hero dashboard, Product reveal, Journey step 04 | Students log offers in the application tracker (private to them). No college-facing offer count or placement rate yet |
| Event ROI score | Analytics stats | No formula or data |
| Candidate stages "Contacted" and "Offer" | Employer CRM pipeline, Platform tab CRM mini | "Interview" now shows from invites; "Contacted" and "Offer" are not tracked for companies |
| Alumni accounts | Why GradLink card "Useful all year round" | Mentoring runs as college-published sessions and internships show on Opportunities; alumni cannot sign in as themselves |
| Year-over-year comparison | Pricing (Placement Pro) | |

## Removed from the footer until they exist

These footer links pointed nowhere. They were taken out and will come back once each has a page:

Career Profiles, Events Hub, Readiness Hub, Employer CRM (as separate pages), Find Events, Mock Interviews, Job Board, Post Roles, Manage Candidates, Book Fair Booth, Campus Partnerships, Talent Pipeline, Career Centre Dashboard, Workshop Tools, Alumni Network.

Also removed: LinkedIn, Twitter and Instagram (no accounts yet), and Privacy Policy, Terms of Service and Contact (no pages yet, see launch blockers).

## Claims to confirm

These are service promises, not features. Confirm each is true before launch or reword it.

| Claim | Where |
|---|---|
| "Setup in 48 hours" | CTA section |
| "No contract lock-in" | CTA section |
| "Dedicated onboarding" | CTA section |
| "UAE data residency" | CTA section. The app runs on Neon and Cloudflare; confirm the data region before keeping this |
| "GradLink Technologies LLC" | Footer copyright. Confirm the registered company name |
