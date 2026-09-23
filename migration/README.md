# Supabase → Firebase migration

Everything in the app is already rewritten for Firebase. What's left needs a
Google account, so it has to be done by you. It's about 15 minutes.

## What changed

| Before (Supabase) | After (Firebase) |
|---|---|
| Postgres, 14 tables | Firestore collections + event subcollections |
| Supabase Auth | Firebase Auth (Email/Password) |
| Storage bucket `uploads` | Firebase Storage |
| RLS policies (all `USING (true)` — wide open) | `firestore.rules` / `storage.rules` — sign-in required, owner-only writes |
| `profiles.id` ≠ auth uid | **auth uid IS the profile id** |

That last row is the important one. Because a user's Firebase uid is also their
profile id, every rule is a direct `request.auth.uid == profileId` comparison —
no lookups, and no way to read someone else's data by guessing an id.

## Step 1 — Create the Firebase project

1. <https://console.firebase.google.com> → **Add project** (name it `gradlink`).
2. **Build → Firestore Database → Create database** → Production mode → region
   `asia-south1` (Mumbai — closest to your UAE/India users).
3. **Build → Authentication → Get started → Email/Password → Enable.**
4. **Build → Storage → Get started.**

## Step 2 — Get the two sets of keys

**Web config** (for the app): Project settings → General → Your apps → Web
(`</>`) → register app → copy the `firebaseConfig` values into `.env.local`
using `.env.local.example` as the template.

**Service account** (for the import script): Project settings → Service
accounts → **Generate new private key** → save the downloaded file as:

```
migration/.private/service-account.json
```

That folder is git-ignored. The key grants full admin access to your project —
don't paste it into chat or commit it.

## Step 3 — Move the data

Two copies of the export exist:

| Path | Contents | In git? |
|---|---|---|
| `migration/.private/data/` | the real export — real names, emails, messages | **no**, git-ignored |
| `migration/data/` | the same 157 rows, pseudonymised by `scrub-export.mjs` | yes |

The import uses the private copy when it's present and falls back to the
scrubbed one with a loud warning, because importing placeholders would quietly
create fake accounts.

> **`migration/.private/` is the only copy of your real data, and git is not
> backing it up.** Keep a copy somewhere else.

Do a dry run first — it writes nothing and reports exactly what it would do:

```bash
node migration/import-firestore.mjs --dry-run
```

Then run it for real, including the résumé/brochure files:

```bash
node migration/import-firestore.mjs --storage
```

The script is idempotent — safe to re-run if something fails partway.

## Step 4 — Deploy the security rules

```bash
npx firebase login
```

```bash
npx firebase deploy --only firestore:rules,firestore:indexes,storage --project YOUR_PROJECT_ID
```

Composite indexes take a few minutes to build. Until they finish, the messages
inbox and scan history will return empty — that's expected, not a bug.

## Step 5 — Point the reset-password page at GradLink

Authentication → Templates → Password reset → pencil icon → **Customise action
URL** → set it to:

```
https://gradlink-theta.vercel.app/reset-password
```

Without this, Firebase uses its own generic reset page instead of your branded one.

## Step 6 — Add the env vars to Vercel

Add all six `NEXT_PUBLIC_FIREBASE_*` values to the Vercel project (Settings →
Environment Variables), then redeploy. Remove the two `NEXT_PUBLIC_SUPABASE_*`
vars once you've confirmed the site works.

---

## What happens to existing accounts

18 profiles were exported. Each gets a Firebase Auth account whose uid equals
their profile id.

- **9 accounts keep their existing password** — the bcrypt hashes came across
  intact, so those users notice nothing.
- **9 accounts have no password.** These are profiles that were created while
  Supabase auth was failing, so they had no auth user at all and *could never
  sign in*. They now have a real account and can use "Forgot password" to set a
  password for the first time. This is a fix, not a regression.

One college row has no `profile_id` and will be keyed by its own id, with no
auth account. The script names it when it runs.

## Don't delete Supabase yet

Keep the Supabase project alive until you've signed in on the live Firebase site
and confirmed your data is there. Once you're happy:

- Download a final backup (free-tier projects can't download backups after the
  90-day pause window, so do it while active).
- Then delete the project — and **rotate the leaked `service_role` key** either
  way, since it was exposed in chat earlier in this project's history.

Your offline copy of the real data is `migration/.private/data/` — not the
scrubbed `migration/data/` in this repo. Back it up accordingly.
