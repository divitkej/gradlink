<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Repository organization (keep it this way)

Every change, on every branch, must leave the repo in this shape. If a change needs a new place for something, add it here in the same commit.

## Where code lives

| Path | What goes there |
|---|---|
| `app/` | Routes only. Pages import components; they do not hold large UI. |
| `components/landing/` | Sections used only by the landing page (`/`) |
| `components/site/` | Marketing chrome shared by public pages (`Navbar`, `Footer`) |
| `components/gradlink/` | Auth and sign-up flow, plus the global background |
| `components/dashboard/` | Signed-in dashboard UI |
| `components/events/`, `components/scan/` | Event and QR scan flows |
| `components/ui/` | Generic building blocks (buttons, cards, meters, sections) |
| `components/anim/` | Reusable motion helpers |
| `components/` (root) | App-wide pieces only: `Logo.tsx`, `Providers.tsx`. `PricingSection.tsx` moves to `components/pricing/` when pricing work starts. |
| `lib/` | Client-side data access (`lib/db.ts`), auth (`lib/auth.ts`), utilities |
| `lib/server/` | Server-only code for the API routes (auth, rpc, SQL, files, mail) |
| `db/` | Postgres schema (`db/schema.sql`) |
| `scripts/` | Project scripts run through `npm run` |
| `docs/checklists/` | Live launch checklists, one file per area |
| `docs/brand/` | Sources for the share images and icons in `app/` |
| `docs/archive/` | Historical material, never imported or deployed |
| `migration/` | One-off data migration scripts and exports |

Rules:
- A component used by one area goes in that area's folder. Move it to `components/ui/` only once a second area uses it.
- No new loose files directly under `components/`. Pick or create a folder.
- Delete dead code in the same change that makes it dead. Do not leave unused files behind.

## Branches

- `main` is the source of truth. Work happens on a branch and reaches `main` through a pull request.
- One topic per branch (for example landing redesign, pricing fixes, a backend migration). Do not mix unrelated work.
- Before starting, fetch and branch from the latest `main`. Before opening a PR, merge the latest `main` in.
- A branch that changes folder layout must update the table above in the same PR.
- After a PR merges, start follow-up work from a fresh `main`, never on top of the merged branch.

## Checklists

- `docs/checklists/<area>.md` tracks what is left before launch. Fixing an item ticks it in the same commit, with the commit hash.
- Keep file paths in checklists current when files move.
- No em dashes in docs or visible copy.
