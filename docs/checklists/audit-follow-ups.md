# Audit follow-ups checklist

Scope: problems from the first site audit (the 2026-09 roadmap) that are still in the code on `main` and were not yet tracked in another checklist. Re-checked against `main` at "Merge pull request #10".

Update this file in the same commit as the fix. Tick the box, set the status, and note the commit. The `Phase N` tag on each status line sets the item's phase on the launch board.

## Status key

| Status | Meaning |
|---|---|
| Dead button | Visible control that does nothing |
| Partial | Works, but misses part of what the UI promises |
| Done | Fixed, commit noted |

## Progress: 11 / 12 done

## Pricing

- [x] **"Start free" does nothing.** The Starter button on `/pricing` now sends people to `/sign-up`.
  `components/PricingSection.tsx` · Phase 2 · Done in "Send the pricing Start free button to sign-up"
- [x] **No message after Stripe checkout.** `/dashboard/event-manager?upgraded=1` now confirms the checkout and says Pro switches on once Stripe confirms the payment; `/pricing?canceled=1` says the checkout was cancelled and nothing was charged.
  `components/dashboard/UpgradedNotice.tsx`, `app/dashboard/event-manager/page.tsx`, `components/PricingSection.tsx` · Phase 4 · Done in "Confirm Stripe checkout results on the dashboard and pricing page"

## Navigation

- [ ] **College sidebar has no Messages or Profile link.** Messages is now in the college sidebar ("Add Messages and Scan History to the dashboard sidebar"). Profile is left out by owner decision pending: `/dashboard/profile` has nothing for colleges yet (it only says there is no profile to edit), so a link would lead to an empty page. Decide what a college profile should hold, or drop this half.
  `components/dashboard/DashboardShell.tsx`, `app/dashboard/profile/page.tsx` · Partial · Phase 2
- [x] **Scan history is not linked anywhere.** Every role's sidebar now has "Scan History" (`/dashboard/scans`) under Scanner.
  `components/dashboard/DashboardShell.tsx`, `app/dashboard/scans/page.tsx` · Phase 2 · Done in "Add Messages and Scan History to the dashboard sidebar"

## Sign in

- [x] **Signed-in people can still open the sign-in page.** `/sign-in` now sends anyone already signed in to their dashboard.
  `components/gradleap/GradLeapSignIn.tsx` · Phase 4 · Done in "Send signed-in people from the sign-in page to their dashboard"
- [x] **Signing in from a scanned QR loses the profile.** The sign-in gate now links to `/sign-in?next=` with the scanned address (including its `?eventId`), and sign-in returns there. Only paths on this site are followed.
  `components/scan/ViewerGate.tsx`, `components/gradleap/GradLeapSignIn.tsx`, `components/gradleap/SignUpForm.tsx` · Phase 4 · Done in "Return to the scanned profile after signing in from a QR" · Signing up from the gate returns there too, in "Return to the scanned profile after signing up from a QR"

## Messages

- [x] **New messages need a page reload.** The messages page now reloads the inbox every 15 seconds while the tab is visible and on window focus, so an open conversation shows replies without a reload. Hidden tabs do not poll, as with the unread badge.
  `app/dashboard/messages/page.tsx` · Phase 4 · Done in "Show new messages in an open conversation without a reload"
- [x] **The unread badge could not be cleared from Messages.** The badge counts unread messages at every event, but the inbox shows only the open one, so a message at another event kept the badge on with no way to reach it. The inbox now lists other events with unread messages and switches to one in a tap.
  `app/dashboard/messages/page.tsx`, `lib/server/rpc.ts` · Phase 4 · Done in "Show unread messages at other events in the inbox"

## Scan pages

- [x] **A new scan is missing from the page it was made on.** The history on a scanned student's page loaded before the scan was saved, so a recruiter saw "0 with this candidate" and a college missed the "Checked in" pill until a reload. The history now loads again once the scan is saved.
  `components/scan/StudentScanView.tsx` · Phase 4 · Done in "Fix scan history, saves, camera shutdown and sign-in copy on the scan pages"
- [x] **A student's saves could be wiped.** If a student's saves failed to load, tapping one mark sent every mark as off, clearing the others in the account; and a browser copy from before saves moved to the database was deleted before the account had it. A tap now sends only that mark, and the browser copy is removed once it is saved.
  `components/scan/CompanyScanView.tsx` · Phase 4 · Done in "Fix scan history, saves, camera shutdown and sign-in copy on the scan pages"
- [x] **The camera could stay on.** Leaving the scanner while the camera was still opening left it running, and the scan loop kept going after Stop while a frame was being read. Both now stop.
  `components/scan/Scanner.tsx` · Phase 4 · Done in "Fix scan history, saves, camera shutdown and sign-in copy on the scan pages"
- [x] **Scan page copy described the old flow.** The scanner said tapping someone "simulates a scan" (it now opens their profile without recording one), and the sign-in gate asked people to "choose your role". Both now say what happens.
  `components/scan/Scanner.tsx`, `components/scan/StudentScanView.tsx`, `components/scan/CompanyScanView.tsx` · Phase 4 · Done in "Fix scan history, saves, camera shutdown and sign-in copy on the scan pages"
