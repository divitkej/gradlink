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
| Interview tracking (invites, bookings) | Analytics funnel, Employer CRM pipeline and actions ("Invite to Interview"), Hero dashboard, Product reveal, Journey step 03 and 04, Platform tab "Employer CRM" | Students log their own interviews in the application tracker. Companies cannot invite to interview yet, and colleges do not see interview counts |
| Offer tracking and placement rate | Analytics funnel, stats panels, Hero dashboard, Product reveal, Journey step 04 | Students log offers in the application tracker (private to them). No college-facing offer count or placement rate yet |
| Event ROI score | Analytics stats | No formula or data |
| Booth queues | Platform tab "Live Event Mode", Journey step 02 | Session waitlists and 1:1 recruiter slots are built; a live queue at a booth is not |
| Candidate filters (degree, graduation year, GPA, skills, readiness, résumé score, activity, stage) | Employer CRM filter chips | Check which filters the company dashboard supports; GPA is not stored |
| Candidate stages "Contacted", "Interview", "Offer" | Employer CRM pipeline, Platform tab CRM mini | Real stages are shortlisted, priority, maybe, not a fit |
| Bulk messages | Why GradLink card "Helps employers follow up faster" | Only one-to-one messages |
| CSV export for companies | Employer CRM "Export CSV" | Only the college outcome report exports CSV |
| Alumni mentoring, internships | Why GradLink card "Useful all year round" | |
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
