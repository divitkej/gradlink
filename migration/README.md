# Moving GradLink's data to Neon

The app code is already on Neon + Cloudflare Workers. What's left needs your
Neon and Cloudflare accounts, so it has to be done by you.

## What changed

| Before (Supabase → Firebase) | After |
|---|---|
| Firestore collections / Supabase Postgres | Neon Postgres, `db/schema.sql` (same table + column names as Supabase) |
| Firebase Auth / Supabase Auth | `auth_credentials` + signed session cookie, handled by the Worker |
| Firebase Storage / Supabase `uploads` bucket | Workers KV namespace `UPLOADS` |
| `firestore.rules` / RLS | Owner checks in `lib/server/rpc.ts` |
| Vercel | Cloudflare Workers (`wrangler.jsonc`) |

Ids are kept exactly as they were, so printed QR codes and shared links still work.

## Step 1 — Create the schema

```bash
cp .dev.vars.example .dev.vars      # paste your Neon DATABASE_URL
npm run db:migrate
```

## Step 2 — Pick the data source

There are up to three copies of GradLink's data:

| Path | Contents | In git? |
|---|---|---|
| `migration/.private/data/` | the real June 2026 Supabase export | **no**, git-ignored |
| `migration/.private/firestore-export/` | live Firebase data, if you run the export below | **no**, git-ignored |
| `migration/data/` | the Supabase export, pseudonymised by `scrub-export.mjs` | yes |

**If GradLink has been live on Firebase** (people signed up or events ran after
the Firebase move), export Firestore first — it is newer than the Supabase copy:

```bash
npm i --no-save firebase-admin
node migration/export-firestore.mjs     # needs migration/.private/service-account.json
```

## Step 3 — Import

Always dry-run first — it writes nothing and reports what it would do:

```bash
npm run db:import -- --dry-run
npm run db:import
```

Add `--from=migration/.private/firestore-export` to import the Firestore
export instead. With no flag, the real Supabase export is used if present,
otherwise the scrubbed copy (with a loud warning — it contains placeholder
names and emails).

The import is idempotent (`on conflict do nothing`), so it's safe to re-run.

**Uploaded files:** if any résumés/brochures are still hosted on Supabase or
Firebase Storage, copy them into Workers KV (after deploying, with
`APP_URL` set to the Worker URL in `.dev.vars` and `npx wrangler login` done):

```bash
npm run db:import -- --files
```

## What happens to existing accounts

Every imported profile gets a login, **without a password**. Supabase stored
bcrypt hashes and Firebase stores its own scrypt variant; verifying either on
every sign-in would exceed the Cloudflare Workers Free plan's CPU limit. So
existing users set a new password once:

1. Sign-in tells them their account moved and to tap **Forgot password?**
2. They get an email with a link to `/reset-password` (needs `RESEND_API_KEY`
   and `EMAIL_FROM` set as Worker secrets).

New passwords use PBKDF2-SHA256 (WebCrypto, native to Workers).

## Retire the old services

Once you've signed in on the Workers site and checked your data:

- **Firebase** — keep the project until any Storage files are copied
  (`--files`), then delete it.
- **Supabase** — download a final backup if you still can, delete the project,
  and **rotate the leaked `service_role` key** either way.
- **Vercel** — remove the project (or its production domain) so there's a single
  live deployment.

`migration/.private/` is the only copy of the real data and git is not backing
it up. Keep a copy somewhere else.
