# Core loop checklist

Scope: the signed-in loop of create or join an event, open it, work through the checklist, and edit the event. Covers `lib/server/rpc.ts`, `lib/events.ts`, `components/dashboard/`, `components/events/`.

Update this file in the same commit as the fix. Tick the box, set the status, and note the commit.

GradLink no longer runs on Firestore. Authorization moved from `firestore.rules` (now in `docs/archive/firebase-legacy/`) to the per-operation checks in `lib/server/rpc.ts`, so the rules items below were re-checked against that file.

"Harness check" below means the real `lib/server/rpc.ts` ops run against Postgres 16 with `db/schema.sql` applied.

## Status key

| Status | Meaning |
|---|---|
| Security | Lets a user read or write data they should not |
| Broken | Fails or gives the wrong result as written |
| Dead button | Visible control, or existing function, that nothing uses |
| Verify live | Code looks right, must be confirmed on the deployed site |
| Done | Fixed, commit noted |

## Progress: 11 / 12 done, 1 needs the owner

## Phase 1: Core loop

- [x] **Users can promote themselves to event manager.** No API op writes `profiles.role`. The role is set once at sign-up and every check reads it from the session, never from the request. Harness check: no role-writing op exists, a student calling `createEvent` gets 403, and `joinEventByCode` registers the account's real role whatever the browser sends.
  `lib/server/rpc.ts`, `lib/server/auth-api.ts` · Security · Done in "Fix Phase 1 core loop: event nav, checklist seeding, event editing"
- [x] **Manager writes are not scoped to their own event.** No API op lets anyone write another person's registration or any analytics row. Registrations are only created for the caller (`joinEventByCode`, and `createEvent` for the owner); analytics rows only for the joining student. Harness check: joining on someone else's behalf gets 403.
  `lib/server/rpc.ts` · Security · Done in "Fix Phase 1 core loop: event nav, checklist seeding, event editing"
- [x] **Any manager can edit any checklist.** No API op writes `checklist_items` from the browser. Items are only written by the server's default seed, and only for the event being created or, on backfill, for an event the caller is registered in. Harness check: a non-member loading a checklist seeds nothing.
  `lib/server/rpc.ts`, `lib/server/checklist-defaults.ts` · Security · Done in "Fix Phase 1 core loop: event nav, checklist seeding, event editing"
- [x] **No way back to the event list.** The sidebar now always shows "All events" (`/dashboard/events`) for every role, next to the open event, so people can switch events or create and join another.
  `components/dashboard/DashboardShell.tsx` · Broken · Done in "Fix Phase 1 core loop: event nav, checklist seeding, event editing"
- [x] **New events get no checklist items.** `createEvent` now seeds the default list for students, employers and the college in the same transaction that creates the event. Events created before this fix get the same list the first time a member opens a checklist, guarded by an advisory lock. Harness check: a new event gets 15 student, 12 employer and 9 college items; 8 simultaneous loads of an old event seed it exactly once; an event that already has items is left alone.
  `lib/server/rpc.ts`, `lib/server/checklist-defaults.ts` · Broken · Done in "Fix Phase 1 core loop: event nav, checklist seeding, event editing"
- [x] **Readiness is always 0%.** Fixed by the seeding above. The Readiness tile now also takes its number from the checklist on the same page, so it counts auto-ticked items and changes as boxes are ticked.
  `components/dashboard/StudentDashboard.tsx`, `components/dashboard/Checklist.tsx` · Broken · Done in "Fix Phase 1 core loop: event nav, checklist seeding, event editing"
- [x] **Checklist is empty on new events.** Same fix as the seeding above. The item "Get your AI resume score" is now "Check your resume score", since the score is rule-based, and its auto-tick still matches old and new titles.
  `components/dashboard/Checklist.tsx` · Broken · Done in "Fix Phase 1 core loop: event nav, checklist seeding, event editing"
- [x] **No way to edit an event.** The event's owner now sees "Edit event" on the event console. It edits name, location, dates, description and status, including Live now and Ended. `CreateEventForm` became `EventForm`, which handles both create and edit. The server rejects a blank name and still only lets the owner save. Harness check: owner moves status to live then ended; another college and a student get 403.
  `components/events/EventForm.tsx`, `components/dashboard/EventConsole.tsx`, `lib/server/rpc.ts` · Dead button · Done in "Fix Phase 1 core loop: event nav, checklist seeding, event editing"
- [x] **Joined events may never appear.** No longer a Firestore collection-group query. `listEventsForProfile` is a Postgres join on `event_registrations`, restricted to the caller. Harness check: a student sees every event they joined, and asking for someone else's list gets 403.
  `lib/server/rpc.ts` · Verify live · Done in "Fix Phase 1 core loop: event nav, checklist seeding, event editing"
- [ ] **Live rules match the repo.** Replaced: the app does not read Firestore any more, so there are no live rules to deploy. What is left is closing the old Firebase project so its data is not still readable under old rules. Owner action: in the Firebase console, delete the Firestore data and Storage files (the export is in `migration/data/`), or deploy deny-all rules, or delete the project.
  `docs/archive/firebase-legacy/firestore.rules` · Verify live · Needs the owner
- [x] **Anyone signed in could read any event's people.** Registered students (with emails), employers, scans, shortlists, analytics and event details were readable by every signed-in account. Now: students and employers only see events they joined; students see the employer list but not other students; employers see the students in their events; only the organiser sees every scan, shortlist and analytics row; employers' shortlist notes are hidden from students; join codes are only returned to the organiser; scans, shortlists and messages can only be made between people in the same event, and scan roles come from the registrations. Harness check: 38 access checks across members, other events and other colleges.
  `lib/server/rpc.ts`, `components/dashboard/EventConsole.tsx` · Security · Done in "Scope event data to members and compute analytics live"
- [x] **Student analytics never change.** The counters in `student_event_analytics` were created at zero and never updated, and the resume score there was always 0. Profile views, company scans, shortlists, messages received, resume score and engagement are now worked out from scans, shortlists, messages and the student profile each time they are read. Harness check: counts and engagement match the activity recorded, an inactive student stays at zero.
  `lib/server/rpc.ts`, `db/schema.sql` · Broken · Done in "Scope event data to members and compute analytics live"
