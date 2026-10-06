# Docs

| Path | What it holds |
|---|---|
| `checklists/` | Live launch checklists, one file per area. Tick items in the same commit as the fix. |
| `checklists/landing-page.md` | Landing page (`/`) and shared marketing chrome |
| `checklists/core-loop.md` | Signed-in core loop: events, checklists, event editing, and the authorization checks behind them |
| `checklists/organiser-access.md` | Student and employer codes, the college plan choice and the owner dashboard |
| `checklists/dashboard.md` | Signed-in pages, event and scan flows, and the 404 page |
| `checklists/launch.md` | Hosting, database, domain, email and legal pages before public launch |
| `checklists/audit-follow-ups.md` | Problems from the first site audit that are still open and not tracked elsewhere |
| `checklists/features-to-build.md` | Features the site shows that the app does not have yet, plus claims to confirm |
| `brand/` | Sources for the share images and icons. See `brand/README.md`. |
| `archive/` | Historical material. Nothing here is wired into the app. See `archive/README.md`. |

The launch board in [`../launch-board/`](../launch-board/) is generated from these checklists and rebuilds itself when they change on `main`.

New checklists go in `checklists/<area>.md` (for example `pricing.md`, `sign-up.md`, `dashboard-student.md`) and get a row in this table.
