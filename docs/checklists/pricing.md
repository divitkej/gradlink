# Pricing checklist

Scope: `/pricing` (`components/pricing/`), checkout (`app/api/checkout`), the Stripe webhook (`app/api/stripe/webhook`), plan rules (`lib/pricing.ts`) and entitlement (`lib/server/billing.ts`).

Update this file in the same commit as the fix. Tick the box and note the commit by its title.

## Plans

| Plan | Price | Rule |
|---|---|---|
| Trial Event | Free | A college's first event has every paid feature. The full report stays open 14 days after the event ends (the end date counts as no later than 180 days after the event was created) |
| Event Pass | AED 1,900 per event | One more event with the paid features, kept for good. Spent when the event is created. Passes bought in the last 60 days come off the first Placement Pro payment |
| Placement Pro | AED 4,800 per campus / year. Founding AED 3,600 | Unlimited events, full outcome report, CSV exports, priority support. Founding price until 10 campuses have taken it |
| Two years | AED 8,200 every 2 years | Placement Pro, price locked, guided setup |
| Three years | AED 11,500 every 3 years | Placement Pro, price locked, guided setup, early access |
| Multi-campus | AED 3,600 per extra campus / year | Yearly Placement Pro plus extra campuses on one subscription |

## Built

- [x] **Plans, checkout and entitlement for all six options.** Event limit enforced on the server, trial window, Event Pass spending and credit, founding cap, multi-year and multi-campus checkout. Tested against a Neon branch, including parallel requests.
  Done in "Add tiered pricing: trial event, Event Pass, founding, multi-year and multi-campus"
- [x] **Pricing page listed features that don't exist.** "Year-over-year comparison" and "Employer engagement league table" removed from Placement Pro.
  `lib/billing.ts` · Done in "Add tiered pricing: trial event, Event Pass, founding, multi-year and multi-campus"
- [x] **"Most popular" badge with no customers behind it.** Replaced with "Recommended".
  `components/pricing/PricingSection.tsx` · Done in "Add tiered pricing: trial event, Event Pass, founding, multi-year and multi-campus"
- [x] **Free plan's one-event limit was not enforced.** `createEvent` now allows the first event, a subscriber, or an unused Event Pass, checked in one locked transaction.
  `lib/server/rpc.ts` · Done in "Add tiered pricing: trial event, Event Pass, founding, multi-year and multi-campus"

## Before deploying this branch

- [ ] **Apply the database migration to production.** `npm run db:migrate` adds `subscriptions.term`, `campuses`, `founding` and the `event_passes` table. Every statement is `if not exists`. Deploy only after this: the new event-creation check reads `event_passes`.

## Before taking payments

- [ ] **Create the Stripe Prices.** Add `STRIPE_SECRET_KEY` to `.dev.vars`, run `npm run stripe:setup`, then run the printed `wrangler secret put` commands. Until then every paid button shows "isn't configured yet".
- [ ] **Store the Stripe keys as Worker secrets.** `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` (`npx wrangler secret put <NAME>`).
- [ ] **Point the Stripe webhook at the Worker.** `https://<domain>/api/stripe/webhook` with `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`.
- [ ] **Run one test purchase of each plan in Stripe test mode.** Check the `subscriptions` or `event_passes` row, then that the report unlocks and a second event can be created.
- [ ] **Decide multi-year pricing while the founding price is open.** Two founding years cost AED 7,200, less than the AED 8,200 two-year plan, and three founding years cost AED 10,800, less than AED 11,500. Either apply the founding discount to multi-year too, or accept that multi-year only makes sense once founding closes.
- [ ] **Confirm VAT.** Prices are shown without VAT. If GradLink is VAT-registered in the UAE, say whether prices include the 5%, and turn on Stripe Tax or add it to the Prices.
- [ ] **Confirm the service promises.** Priority support, guided setup for the first event (two and three years), early access to new features (three years). See "Claims to confirm" in `features-to-build.md`.

## Known limits

- The founding cap is checked when checkout starts. Two colleges paying at the same moment for the last spot can both get it, so the cap can overshoot by a campus or two.
- A multi-campus plan is one college account. There is no per-campus login or per-campus report yet, so extra campuses are a licence count, not separate workspaces.
- An Event Pass is spent on the next event created, not on an event that already exists. A college whose subscription lapses can't use a pass to reopen an older event's report.
