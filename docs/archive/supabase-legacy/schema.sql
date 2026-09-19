-- GradLink — run this in your Supabase project (SQL Editor → New query → Run).
-- Creates two tables for sign-ups: students and companies.

-- ===== Students =====
create table if not exists public.students (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  auth_id     uuid references auth.users (id) on delete set null,
  full_name   text not null,
  email       text not null unique,
  university  text not null
);

-- ===== Companies =====
create table if not exists public.companies (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  auth_id     uuid references auth.users (id) on delete set null,
  full_name   text not null,
  email       text not null unique,
  company     text not null
);

-- ===== Colleges / Event hosts =====
create table if not exists public.colleges (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  auth_id     uuid references auth.users (id) on delete set null,
  full_name   text not null,
  email       text not null unique,
  institution text not null
);

-- ===== Row Level Security =====
alter table public.students  enable row level security;
alter table public.companies enable row level security;
alter table public.colleges  enable row level security;

-- Allow sign-up inserts from the public (anon) client. Tighten for production.
create policy "students_insert_anon"  on public.students  for insert to anon, authenticated with check (true);
create policy "companies_insert_anon" on public.companies for insert to anon, authenticated with check (true);
create policy "colleges_insert_anon"  on public.colleges  for insert to anon, authenticated with check (true);

-- Let a signed-in user read only their own row.
create policy "students_select_own"  on public.students  for select to authenticated using (auth.uid() = auth_id);
create policy "companies_select_own" on public.companies for select to authenticated using (auth.uid() = auth_id);
create policy "colleges_select_own"  on public.colleges  for select to authenticated using (auth.uid() = auth_id);
