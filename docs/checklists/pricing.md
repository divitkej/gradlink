# Pricing checklist

Scope: `/pricing` (`components/pricing/`), checkout (`app/api/checkout`), the Stripe webhook (`app/api/stripe/webhook`), plan rules (`lib/pricing.ts`) and entitlement (`lib/server/billing.ts`).

Update this file in the same commit as the fix. Tick the box and note the commit by its title.

## Plans

| Plan | Price | Rule |
|---|---|---|
| Trial Event | Free | A college's first event has every paid feature. The full report stays open 14 days after the event ends (the end date counts as no later than 180 days after the event was created) |
| Event Pass | AED 1,900 per event | One more event with the paid features, kept for good. Spent when the event is created. Passes bought in the last 60 days come off the first Placement Pro payment |
| Placement Pro | AED 4,800 per campus / year. Founding AED 3,600 | Unlimited events, full outcome report, CSV exports, priority support. Founding price on every term until 10 colleges have taken it |
| Two years | AED 8,160 every 2 years. Founding AED 6,120 | Placement Pro, price locked, guided setup. 15% less than paying yearly |
| Three years | AED 11,500 every 3 years. Founding AED 8,640 | Placement Pro, price locked, guided setup, early access. At least 20% less than paying yearly |

A multi-campus plan (AED 3,600 per extra campus) was built and then cut until the app has per-campus accounts.

## Built

- [x] **Plans, checkout and entitlement.** Event limit enforced on the server, trial window, Event Pass spending and credit, founding cap, yearly and multi-year checkout. Tested against a Neon branch, including parallel requests.
  Done in "Add tiered pricing: trial event, Event Pass, founding, multi-year and multi-campus"
- [x] **Pricing page listed features that don't exist.** "Year-over-year comparison" and "Employer engagement league table" removed from Placement Pro.
  `lib/billing.ts` · Done in "Add tiered pricing: trial event, Event Pass, founding, multi-year and multi-campus"
- [x] **"Most popular" badge with no customers behind it.** Replaced with "Recommended".
  `components/pricing/PricingSection.tsx` · Done in "Add tiered pricing: trial event, Event Pass, founding, multi-year and multi-campus"
- [x] **Free plan's one-event limit was not enforced.** `createEvent` now allows the first event, a subscriber, or an unused Event Pass, checked in one locked transaction.
  `lib/server/rpc.ts` · Done in "Add tiered pricing: trial event, Event Pass, founding, multi-year and multi-campus"

## Before deploying this branch

- [ ] **Apply the database migration to production.** `npm run db:migrate` adds `subscriptions.term`, `founding` and the `event_passes` table. Every statement is `if not exists`. Deploy only after this: the new event-creation check reads `event_passes`.

## Before taking payments

- [ ] **Create the Stripe Prices.** Add `STRIPE_SECRET_KEY` to `.dev.vars`, run `npm run stripe:setup`, then run the printed `wrangler secret put` commands. Until then every paid button shows "isn't configured yet".
- [ ] **Store the Stripe keys as Worker secrets.** `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` (`npx wrangler secret put <NAME>`).
- [ ] **Point the Stripe webhook at the Worker.** `https://<domain>/api/stripe/webhook` with `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`.
- [ ] **Run one test purchase of each plan in Stripe test mode.** Check the `subscriptions` or `event_passes` row, then that the report unlocks and a second event can be created.
- [ ] **Confirm the service promises.** Priority support, guided setup for the first event (two and three years), early access to new features (three years). See "Claims to confirm" in `features-to-build.md`.

- [x] **Multi-year cost more than founding yearly.** Two founding years were AED 7,200 against AED 8,200 for the two-year plan. Multi-year now gets the founding price too (AED 6,120 and AED 8,640), and the list prices are AED 8,160 and AED 11,500, so a longer term is always cheaper.
  `lib/pricing.ts` · Done in "Cut multi-campus plan and make multi-year cheaper than paying yearly"
- [x] **Multi-campus plan cut.** It had no per-campus accounts behind it, so extra campuses bought nothing in the app.
  `components/pricing/PricingSection.tsx`, `app/api/checkout/route.ts` · Done in "Cut multi-campus plan and make multi-year cheaper than paying yearly"

- [x] **VAT.** GradLink is not VAT-registered, so no VAT is charged and the page says "with no VAT added".
  `components/pricing/PricingSection.tsx` · Done in "State that prices carry no VAT"

## Known limits

- The founding cap is checked when checkout starts. Two colleges paying at the same moment for the last spot can both get it, so the cap can overshoot by a college or two.
- An Event Pass is spent on the next event created, not on an event that already exists. A college whose subscription lapses can't use a pass to reopen an older event's report.
- VAT registration becomes mandatory once taxable sales pass AED 375,000 in 12 months (voluntary from AED 187,500). After registering, add 5% VAT in Stripe (Stripe Tax or tax rates on the Prices), show a TRN on invoices, and update the pricing page line.
