# Organiser access checklist

Scope: how colleges, students and employers get into an event, the plan choice for colleges, and the owner dashboard at `/admin`. Covers `lib/server/rpc.ts`, `db/schema.sql`, `components/events/`, `components/dashboard/DashboardShell.tsx`, `components/dashboard/PlanPicker.tsx`, `components/dashboard/AttendeesCard.tsx`, `components/admin/`.

Update this file in the same commit as the fix. Tick the box, set the status, and note the commit.

"Harness check" means the real `lib/server/rpc.ts` ops run against Postgres 16 with `db/schema.sql` applied. "Browser check" means the real app driven in Chromium against that database.

## Progress: 6 / 9 done, 3 need the owner

## Built

- [x] **Separate codes for students and employers.** Every event has a student code and a different employer code, stored in `event_codes` (the code is the primary key, so no two codes are ever the same). Each only works for its own account type, and using the wrong one says which code to ask for. College accounts cannot join with a code. Existing events keep their old code as the student code and get a new employer code when the migration runs. Harness and browser check.
  Done in "Add separate student and employer codes, plan choice and owner dashboard"
- [x] **Organiser can replace a code.** "New code" on each code makes a fresh one; the old one stops working at once and people already in the event stay in. Owner only. Harness check.
  Done in "Add separate student and employer codes, plan choice and owner dashboard"
- [x] **Students and employers need a code before using the dashboard.** Every dashboard page shows the join form until they have joined an event, except the events page, which is where they enter it. Browser check: the profile page is gated, a wrong code is refused, the right one opens it.
  Done in "Add separate student and employer codes, plan choice and owner dashboard"
- [x] **Organiser sees who joined.** The event dashboard has an Attendees table: name, student or employer, university or company, degree and year or sector and booth, email and when they joined, with filters and search. Owner only. Harness and browser check.
  Done in "Add separate student and employer codes, plan choice and owner dashboard"
- [x] **Colleges choose a plan after signing in.** The first time a college account opens its dashboard it must pick Starter or Placement Pro. Pro goes to Stripe Checkout; choosing Pro does not unlock anything until Stripe confirms payment. A college that already pays is not asked. Harness and browser check.
  Done in "Add separate student and employer codes, plan choice and owner dashboard"
- [x] **Owner dashboard at `/admin`.** Site health (database response time, server errors in the last hour and day, scans in the last hour), events happening now with scans in the last 15 minutes and a warning when a live event goes quiet for 20 minutes, totals, and every college with its plan and every event's dates, location, both codes and activity. Refreshes every 30 seconds while visible. Anyone not listed in `ADMIN_EMAILS` sees "Page not found". Server errors (500s) are now saved to `app_errors` for this page. Harness and browser check.
  Done in "Add separate student and employer codes, plan choice and owner dashboard"

## Owner actions before deploying

- [ ] **Run the migration before deploying this code.** `npm run db:migrate` creates `event_codes`, gives every existing event its codes, adds the plan columns and creates `app_errors`. The new code needs these tables; it is safe to run more than once.
- [ ] **Sign up with your own email, then set `ADMIN_EMAILS`.** `npx wrangler secret put ADMIN_EMAILS` with your email. Sign-up does not verify email ownership, so create the account first, or someone else could register that address and see the owner dashboard.
- [ ] **Decide whether Starter really means one live event.** The pricing page promises one live event on Starter, but nothing enforces it yet. Either enforce it in `createEvent` or change the plan copy in `lib/billing.ts`.

Existing college accounts will see the plan choice once, the next time they open their dashboard.
