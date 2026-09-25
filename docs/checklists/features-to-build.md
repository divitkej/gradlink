# Features to build

Features the public site shows or promises that the app does not have yet. They stay on the landing page by decision (the mockups are labelled "Product preview · sample data"), so each one needs building before launch or its mention removed.

Audited against `db/schema.sql`, `lib/db.ts` and the dashboards.

## What exists today (for reference)

- Student career profile: degree, graduation year, skills, résumé upload, LinkedIn, GitHub, portfolio, bio
- Résumé score: rule-based (`lib/resume.ts`), scores skills, education, links, résumé, bio. Not AI.
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
| Interview tracking (invites, bookings) | Analytics funnel, Employer CRM pipeline and actions ("Invite to Interview"), Hero dashboard, Product reveal, Journey step 03 and 04, Platform tab "Employer CRM" | No interview table or status |
| Offer tracking and placement rate | Analytics funnel, stats panels, Hero dashboard, Product reveal, Journey step 04 | No offers table |
| Event ROI score | Analytics stats | No formula or data |
| Competency readiness breakdown (communication, technology, and so on) | Readiness section bars, Hero dashboard panel | Only the résumé score exists |
| Overall readiness score and profile-complete percentage | Readiness rings, Platform tab "Career Readiness Hub" | Checklist progress exists, a single score does not |
| Mock interviews | Readiness actions, Hero schedule, Platform tab, Journey step 01, Why GradLink card | |
| Workshops and sessions | Hero schedule, Product reveal schedule, Live Event passport, Analytics activity chart, Journey step 02 | |
| Live event schedule | Hero dashboard, Product reveal | |
| Digital event passport | Live Event section, Platform tab "Live Event Mode", Journey step 02 | Scans exist, a passport view does not |
| Engagement leaderboard | Live Event section | `engagement_score` exists, no ranked view |
| Booth queues and waitlists, 1:1 recruiter slots | Platform tab "Live Event Mode", Journey step 02 | |
| Company matching ("Matched companies") | Hero dashboard | |
| Candidate filters (degree, graduation year, GPA, skills, readiness, résumé score, activity, stage) | Employer CRM filter chips | Check which filters the company dashboard supports; GPA is not stored |
| Candidate stages "Contacted", "Interview", "Offer" | Employer CRM pipeline, Platform tab CRM mini | Real stages are shortlisted, priority, maybe, not a fit |
| Bulk messages | Why GradLink card "Helps employers follow up faster" | Only one-to-one messages |
| CSV export for companies | Employer CRM "Export CSV" | Only the college outcome report exports CSV |
| Applications | Journey step 03 | |
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
