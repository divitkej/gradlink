# GradLink — Security & Auth Migration Plan

> Status as of 2026-06-14. This is the working plan for the **#1 launch blocker**: real security (RLS) backed by real auth.

## TL;DR
RLS cannot be meaningfully tightened until the app has a **working Supabase auth session** to scope rows by `auth.uid()`. Right now it does not. The one thing that unblocks everything is a **Supabase Auth config change you must make** (the MCP/SQL cannot set it). Once that's done, the rest is code + a scoped-RLS migration I can apply and verify.

---

## What I verified (live, project `dtagbttabqslphxlanel`)

- **Auth is effectively not wired to data access.** The app reads identity from a `localStorage` `GLSession` (`lib/demo-session.ts`) and queries with the **anon** key. `auth.uid()` is unused.
- **Auth users vs. profiles are out of sync:**
  - `auth.users` = **8**, of which only **3** are email-confirmed.
  - `public.profiles` = **18**, of which only **7** have an `auth_id` and only **6** map to a real `auth.users` row.
  - ⇒ **12 of 18 app accounts have no auth user at all**, and most auth users are unconfirmed.
- **Email confirmation is ON** ⇒ `signUp` returns no session and `signInWithPassword` fails for unconfirmed users ⇒ no JWT ⇒ `auth.uid()` is null in practice.
- **RLS is permissive by design:** every table has `SELECT USING (true)` and write policies with `USING/CHECK (true)` for `anon`. The app *depends* on this anon write access for legit features (profile edits, messages, checklist, shortlists, scans, mark-as-read).

**Conclusion:** with no auth session, there is no safe RLS change that both (a) keeps the app working and (b) protects data — because `anon` must keep INSERT/UPDATE for normal use, and nothing distinguishes a legit write from a malicious one. Removing only DELETE is a non-fix (an attacker overwrites via UPDATE).

## What I already hardened (done, verified)
- **Revoked `EXECUTE` on `public.rls_auto_enable()`** from `public`/`anon`/`authenticated`. This `SECURITY DEFINER` helper was callable from the public REST API. The two related advisories are now **cleared**. (Owner/trigger usage unaffected.)

---

## The blocker you must clear (≈5 min, needs your Supabase token / dashboard)

1. **Disable email confirmation** (so sign-up/sign-in establish a real session). Either:
   - Run the prepared script with your own token:
     ```powershell
     powershell -ExecutionPolicy Bypass -File supabase/disable-email-confirmation.ps1 -Token "sbp_xxx"
     ```
   - **or** Dashboard → Authentication → Providers → Email → turn **"Confirm email" off**.
2. **Set URL config** (so reset/confirm links land on the app, not localhost):
   - Dashboard → Authentication → URL Configuration → **Site URL** = `https://gradlink-theta.vercel.app`; add `https://gradlink-theta.vercel.app/**` to **Redirect URLs**.
3. **Enable leaked-password protection** (Dashboard → Authentication → Password security) — clears that advisory.
4. **Rotate the `service_role` key** (Dashboard → Settings → API) — it was pasted in chat historically.

When #1–2 are done, sign-in/sign-up will yield a JWT and `auth.uid()` becomes usable.

---

## The migration (after the blocker is cleared) — I can do these

**Stage 1 — Wire the client to the real session (backward-compatible, deploy first).**
- On sign-up/sign-in, use the returned Supabase session; persist `GLSession` only as a UI cache, but make every DB call run as the authenticated user (the supabase-js client auto-attaches the JWT once a session exists).
- Ensure `profiles.auth_id = auth.uid()` for the signed-in user; backfill `auth_id` on `students/companies/colleges`.
- Still works under the current permissive RLS ⇒ no breakage when deployed.

**Stage 2 — Backfill / reconcile accounts.**
- For the 12 profiles with no auth user: either create auth users (admin API, server-side with service role) or mark them legacy/demo. Decide a policy (probably: keep demo/seed rows, require real accounts to re-register).

**Stage 3 — Apply scoped RLS, then drop the permissive policies (the actual fix).**
- Add a helper: `current_profile_id()` = `(select id from profiles where auth_id = auth.uid())`.
- Replace `*_select_all` / `*_write_all` per the matrix below, then **drop** the `USING(true)` policies. Apply on a Supabase **branch** or in a low-traffic window; verify each flow before dropping the permissive ones.

Target matrix (reference SQL to adapt next session):
```sql
create or replace function public.current_profile_id() returns uuid
  language sql stable security definer set search_path = public as
$$ select id from public.profiles where auth_id = auth.uid() limit 1 $$;

-- profiles: read self (and minimal public card for scans); update self only
-- students/companies: read self; managers/companies read within a shared event;
--   update self only
-- messages: select/insert/update only where sender or receiver = current_profile_id()
-- shortlists: company sees its own; student sees rows about them
-- student_event_analytics: student sees own; event manager sees their event
-- scans/qr_codes/event_registrations: scope by event membership
-- events: public read; insert/update only by created_by = current_profile_id()
-- checklist_progress: own rows only; checklist_items: public read
```

**Stage 4 — Storage privacy.**
- Move résumés/brochures to a **private** bucket; serve via short-lived **signed URLs** (`createSignedUrl`) instead of `getPublicUrl`. Then the "public bucket listing" advisory is moot. (Until then, anyone with a file URL can read it.)

**Stage 5 — Verify.**
- Re-run `get_advisors` (security) → expect clean.
- Test every flow signed-in: a student cannot read another student's résumé score/messages; a company cannot read another event's candidates; resets work end-to-end.

---

## Risk notes
- There is a single production Supabase project (no staging). Stage 3 changes affect the live app immediately — use a Supabase branch (`create_branch`, has cost) or a maintenance window, and keep the permissive policies until the scoped ones are proven.
- Don't tighten RLS before Stage 1 ships, or the live app breaks.
