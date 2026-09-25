# Archive

Historical material kept for reference. **Nothing here is wired into the app** —
none of it is imported, executed, or deployed.

| Path | What it is | Why it's here |
|---|---|---|
| `2026-06-handoff.md` | Session handoff notes from the original build | Superseded by the code itself and `/README.md` |
| `2026-06-product-review.md` | Full product/architecture audit, June 2026 | Findings still useful as a roadmap; the state it describes is stale |
| `2026-06-supabase-security-plan.md` | Staged plan to fix Postgres RLS | Obsolete — access control now lives in the Worker (`lib/server/rpc.ts`), not RLS |
| `supabase-legacy/` | Old Postgres schema, RLS migration, SMTP scripts, email templates | GradLink ran on Supabase until July 2026 |
| `firebase-legacy/` | `firestore.rules`, `storage.rules`, indexes, `firebase.json`, the Supabase→Firestore import | GradLink ran on Firebase until the move to Neon + Cloudflare Workers; the access rules were ported to `lib/server/rpc.ts` |

## About `supabase-legacy/`

GradLink migrated off Supabase because its free tier pauses a project after
7 days of inactivity, which silently took the live site down twice.

`export-supabase.mjs` produced `migration/data/*.json` and has already been run.
It needs `@supabase/supabase-js`, which is no longer a project dependency — run
`npm i @supabase/supabase-js` first if you ever need it again. You would also
have to un-pause the Supabase project, which is only restorable within 90 days
of pausing.

The email templates are Supabase-flavoured (`{{ .ConfirmationURL }}`). The
password-reset email is now built in `lib/server/auth-api.ts`, so they're
reference material for the visual design only, not drop-in files.

## About `firebase-legacy/`

`import-firestore.mjs` needs `firebase-admin`, which is no longer a project
dependency (`npm i --no-save firebase-admin`). To move live Firestore data into
Neon, use `migration/export-firestore.mjs` instead.
