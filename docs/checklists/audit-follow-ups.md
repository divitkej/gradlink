# Audit follow-ups checklist

Scope: problems from the first site audit (the 2026-09 roadmap) that are still in the code on `main` and were not yet tracked in another checklist. Re-checked against `main` at "Merge pull request #10".

Update this file in the same commit as the fix. Tick the box, set the status, and note the commit. The `Phase N` tag on each status line sets the item's phase on the launch board.

## Status key

| Status | Meaning |
|---|---|
| Dead button | Visible control that does nothing |
| Partial | Works, but misses part of what the UI promises |
| Done | Fixed, commit noted |

## Progress: 0 / 7 done

## Pricing

- [ ] **"Start free" does nothing.** `onCta` returns straight away for the free plan, so the Starter button on `/pricing` has no effect. Send it to `/sign-up`.
  `components/PricingSection.tsx` · Dead button · Phase 2
- [ ] **No message after Stripe checkout.** Checkout returns to `/dashboard/event-manager?upgraded=1` or `/pricing?canceled=1`, but neither page reads the parameter, so the college gets no confirmation either way.
  `app/api/checkout/route.ts`, `components/PricingSection.tsx`, `components/dashboard/EventManagerDashboard.tsx` · Partial · Phase 4

## Navigation

- [ ] **College sidebar has no Messages or Profile link.** Students and companies get both. Colleges can only reach Messages through the header bell.
  `components/dashboard/DashboardShell.tsx` · Partial · Phase 2
- [ ] **Scan history is not linked anywhere.** `/dashboard/scans` exists but no sidebar or page links to it, so it is only reachable by typing the address.
  `components/dashboard/DashboardShell.tsx`, `app/dashboard/scans/page.tsx` · Partial · Phase 2

## Sign in

- [ ] **Signed-in people can still open the sign-in page.** `/sign-in` shows the form instead of sending them to their dashboard.
  `app/sign-in/page.tsx`, `components/gradlink/GradLinkSignIn.tsx` · Partial · Phase 4
- [ ] **Signing in from a scanned QR loses the profile.** The sign-in gate on a scanned profile links to plain `/sign-in`, and sign-in always goes to the dashboard, so the person has to scan again. Pass the scanned address through and return to it.
  `components/scan/ViewerGate.tsx`, `components/gradlink/GradLinkSignIn.tsx` · Partial · Phase 4

## Messages

- [ ] **New messages need a page reload.** The messages page loads the inbox once. The unread badge polls, but an open conversation does not show a reply until the page is reloaded.
  `app/dashboard/messages/page.tsx`, `lib/notifications.ts` · Partial · Phase 4
