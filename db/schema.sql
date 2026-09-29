-- ============================================================================
-- GradLink — Neon PostgreSQL schema
-- ============================================================================
-- Apply with:   npm run db:migrate        (reads DATABASE_URL from .dev.vars)
-- or paste into the Neon console's SQL Editor.
--
-- Idempotent: every statement is `if not exists` (or guarded the same way),
-- so re-running is safe.
--
-- Table and column names match the original Supabase schema (and the snake_case
-- fields the Firestore layer carried over), so the app's row types are
-- unchanged. What's new compared with Supabase:
--   * events.join_code / host_org       — the multi-event model
--   * subscriptions                     — Stripe entitlement (was Firestore-only)
--   * auth_credentials / password_reset_tokens — replaces Supabase/Firebase Auth
--   * event_sessions, session_bookings, saved_companies, applications:
--       the student readiness hub, schedule, passport and application tracker
--   * notifications, interview_invites, booth_queue: alerts, interview
--       invites and live booth queues
--   * student_courses: Coursera certificates verified with Coursera, and
--       courses in progress
--   * student_scores: LeetCode and Codeforces profiles verified with those
--       sites, and self-reported test scores
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
create index if not exists colleges_email_lower_idx on colleges (lower(email));

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
  join_code    text unique,
  -- IANA zone the event runs in (e.g. Asia/Kolkata). Session times are
  -- entered and shown in it; null for events made before it was stored.
  timezone     text
);
alter table events add column if not exists timezone text;
create index if not exists events_created_by_idx on events (created_by, created_at desc);

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

-- ------------------------------------------------ student career profile --
-- Career goal, target roles and projects feed the readiness hub and company
-- matching. projects is a small JSON array of {title, url, description}.
alter table students add column if not exists career_goal text;
alter table students add column if not exists target_roles text[] not null default '{}';
alter table students add column if not exists projects jsonb not null default '[]';

-- ------------------------------------------------------- event sessions --
-- Workshops, mock interviews, company sessions, 1:1 recruiter slots and the
-- like. Created by the event's organiser, or by a company registered for the
-- event (company sessions, recruiter slots and mock interviews only).
-- capacity null means unlimited.
create table if not exists event_sessions (
  id               text primary key default gen_random_uuid()::text,
  created_at       timestamptz not null default now(),
  event_id         text not null references events (id) on delete cascade,
  host_profile_id  text references profiles (id) on delete set null,
  kind             text not null,
  title            text not null,
  description      text,
  location         text,
  starts_at        timestamptz not null,
  ends_at          timestamptz,
  capacity         integer check (capacity is null or capacity > 0)
);
create index if not exists event_sessions_event_idx on event_sessions (event_id, starts_at);

-- One row per student per session. A booking past capacity is waitlisted and
-- promoted in created_at order when a place frees up. The host marks
-- attendance, which is what the digital passport and engagement score count.
create table if not exists session_bookings (
  id          text primary key default gen_random_uuid()::text,
  created_at  timestamptz not null default now(),
  session_id  text not null references event_sessions (id) on delete cascade,
  profile_id  text not null references profiles (id) on delete cascade,
  status      text not null check (status in ('booked', 'waitlisted', 'attended', 'cancelled')),
  unique (session_id, profile_id)
);
create index if not exists session_bookings_profile_idx on session_bookings (profile_id);
create index if not exists session_bookings_session_idx on session_bookings (session_id, status, created_at);

-- A student's plan for the companies at an event. Replaces the per-browser
-- localStorage copy, so it syncs across devices.
create table if not exists saved_companies (
  student_id  text not null references profiles (id) on delete cascade,
  event_id    text not null references events (id) on delete cascade,
  company_id  text not null references profiles (id) on delete cascade,
  saved       boolean not null default false,
  interested  boolean not null default false,
  visited     boolean not null default false,
  follow_up   boolean not null default false,
  note        text,
  updated_at  timestamptz not null default now(),
  primary key (student_id, event_id, company_id)
);

-- Applications a student is tracking, with interview date and outcome.
-- company_id is set when the company is on GradLink, company_name always.
create table if not exists applications (
  id            text primary key default gen_random_uuid()::text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  student_id    text not null references profiles (id) on delete cascade,
  event_id      text references events (id) on delete set null,
  company_id    text references profiles (id) on delete set null,
  company_name  text not null,
  role_title    text not null,
  status        text not null default 'applied' check (status in ('applied', 'interviewing', 'offer', 'accepted', 'rejected', 'withdrawn')),
  interview_at  timestamptz,
  notes         text
);
create index if not exists applications_student_idx on applications (student_id, updated_at desc);

-- Alumni mentoring joined the session types after the table was first created,
-- so the check is replaced rather than relying on create table.
alter table event_sessions drop constraint if exists event_sessions_kind_check;
alter table event_sessions add constraint event_sessions_kind_check
  check (kind in ('workshop', 'mock_interview', 'company_session', 'recruiter_slot', 'networking', 'talk', 'mentoring'));

-- ---------------------------------------------------------- notifications --
-- In-app alerts: an interview invite, a waitlist place opening up, your turn
-- in a booth queue. Written only by the server.
create table if not exists notifications (
  id          text primary key default gen_random_uuid()::text,
  created_at  timestamptz not null default now(),
  profile_id  text not null references profiles (id) on delete cascade,
  kind        text not null,
  title       text not null,
  body        text,
  href        text,
  read_at     timestamptz
);
create index if not exists notifications_profile_idx on notifications (profile_id, created_at desc);
create index if not exists notifications_unread_idx on notifications (profile_id) where read_at is null;

-- ------------------------------------------------------ interview invites --
-- A company invites a student it met at an event, with up to five proposed
-- times. Accepting books the chosen time into the student's applications.
create table if not exists interview_invites (
  id              text primary key default gen_random_uuid()::text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  event_id        text references events (id) on delete set null,
  company_id      text not null references profiles (id) on delete cascade,
  student_id      text not null references profiles (id) on delete cascade,
  role_title      text not null,
  message         text,
  location        text,
  proposed_times  timestamptz[] not null default '{}',
  status          text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  chosen_time     timestamptz,
  application_id  text references applications (id) on delete set null
);
create index if not exists interview_invites_student_idx on interview_invites (student_id, created_at desc);
create index if not exists interview_invites_company_idx on interview_invites (company_id, event_id);

-- ------------------------------------------------------------ booth queues --
-- A live queue at each company's booth. One row per student per booth;
-- re-joining after being seen or leaving puts the student at the back.
create table if not exists booth_queue (
  id          text primary key default gen_random_uuid()::text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  event_id    text not null references events (id) on delete cascade,
  company_id  text not null references profiles (id) on delete cascade,
  student_id  text not null references profiles (id) on delete cascade,
  status      text not null default 'waiting' check (status in ('waiting', 'called', 'seen', 'left')),
  called_at   timestamptz,
  unique (event_id, company_id, student_id)
);
create index if not exists booth_queue_booth_idx on booth_queue (event_id, company_id, status, created_at);

-- --------------------------------------------------------- student courses --
-- Online courses on a student's profile. A "certificate" row was verified
-- against the provider's public verify page (the learner name matched the
-- student); an "in_progress" row is a real course the student says they are
-- taking. One certificate can belong to one student only.
create table if not exists student_courses (
  id                   text primary key default gen_random_uuid()::text,
  created_at           timestamptz not null default now(),
  student_id           text not null references profiles (id) on delete cascade,
  provider             text not null default 'coursera',
  status               text not null check (status in ('certificate', 'in_progress')),
  certificate_code     text,
  course_id            text,
  course_slug          text,
  course_name          text not null,
  partner_name         text,
  completed_at         timestamptz,
  skills               text[] not null default '{}',
  visible_to_employers boolean not null default true,
  unique (provider, certificate_code)
);
create index if not exists student_courses_student_idx on student_courses (student_id, created_at desc);

-- ---------------------------------------------------------- student scores --
-- Coding profiles and test scores a student adds to their profile.
--   * leetcode / codeforces: one per student. The row is pending (verify_code
--     or verify_started_at set, verified_at null) until the student proves
--     they own the handle; only verified rows are shown to anyone else, and a
--     handle can be verified on one account only. Stats are read from the site.
--   * test: an exam score (GRE, IELTS, ...) the student reports themselves.
create table if not exists student_scores (
  id                   text primary key default gen_random_uuid()::text,
  created_at           timestamptz not null default now(),
  student_id           text not null references profiles (id) on delete cascade,
  kind                 text not null check (kind in ('leetcode', 'codeforces', 'test')),
  handle               text,
  verify_code          text,
  verify_started_at    timestamptz,
  verified_at          timestamptz,
  stats                jsonb not null default '{}',
  stats_at             timestamptz,
  test_key             text,
  test_name            text,
  score                text,
  taken_on             text, -- YYYY-MM-DD; text so no time zone can shift the day
  visible_to_employers boolean not null default true
);
create index if not exists student_scores_student_idx on student_scores (student_id, created_at);
create unique index if not exists student_scores_site_uniq on student_scores (student_id, kind) where kind <> 'test';
create unique index if not exists student_scores_handle_uniq on student_scores (kind, lower(handle)) where verified_at is not null;

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
