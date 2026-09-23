-- ============================================================================
-- GradLink — Scoped RLS migration (auth.uid()-based)
-- ============================================================================
-- PURPOSE: Replace the demo-grade "USING (true)" policies with policies that
-- scope every table by the signed-in user, their event membership, and (for
-- managers) the events they host.
--
-- PROVEN: the predicate model was validated against live data on 2026-06-14
-- (the company participant saw 2/3 messages; a non-participant saw 0/3).
--
-- ⚠️ DO NOT APPLY BLINDLY. Prerequisites, in order:
--   1. Supabase Auth → "Confirm email" OFF (so sign-in/up yield a JWT).
--   2. Backfill done: all auth.users confirmed; profiles.auth_id linked
--      (already applied 2026-06-14 for non-duplicate emails).
--   3. Resolve the duplicate-role account (BITS email) + any auth_id drift.
--   4. STAGE 1 APP REWORK DEPLOYED (see notes at bottom). The app must run
--      authenticated (send a JWT on every request) BEFORE these policies are
--      enforced, or signed-in users will see empty data.
--   5. Apply on a Supabase BRANCH first (or a maintenance window). Keep the
--      permissive policies until the scoped ones are verified, then drop them.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so they bypass the calling table's RLS and
-- avoid infinite recursion; they grant no access by themselves).
-- ----------------------------------------------------------------------------
create or replace function public.current_profile_id() returns uuid
  language sql stable security definer set search_path = public as
$$ select id from public.profiles where auth_id = auth.uid() limit 1 $$;

create or replace function public.current_app_role() returns text
  language sql stable security definer set search_path = public as
$$ select role from public.profiles where auth_id = auth.uid() limit 1 $$;

create or replace function public.manages_event(p_event uuid) returns boolean
  language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.events e
     where e.id = p_event and e.created_by = public.current_profile_id()) $$;

create or replace function public.in_event(p_event uuid) returns boolean
  language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.event_registrations r
     where r.event_id = p_event and r.profile_id = public.current_profile_id()) $$;

-- "Can the current user see this profile?" — self, a co-event member, a person
-- registered in an event I manage, or a manager of an event I'm registered in.
create or replace function public.shares_event_with(p_target uuid) returns boolean
  language sql stable security definer set search_path = public as
$$
  select
    p_target = public.current_profile_id()
    or exists (
      select 1 from public.event_registrations a
      join public.event_registrations b on a.event_id = b.event_id
      where a.profile_id = public.current_profile_id() and b.profile_id = p_target)
    or exists (
      select 1 from public.events e
      join public.event_registrations r on r.event_id = e.id
      where e.created_by = public.current_profile_id() and r.profile_id = p_target)
    or exists (
      select 1 from public.events e
      join public.event_registrations r on r.event_id = e.id
      where e.created_by = p_target and r.profile_id = public.current_profile_id());
$$;

-- RLS helpers must be callable by signed-in users, but not by anon.
revoke execute on function public.current_profile_id(), public.current_app_role(),
  public.manages_event(uuid), public.in_event(uuid), public.shares_event_with(uuid)
  from public, anon;
grant execute on function public.current_profile_id(), public.current_app_role(),
  public.manages_event(uuid), public.in_event(uuid), public.shares_event_with(uuid)
  to authenticated;

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
drop policy if exists profiles_select_all on public.profiles;
drop policy if exists profiles_insert_all on public.profiles;
drop policy if exists profiles_update_all on public.profiles;

create policy profiles_select on public.profiles for select to authenticated
  using (id = public.current_profile_id() or public.shares_event_with(id));
create policy profiles_insert on public.profiles for insert to authenticated
  with check (auth_id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (id = public.current_profile_id()) with check (id = public.current_profile_id());

-- ----------------------------------------------------------------------------
-- students  (self + co-event recruiters/managers can read; only self writes)
-- ----------------------------------------------------------------------------
drop policy if exists students_select_all on public.students;
drop policy if exists students_select_own on public.students;
drop policy if exists students_insert_anon on public.students;
drop policy if exists students_update_all on public.students;

create policy students_select on public.students for select to authenticated
  using (profile_id = public.current_profile_id() or public.shares_event_with(profile_id));
create policy students_insert on public.students for insert to authenticated
  with check (profile_id = public.current_profile_id());
create policy students_update on public.students for update to authenticated
  using (profile_id = public.current_profile_id()) with check (profile_id = public.current_profile_id());

-- ----------------------------------------------------------------------------
-- companies (self + co-event students/managers can read; only self writes)
-- ----------------------------------------------------------------------------
drop policy if exists companies_select_all on public.companies;
drop policy if exists companies_select_own on public.companies;
drop policy if exists companies_insert_anon on public.companies;
drop policy if exists companies_update_all on public.companies;

create policy companies_select on public.companies for select to authenticated
  using (profile_id = public.current_profile_id() or public.shares_event_with(profile_id));
create policy companies_insert on public.companies for insert to authenticated
  with check (profile_id = public.current_profile_id());
create policy companies_update on public.companies for update to authenticated
  using (profile_id = public.current_profile_id()) with check (profile_id = public.current_profile_id());

-- ----------------------------------------------------------------------------
-- colleges (self read/write)
-- ----------------------------------------------------------------------------
drop policy if exists colleges_select_all on public.colleges;
drop policy if exists colleges_select_own on public.colleges;
drop policy if exists colleges_insert_anon on public.colleges;
drop policy if exists colleges_update_all on public.colleges;

create policy colleges_select on public.colleges for select to authenticated
  using (profile_id = public.current_profile_id());
create policy colleges_insert on public.colleges for insert to authenticated
  with check (profile_id = public.current_profile_id());
create policy colleges_update on public.colleges for update to authenticated
  using (profile_id = public.current_profile_id()) with check (profile_id = public.current_profile_id());

-- ----------------------------------------------------------------------------
-- events (public-ish read for discovery; only the host creates/edits)
-- ----------------------------------------------------------------------------
drop policy if exists events_select_all on public.events;
drop policy if exists events_write_all on public.events;

create policy events_select on public.events for select to authenticated using (true);
create policy events_insert on public.events for insert to authenticated
  with check (created_by = public.current_profile_id() and public.current_app_role() = 'event_manager');
create policy events_update on public.events for update to authenticated
  using (created_by = public.current_profile_id()) with check (created_by = public.current_profile_id());

-- ----------------------------------------------------------------------------
-- event_registrations (members of the event + its manager)
-- ----------------------------------------------------------------------------
drop policy if exists evreg_select_all on public.event_registrations;
drop policy if exists evreg_write_all on public.event_registrations;

create policy evreg_select on public.event_registrations for select to authenticated
  using (profile_id = public.current_profile_id() or public.in_event(event_id) or public.manages_event(event_id));
create policy evreg_insert on public.event_registrations for insert to authenticated
  with check (profile_id = public.current_profile_id());
create policy evreg_update on public.event_registrations for update to authenticated
  using (profile_id = public.current_profile_id() or public.manages_event(event_id))
  with check (profile_id = public.current_profile_id() or public.manages_event(event_id));

-- ----------------------------------------------------------------------------
-- qr_codes (owner + co-event members can read; owner writes)
-- ----------------------------------------------------------------------------
drop policy if exists qr_select_all on public.qr_codes;
drop policy if exists qr_write_all on public.qr_codes;

create policy qr_select on public.qr_codes for select to authenticated
  using (owner_profile_id = public.current_profile_id() or public.shares_event_with(owner_profile_id));
create policy qr_insert on public.qr_codes for insert to authenticated
  with check (owner_profile_id = public.current_profile_id());
create policy qr_update on public.qr_codes for update to authenticated
  using (owner_profile_id = public.current_profile_id()) with check (owner_profile_id = public.current_profile_id());

-- ----------------------------------------------------------------------------
-- scans (either party or the event manager; scanner creates)
-- ----------------------------------------------------------------------------
drop policy if exists scans_select_all on public.scans;
drop policy if exists scans_write_all on public.scans;

create policy scans_select on public.scans for select to authenticated
  using (scanner_profile_id = public.current_profile_id()
      or scanned_profile_id = public.current_profile_id()
      or public.manages_event(event_id));
create policy scans_insert on public.scans for insert to authenticated
  with check (scanner_profile_id = public.current_profile_id());
create policy scans_update on public.scans for update to authenticated
  using (scanner_profile_id = public.current_profile_id());

-- ----------------------------------------------------------------------------
-- shortlists (the company, the listed student, or the event manager)
-- ----------------------------------------------------------------------------
drop policy if exists shortlists_select_all on public.shortlists;
drop policy if exists shortlists_write_all on public.shortlists;

create policy shortlists_select on public.shortlists for select to authenticated
  using (company_id = public.current_profile_id()
      or student_id = public.current_profile_id()
      or public.manages_event(event_id));
create policy shortlists_insert on public.shortlists for insert to authenticated
  with check (company_id = public.current_profile_id());
create policy shortlists_update on public.shortlists for update to authenticated
  using (company_id = public.current_profile_id()) with check (company_id = public.current_profile_id());

-- ----------------------------------------------------------------------------
-- messages (sender or receiver only; receiver can update e.g. read_at)
-- ----------------------------------------------------------------------------
drop policy if exists messages_select_all on public.messages;
drop policy if exists messages_write_all on public.messages;

create policy messages_select on public.messages for select to authenticated
  using (sender_profile_id = public.current_profile_id() or receiver_profile_id = public.current_profile_id());
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_profile_id = public.current_profile_id());
create policy messages_update on public.messages for update to authenticated
  using (receiver_profile_id = public.current_profile_id());

-- ----------------------------------------------------------------------------
-- student_event_analytics (the student or the event manager)
-- ----------------------------------------------------------------------------
drop policy if exists sea_select_all on public.student_event_analytics;
drop policy if exists sea_write_all on public.student_event_analytics;

create policy sea_select on public.student_event_analytics for select to authenticated
  using (student_id = public.current_profile_id() or public.manages_event(event_id));
create policy sea_insert on public.student_event_analytics for insert to authenticated
  with check (student_id = public.current_profile_id());
create policy sea_update on public.student_event_analytics for update to authenticated
  using (student_id = public.current_profile_id() or public.manages_event(event_id))
  with check (student_id = public.current_profile_id() or public.manages_event(event_id));

-- ----------------------------------------------------------------------------
-- checklist_items (shared library: read by all signed-in; managers write)
-- ----------------------------------------------------------------------------
drop policy if exists clitems_select_all on public.checklist_items;
drop policy if exists clitems_write_all on public.checklist_items;

create policy clitems_select on public.checklist_items for select to authenticated using (true);
create policy clitems_insert on public.checklist_items for insert to authenticated
  with check (public.current_app_role() = 'event_manager');
create policy clitems_update on public.checklist_items for update to authenticated
  using (public.current_app_role() = 'event_manager');

-- ----------------------------------------------------------------------------
-- checklist_progress (own rows only)
-- ----------------------------------------------------------------------------
drop policy if exists clprog_select_all on public.checklist_progress;
drop policy if exists clprog_write_all on public.checklist_progress;

create policy clprog_select on public.checklist_progress for select to authenticated
  using (profile_id = public.current_profile_id());
create policy clprog_insert on public.checklist_progress for insert to authenticated
  with check (profile_id = public.current_profile_id());
create policy clprog_update on public.checklist_progress for update to authenticated
  using (profile_id = public.current_profile_id()) with check (profile_id = public.current_profile_id());

-- ============================================================================
-- REQUIRED STAGE 1 APP CHANGES (deploy BEFORE enforcing the above)
-- ----------------------------------------------------------------------------
-- 1. Gate dashboards on the real Supabase session: on load, call
--    supabase.auth.getSession(); if absent/expired, route to /sign-in. Do not
--    trust only the localStorage GLSession (a stale GLSession with no JWT would
--    show empty data once RLS is on).
-- 2. Derive the user's profileId from auth (profiles.auth_id = auth.uid()),
--    not from localStorage, so it always matches current_profile_id().
-- 3. Remove the ANON duplicate-email pre-check in signUpUser (lib/supabase.ts):
--    it queries students/companies/colleges before a session exists and will be
--    blocked. Rely on supabase.auth.signUp's unique-email error instead.
-- 4. Keep sign-up's profile/role inserts AFTER signUp returns a session (with
--    confirmation OFF it does), so those inserts carry the JWT and pass the
--    WITH CHECK (… = current_profile_id()/auth.uid()).
-- 5. Storage (separate step): move uploads to a PRIVATE bucket + signed URLs
--    (createSignedUrl) instead of getPublicUrl.
-- ============================================================================
