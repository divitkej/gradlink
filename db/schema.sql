-- ============================================================================
-- GradLink — Neon PostgreSQL schema
-- ============================================================================
-- Apply with:   npm run db:migrate        (reads DATABASE_URL from .dev.vars)
-- or paste into the Neon console's SQL Editor.
--
-- Idempotent: every statement is `if not exists`, so re-running is safe.
--
-- Table and column names match the original Supabase schema (and the snake_case
-- fields the Firestore layer carried over), so the app's row types are
-- unchanged. What's new compared with Supabase:
--   * events.join_code / host_org       — the multi-event model
--   * subscriptions                     — Stripe entitlement (was Firestore-only)
--   * auth_credentials / password_reset_tokens — replaces Supabase/Firebase Auth
--
-- Central invariant, carried over from the Firebase layer: a signed-in user's
-- id IS their profile id, and role rows (students/companies/colleges) are keyed
-- by that same id. Every ownership check is a direct id comparison.
--
-- Ids are `text`, not `uuid`: rows carried over from Supabase have UUIDs, but
-- anything created while GradLink ran on Firebase has a Firebase Auth uid or a
-- Firestore auto-id. Keeping every id verbatim means printed QR codes and
-- shared /scan/... links keep working after the move. New rows get UUIDs.
--
-- Access control lives in the API (lib/server/rpc.ts), not in RLS: the browser
-- never talks to Postgres, only the Worker does, using one server-side role.
-- ============================================================================

-- ---------------------------------------------------------------- identity --
create table if not exists profiles (
  id            text primary key default gen_random_uuid()::text,
  created_at    timestamptz not null default now(),
  role          text not null check (role in ('student', 'company', 'event_manager')),
  full_name     text not null default '',
  email         text not null,
  organization  text,
  avatar_url    text
);
create index if not exists profiles_email_lower_idx on profiles (lower(email));

-- One sign-in identity per profile. password_hash is null for accounts that
-- were imported without a portable hash — those users set one via
-- "Forgot password". Bumping session_version signs out every device.
-- failed_attempts/locked_until throttle password guessing (Firebase Auth did
-- this for us) and cap how much CPU a guessing loop can burn on hashing.
create table if not exists auth_credentials (
  profile_id       text primary key references profiles (id) on delete cascade,
  email_lower      text not null unique,
  password_hash    text,
  session_version  integer not null default 1,
  failed_attempts  integer not null default 0,
  locked_until     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Only the SHA-256 of a reset token is stored, so a database leak can't be
-- replayed into password resets.
create table if not exists password_reset_tokens (
  token_hash  text primary key,
  profile_id  text not null references profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  used_at     timestamptz
);
create index if not exists password_reset_tokens_profile_idx on password_reset_tokens (profile_id);

-- Per-IP counters for the auth endpoints (lib/server/rate-limit.ts). One row
-- per bucket, hashed IP and fixed time window; rows older than a day are
-- swept by the app, since the Workers Free plan has no cron.
create table if not exists rate_limits (
  bucket        text not null,
  ip_hash       text not null,
  window_start  timestamptz not null,
  hits          integer not null default 0,
  primary key (bucket, ip_hash, window_start)
);
create index if not exists rate_limits_window_idx on rate_limits (window_start);

-- Email confirmation. Sign-in is refused until email_verified_at is set,
-- whenever the server can send email (lib/server/auth-api.ts). Tokens are
-- stored hashed, like reset tokens.
alter table auth_credentials add column if not exists email_verified_at timestamptz;

create table if not exists email_verification_tokens (
  token_hash  text primary key,
  profile_id  text not null references profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  used_at     timestamptz
);
create index if not exists email_verification_tokens_profile_idx on email_verification_tokens (profile_id);

-- Student email domains colleges register at sign-up, approved by the owner
-- at /admin/colleges. Students can only sign up with an address on an
-- approved domain or one of its subdomains (lib/server/college-domains.ts).
create table if not exists college_domains (
  domain        text primary key,
  institution   text not null,
  requested_by  text references profiles (id) on delete set null,
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at    timestamptz not null default now(),
  decided_at    timestamptz
);
create index if not exists college_domains_status_idx on college_domains (status);

-- ------------------------------------------------------------- role rows --
create table if not exists students (
  id               text primary key default gen_random_uuid()::text,
  created_at       timestamptz not null default now(),
  profile_id       text unique references profiles (id) on delete set null,
  full_name        text not null default '',
  email            text not null default '',
  university       text,
  degree           text,
  graduation_year  integer,
  skills           text[] not null default '{}',
  resume_url       text,
  portfolio_url    text,
  linkedin_url     text,
  github_url       text,
  bio              text,
  resume_score     integer,
  ai_feedback      jsonb
);
create index if not exists students_email_lower_idx on students (lower(email));

create table if not exists companies (
  id             text primary key default gen_random_uuid()::text,
  created_at     timestamptz not null default now(),
  profile_id     text unique references profiles (id) on delete set null,
  full_name      text not null default '',
  email          text not null default '',
  company        text,
  company_name   text,
  sector         text,
  industry       text,
  website        text,
  description    text,
  logo_url       text,
  hiring_roles   text[] not null default '{}',
  booth_number   text,
  skills_wanted  text[] not null default '{}',
  brochure_url   text
);
create index if not exists companies_email_lower_idx on companies (lower(email));

create table if not exists colleges (
  id           text primary key default gen_random_uuid()::text,
  created_at   timestamptz not null default now(),
  profile_id   text unique references profiles (id) on delete set null,
  full_name    text not null default '',
  email        text not null default '',
  institution  text
);
-- Set the first time the organiser picks a plan after signing in. Picking
-- Pro only records the choice; paid features still come from subscriptions.
alter table colleges add column if not exists plan_choice text check (plan_choice in ('free', 'pro'));
alter table colleges add column if not exists plan_selected_at timestamptz;
create index if not exists colleges_email_lower_idx on colleges (lower(email));
-- The domain of the example student email given at sign-up
-- (dubai.bits-pilani.ac.in); its approval is in college_domains.
alter table colleges add column if not exists student_domain text;

-- ---------------------------------------------------------------- events --
create table if not exists events (
  id           text primary key default gen_random_uuid()::text,
  created_at   timestamptz not null default now(),
  title        text not null,
  description  text,
  location     text,
  start_date   timestamptz,
  end_date     timestamptz,
  status       text not null default 'upcoming' check (status in ('draft', 'upcoming', 'live', 'ended')),
  created_by   text references profiles (id) on delete set null,
  host_org     text,
  -- Legacy single join code. Codes now live in event_codes; this column is
  -- kept so events created before the split still resolve (as student codes).
  join_code    text unique
);
create index if not exists events_created_by_idx on events (created_by, created_at desc);

-- Each event has one code for students and a different one for employers.
-- The code is the primary key, so no two codes are ever the same across
-- events or roles, and a code alone says which event and which role it is.
create table if not exists event_codes (
  code        text primary key,
  created_at  timestamptz not null default now(),
  event_id    text not null references events (id) on delete cascade,
  role        text not null check (role in ('student', 'company')),
  unique (event_id, role)
);

-- Carry legacy join codes over as student codes.
insert into event_codes (code, event_id, role)
select join_code, id, 'student' from events where join_code is not null
on conflict do nothing;

-- Give every event that lacks one a code for each role. Same alphabet as
-- lib/server/rpc.ts (no 0/O or 1/I/L, since codes are typed off a slide).
do $$
declare
  r record;
  c text;
begin
  for r in
    select e.id, x.role from events e cross join (values ('student'), ('company')) as x(role)
    where not exists (select 1 from event_codes k where k.event_id = e.id and k.role = x.role)
  loop
    loop
      c := (select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '')
            from generate_series(1, 6));
      begin
        insert into event_codes (code, event_id, role) values (c, r.id, r.role);
        exit;
      exception when unique_violation then
        -- code taken, draw another
      end;
    end loop;
  end loop;
end $$;

create table if not exists event_registrations (
  id          text primary key default gen_random_uuid()::text,
  created_at  timestamptz not null default now(),
  event_id    text not null references events (id) on delete cascade,
  profile_id  text not null references profiles (id) on delete cascade,
  role        text not null check (role in ('student', 'company', 'event_manager')),
  checked_in  boolean not null default false,
  unique (event_id, profile_id)
);
create index if not exists event_registrations_profile_idx on event_registrations (profile_id);

create table if not exists scans (
  id                  text primary key default gen_random_uuid()::text,
  created_at          timestamptz not null default now(),
  event_id            text not null references events (id) on delete cascade,
  scanner_profile_id  text references profiles (id) on delete set null,
  scanned_profile_id  text references profiles (id) on delete set null,
  scanner_role        text,
  scanned_role        text,
  scan_context        text default 'qr',
  notes               text
);
create index if not exists scans_scanner_idx on scans (event_id, scanner_profile_id, created_at desc);
create index if not exists scans_scanned_idx on scans (event_id, scanned_profile_id, created_at desc);

create table if not exists shortlists (
  id          text primary key default gen_random_uuid()::text,
  created_at  timestamptz not null default now(),
  event_id    text not null references events (id) on delete cascade,
  company_id  text not null references profiles (id) on delete cascade,
  student_id  text not null references profiles (id) on delete cascade,
  status      text not null check (status in ('shortlisted', 'maybe', 'rejected', 'priority')),
  notes       text,
  unique (event_id, company_id, student_id)
);
create index if not exists shortlists_student_idx on shortlists (event_id, student_id);

-- Historical counters from the Supabase and Firebase eras. Nothing writes
-- here any more: lib/server/rpc.ts computes each student's stats from scans,
-- shortlists and messages when they are read. Kept so imported rows survive.
create table if not exists student_event_analytics (
  id                 text primary key default gen_random_uuid()::text,
  created_at         timestamptz not null default now(),
  event_id           text not null references events (id) on delete cascade,
  student_id         text not null references profiles (id) on delete cascade,
  profile_views      integer not null default 0,
  company_scans      integer not null default 0,
  shortlists         integer not null default 0,
  messages_received  integer not null default 0,
  resume_score       integer not null default 0,
  engagement_score   integer not null default 0,
  unique (event_id, student_id)
);

-- Kept from the Supabase schema. The app renders QR codes from ids today, so
-- nothing writes here, but the historical rows are preserved.
create table if not exists qr_codes (
  id                text primary key default gen_random_uuid()::text,
  created_at        timestamptz not null default now(),
  owner_profile_id  text references profiles (id) on delete cascade,
  owner_role        text,
  event_id          text references events (id) on delete cascade,
  qr_type           text,
  qr_payload        text
);

-- -------------------------------------------------------------- messages --
create table if not exists messages (
  id                   text primary key default gen_random_uuid()::text,
  created_at           timestamptz not null default now(),
  event_id             text references events (id) on delete cascade,
  sender_profile_id    text references profiles (id) on delete set null,
  receiver_profile_id  text references profiles (id) on delete set null,
  message              text not null,
  read_at              timestamptz
);
create index if not exists messages_sender_idx on messages (sender_profile_id, event_id, created_at desc);
create index if not exists messages_receiver_idx on messages (receiver_profile_id, event_id, created_at desc);
create index if not exists messages_unread_idx on messages (receiver_profile_id) where read_at is null;

-- ------------------------------------------------------------ checklists --
create table if not exists checklist_items (
  id           text primary key default gen_random_uuid()::text,
  created_at   timestamptz not null default now(),
  event_id     text references events (id) on delete cascade,
  role         text not null,
  title        text not null,
  description  text,
  phase        text not null check (phase in ('pre_event', 'during_event', 'post_event')),
  order_index  integer not null default 0
);
create index if not exists checklist_items_event_role_idx on checklist_items (event_id, role, order_index);
-- Lets the default checklist (lib/server/checklist-template.ts) be added to an
-- event safely more than once: repeats are ignored.
create unique index if not exists checklist_items_event_item_uniq on checklist_items (event_id, role, phase, title);

create table if not exists checklist_progress (
  id                 text primary key default gen_random_uuid()::text,
  checklist_item_id  text not null references checklist_items (id) on delete cascade,
  profile_id         text not null references profiles (id) on delete cascade,
  completed          boolean not null default false,
  completed_at       timestamptz,
  unique (profile_id, checklist_item_id)
);

-- --------------------------------------------------------------- billing --
-- Written ONLY by the Stripe webhook. The API exposes it read-only to its
-- owner, which is what keeps a paid plan from being forged from the browser.
create table if not exists subscriptions (
  profile_id              text primary key references profiles (id) on delete cascade,
  plan                    text not null default 'free' check (plan in ('free', 'pro')),
  status                  text not null default 'active',
  stripe_customer_id      text,
  stripe_subscription_id  text,
  current_period_end      timestamptz,
  updated_at              timestamptz not null default now()
);

-- Present in the Supabase schema for one-off purchases; empty in the export
-- and not read by the app yet. Server-written only, like subscriptions.
create table if not exists orders (
  id          text primary key default gen_random_uuid()::text,
  created_at  timestamptz not null default now(),
  profile_id  text references profiles (id) on delete set null,
  details     jsonb not null default '{}'
);

-- ------------------------------------------------------------ monitoring --
-- Unexpected server errors (500s) from the API, for the owner dashboard.
-- Written by lib/server/http.ts; holds no request bodies or secrets.
create table if not exists app_errors (
  id          text primary key default gen_random_uuid()::text,
  created_at  timestamptz not null default now(),
  scope       text not null,
  message     text not null
);
create index if not exists app_errors_created_idx on app_errors (created_at desc);
