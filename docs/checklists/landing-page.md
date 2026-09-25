# Landing page checklist

Scope: `/` (`app/page.tsx`) and the shared marketing chrome it uses (`components/site/`).

Update this file in the same commit as the fix. Tick the box, set the status, and add the short commit hash.

## Status key

| Status | Meaning |
|---|---|
| Broken | Fails or gives the wrong result as written |
| Dead button | Visible control that does nothing |
| Fake content | Invented numbers, names or features presented as real |
| Partial | Works but misses part of what the UI promises |
| Verify live | Code looks right, must be confirmed on the deployed site |
| Works, test once | Wired end to end, run the test once before launch |
| Done | Fixed or removed, commit noted |

## Progress: 1 / 16

## Phase 2: Navigation fixes

- [ ] **Navbar logo and section links fail on /pricing.** Hash links resolve to `/pricing#product`. Change them to `/#product` and the logo to `/`.
  `components/site/Navbar.tsx` · Broken
- [ ] **Colleges and Analytics go to the same section.** Both link to `#analytics`.
  `components/site/Navbar.tsx` · Partial

## Phase 3: Content honesty and dead links

- [ ] **Social links go nowhere.** LinkedIn, Twitter, Instagram all point to `#`.
  `components/site/Footer.tsx` · Dead button
- [ ] **20 footer column links go nowhere.** Build the pages or remove the links.
  `components/site/Footer.tsx` · Dead button
- [ ] **Invented results in the outcome funnel.** 500 registered, 14 offers, ROI 8.4/10, 28 companies read as real results.
  `components/landing/AnalyticsSection.tsx` · Fake content
- [ ] **Real brand names used as customers.** Careem, PwC UAE and G42 imply partnerships that may not exist.
  `components/landing/LiveEventSection.tsx`, `EmployerCRMSection.tsx`, `AnalyticsSection.tsx`, `HeroDashboard.tsx`, `ProductReveal.tsx`, `SpatialShowcaseSection.tsx`, `components/gradlink/SignUpForm.tsx`, `components/dashboard/CompanyProfileEditor.tsx` · Fake content
- [ ] **Mockups show unlabelled sample data.** Label them as a product preview or use real pilot data.
  `components/landing/HeroDashboard.tsx`, `ProductReveal.tsx`, `ReadinessSection.tsx` · Fake content
- [ ] **Promises features that are not built.** Mock interviews, bulk messages, alumni mentoring, internships.
  `components/landing/WhyGradLinkSection.tsx` · Fake content

## Phase 4: SEO

- [ ] **Add robots.txt and sitemap.** Neither exists.
  `app/` · Partial

## Test pass

- [ ] **Smooth scroll lands anchor links correctly.** Click every navbar link with Lenis active.
  `components/anim/SmoothScroll.tsx` · Verify live
- [ ] **Opening hero on a low-end phone.** Hand-written WebGL shader background plus canvas particle text. Check frame rate and battery heat.
  `components/landing/OpeningHero.tsx`, `components/ui/shader-background.tsx` · Verify live
- [ ] **Link preview card.** Paste the URL into LinkedIn and WhatsApp and check the image.
  `app/opengraph-image.tsx` · Verify live
- [x] **Scroll progress bar and thread.** Removed with all other scroll-triggered animations ahead of the redesign, so there is nothing left to test.
  Done in `1317868`
- [ ] **Navbar links on the home page.** Platform, Students, Employers, Colleges, Analytics, Pricing, Login, Get Started.
  `components/site/Navbar.tsx` · Works, test once
- [ ] **Mobile menu at 375px.** Opens, closes, tapping a link closes it, no horizontal scroll.
  `components/site/Navbar.tsx` · Works, test once
- [ ] **Hero and CTA buttons.** Get Started goes to `/sign-up`, Explore Platform goes to `#product`.
  `components/landing/HeroSection.tsx`, `CTASection.tsx` · Works, test once
