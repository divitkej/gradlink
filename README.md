# GradLink

Campus career-fair platform — prepare students, connect employers, track outcomes.

Live: <https://gradlink-theta.vercel.app>

## Stack

- **Next.js 16** (App Router) — note `AGENTS.md`: this is a modified build, check
  `node_modules/next/dist/docs/` before assuming an API works.
- **React 19**, TypeScript
- **Firebase** — Firestore (data), Auth (email/password), Storage (résumés/brochures)
- **GSAP + Framer Motion + Lenis + three.js** for the landing page
- Styling is inline `style={{}}` objects + CSS variables in `app/globals.css`.
  Tailwind is installed but unused in components — keep it that way.

## Repo layout

Folder and branch rules are in `AGENTS.md` under "Repository organization". Launch checklists live in `docs/checklists/` (index: `docs/README.md`).

## Setup

```bash
npm install
```

Copy `.env.local.example` to `.env.local` and fill in your Firebase web config
(Firebase console → Project settings → General → Your apps).

```bash
npm run dev
```

## Data model

A user's **Firebase Auth uid is their profile id**. Every ownership check is a
direct `request.auth.uid == profileId` comparison — no lookups.

```
profiles/{profileId}
students/{profileId}   companies/{profileId}   colleges/{profileId}
events/{eventId}
  ├ registrations/{profileId}
  ├ scans/{scanId}
  ├ shortlists/{companyId__studentId}
  └ analytics/{studentId}
messages/{messageId}            participants[] powers the inbox query
checklist_items/{itemId}
checklist_progress/{profileId__itemId}
orders/{orderId}                server-written only
```

Document fields use `snake_case` and ISO-string timestamps, carried over from
the original Postgres schema so components didn't have to change.

All data access goes through `lib/db.ts`. Auth goes through `lib/auth.ts`.
Components should not import `firebase/*` directly.

## Security rules

`firestore.rules` and `storage.rules`. Reads require a signed-in account; writes
are owner-only. `orders` is readable by its owner and writable by nobody —
paid entitlement is set server-side so it can't be forged from the client.

Deploy them after any change:

```bash
npx firebase deploy --only firestore:rules,firestore:indexes,storage
```

## Migration from Supabase

See `migration/README.md`. The exported Supabase data lives in
`migration/data/*.json` as an offline backup.

## Deploy

```bash
npm run build
```

```bash
vercel --prod --yes
```
