# Landing page checklist

Scope: `/` (`app/page.tsx`) and the shared marketing chrome it uses (`components/site/`).

Update this file in the same commit as the fix. Tick the box, set the status, and note the commit.

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
| Tracked | Kept on the page by decision, listed in another checklist |

"Automated check" below means a Playwright run against a production build (`next build` + `next start`) at 1440px and 375px.

## Progress: 13 / 16 done, 1 tracked, 2 need a real device or the live site

## Phase 2: Navigation fixes

- [x] **Navbar logo and section links fail on /pricing.** Links now use `/#section` and the logo goes to `/`. Automated check: every link from `/pricing` lands on the right home-page section.
  `components/site/Navbar.tsx` · Done in "Fix landing links, sample-data labels and SEO basics"
- [x] **Colleges and Analytics go to the same section.** "Analytics" removed; tabs now follow page order: How it works, Platform, Students, Live events, Colleges, Employers, Pricing. Each goes to a different place.
  `components/site/Navbar.tsx` · Done in "Fix landing links, sample-data labels and SEO basics"

## Phase 3: Content honesty and dead links

- [x] **Social links go nowhere.** Removed until the accounts exist.
  `components/site/Footer.tsx` · Done in "Fix landing links, sample-data labels and SEO basics"
- [x] **20 footer column links go nowhere.** Footer rebuilt with 11 links, all to real pages or sections (automated check: pages return 200, section ids exist). Links for unbuilt pages are listed in `features-to-build.md`. Privacy, Terms and Contact removed until those pages exist (see launch blockers).
  `components/site/Footer.tsx` · Done in "Fix landing links, sample-data labels and SEO basics"
- [x] **Invented results in the outcome funnel.** Funnel, stats and "What a college sees after one fair" are labelled "Product preview · sample data"; "Career Fair 2025" and dates replaced with "Sample event".
  `components/landing/AnalyticsSection.tsx` · Done in "Fix landing links, sample-data labels and SEO basics"
- [x] **Real brand names used as customers.** Careem, PwC UAE, G42, ADNOC, Mubadala and Abu Dhabi University replaced with generic names (Fintech firm, Consulting firm, AI startup, Energy company, Investment firm, Sample University) across the landing page, sign-up form placeholders and company profile editor.
  `components/landing/*`, `components/gradlink/SignUpForm.tsx`, `components/dashboard/CompanyProfileEditor.tsx` · Done in "Fix landing links, sample-data labels and SEO basics"
- [x] **Mockups show unlabelled sample data.** Every mock screen carries a "Product preview · sample data" label (`components/landing/SampleDataLabel.tsx`). Invented hero stats (12+ colleges, 18K+ students, 200+ employers) removed.
  `HeroDashboard.tsx`, `ProductReveal.tsx`, `ReadinessSection.tsx`, `LiveEventSection.tsx`, `SpatialShowcaseSection.tsx`, `EmployerCRMSection.tsx`, `AnalyticsSection.tsx`, `HeroSection.tsx` · Done in "Fix landing links, sample-data labels and SEO basics"
- [ ] **Promises features that are not built.** Kept on the page by decision. Every unbuilt feature, and where it appears, is listed in `docs/checklists/features-to-build.md`.
  `components/landing/*` · Tracked

## Phase 4: SEO

- [x] **Add robots.txt and sitemap.** `app/robots.ts` (blocks dashboards, API, scan, events, reset) and `app/sitemap.ts` (7 public pages). Both use `NEXT_PUBLIC_SITE_URL`, so set it to the real domain at build time.
  `app/robots.ts`, `app/sitemap.ts`, `lib/site.ts` · Done in "Fix landing links, sample-data labels and SEO basics"

## Test pass

- [x] **Smooth scroll lands anchor links correctly.** Automated check with Lenis active: all 6 section links land with the section at the top, from `/` and from `/pricing`, desktop and mobile.
  `components/anim/SmoothScroll.tsx` · Done
- [ ] **Opening hero on a low-end phone.** WebGL shader background plus canvas particle text. Now pauses when scrolled past or the tab is hidden, and renders at 1x on phones (4x fewer pixels). The test machine has no GPU (software rendering), so its frame rate is not meaningful: still check on a real low-end Android for frame rate and heat.
  `components/landing/OpeningHero.tsx`, `components/ui/shader-background.tsx` · Verify on device
- [ ] **Link preview card.** Share image regenerated with the new logo (`app/opengraph-image.png`, source `docs/brand/opengraph-image.tsx`); `og:image` and `twitter:image` tags present. After deploying with `NEXT_PUBLIC_SITE_URL` set, paste the URL into LinkedIn and WhatsApp.
  `app/opengraph-image.png` · Verify live
- [x] **Scroll progress bar and thread.** Removed with all other scroll-triggered animations ahead of the redesign, so there is nothing left to test.
  Done in `1317868`
- [x] **Navbar links on the home page.** Automated check: all 7 tabs, Login and Get Started go to the right place.
  `components/site/Navbar.tsx` · Done
- [x] **Mobile menu at 375px.** Automated check: opens, closes with X, tapping a link closes it and lands on the section, no horizontal scroll anywhere on the page (fixed a 56px overflow from the sample-data labels).
  `components/site/Navbar.tsx` · Done
- [x] **Hero and CTA buttons.** Automated check: Get Started goes to `/sign-up`, Explore Platform goes to `#product`.
  `components/landing/HeroSection.tsx`, `CTASection.tsx` · Done
