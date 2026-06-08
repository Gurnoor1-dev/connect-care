-- ============================================================
-- BreatheRise — Initial Database Migration
-- Run this entire file in Supabase → SQL Editor → Run
-- ============================================================

-- ─────────────────────────────────────────
-- 0. EXTENSIONS
-- ─────────────────────────────────────────
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────
-- 1. ENUMS
-- ─────────────────────────────────────────
do $$ begin
  create type public.app_role as enum ('customer', 'specialist', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.appointment_status as enum (
    'pending_payment',
    'confirmed',
    'completed',
    'cancelled',
    'no_show'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invitation_status as enum ('pending', 'accepted', 'expired', 'revoked');
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────
-- 2. PROFILES
-- Mirrors auth.users — created automatically by trigger
-- ─────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  notifications_opt_in boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Admins can read all profiles
create policy "Admins can read all profiles"
  on public.profiles for select
  using (public.has_role(auth.uid(), 'admin'));

-- ─────────────────────────────────────────
-- 3. USER ROLES
-- Separate table — never trust role from profiles
-- ─────────────────────────────────────────
create table if not exists public.user_roles (
  id         bigserial primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       public.app_role not null,
  created_at timestamptz default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Users can only read their own roles
create policy "Users can view their own roles"
  on public.user_roles for select
  using (auth.uid() = user_id);

-- Admins can read all roles
create policy "Admins can read all roles"
  on public.user_roles for select
  using (public.has_role(auth.uid(), 'admin'));

-- ─────────────────────────────────────────
-- 4. SECURITY DEFINER HELPER — has_role()
-- Always use this to check roles in policies
-- ─────────────────────────────────────────
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

-- ─────────────────────────────────────────
-- 5. SPECIALIST PROFILES
-- ─────────────────────────────────────────
create table if not exists public.specialist_profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  display_name    text not null default '',
  headline        text,
  bio             text,
  country         text,
  country_flag    text,
  timezone        text,
  specialities    text[] default '{}',
  qualifications  text[] default '{}',
  is_published    boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.specialist_profiles enable row level security;

-- Anyone can read published specialist profiles
create policy "Public can view published specialists"
  on public.specialist_profiles for select
  using (is_published = true);

-- Specialists can view and edit their own profile (published or not)
create policy "Specialists can manage own profile"
  on public.specialist_profiles for all
  using (auth.uid() = id);

-- Admins can read all
create policy "Admins can read all specialist profiles"
  on public.specialist_profiles for select
  using (public.has_role(auth.uid(), 'admin'));

-- ─────────────────────────────────────────
-- 6. SPECIALIST TIERS (pricing)
-- ─────────────────────────────────────────
create table if not exists public.specialist_tiers (
  id                uuid primary key default gen_random_uuid(),
  specialist_id     uuid not null references public.specialist_profiles(id) on delete cascade,
  label             text not null,
  duration_minutes  int not null default 30,
  price_cents       int not null default 0,
  currency          text not null default 'USD',
  is_active         boolean default true,
  created_at        timestamptz default now()
);

alter table public.specialist_tiers enable row level security;

-- Anyone can read active tiers for published specialists
create policy "Public can view active tiers for published specialists"
  on public.specialist_tiers for select
  using (
    is_active = true
    and exists (
      select 1 from public.specialist_profiles sp
      where sp.id = specialist_id and sp.is_published = true
    )
  );

-- Specialists manage their own tiers
create policy "Specialists can manage own tiers"
  on public.specialist_tiers for all
  using (auth.uid() = specialist_id);

-- ─────────────────────────────────────────
-- 7. SPECIALIST AVAILABILITY
-- Weekly recurring slots
-- ─────────────────────────────────────────
create table if not exists public.specialist_availability (
  id              uuid primary key default gen_random_uuid(),
  specialist_id   uuid not null references public.specialist_profiles(id) on delete cascade,
  day_of_week     int not null check (day_of_week between 0 and 6), -- 0=Sun
  start_time      time not null,
  end_time        time not null,
  is_active       boolean default true,
  created_at      timestamptz default now()
);

alter table public.specialist_availability enable row level security;

-- Anyone authenticated can read active availability
create policy "Authenticated users can view availability"
  on public.specialist_availability for select
  to authenticated
  using (is_active = true);

-- Specialists manage their own availability
create policy "Specialists can manage own availability"
  on public.specialist_availability for all
  using (auth.uid() = specialist_id);

-- ─────────────────────────────────────────
-- 8. APPOINTMENTS
-- ─────────────────────────────────────────
create table if not exists public.appointments (
  id                uuid primary key default gen_random_uuid(),
  customer_id       uuid not null references auth.users(id) on delete restrict,
  specialist_id     uuid not null references public.specialist_profiles(id) on delete restrict,
  tier_id           uuid references public.specialist_tiers(id) on delete set null,

  -- Scheduling
  scheduled_at      timestamptz not null,
  duration_minutes  int not null default 30,
  status            public.appointment_status not null default 'pending_payment',

  -- Payment (PayU)
  amount_cents      int not null default 0,
  currency          text not null default 'USD',
  payu_txn_id       text,
  payu_mihpayid     text,

  -- Video (Daily.co)
  daily_room_url    text,
  daily_room_name   text,

  -- Notes
  session_notes     text,
  notes_updated_at  timestamptz,

  -- Denormalised for specialist UI (set by trigger)
  customer_name     text,

  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

alter table public.appointments enable row level security;

-- Customers can read their own appointments
create policy "Customers can view own appointments"
  on public.appointments for select
  using (auth.uid() = customer_id);

-- Customers can create appointments for themselves
create policy "Customers can create appointments"
  on public.appointments for insert
  with check (auth.uid() = customer_id);

-- Specialists can view appointments assigned to them
create policy "Specialists can view own appointments"
  on public.appointments for select
  using (auth.uid() = specialist_id);

-- Specialists can update session_notes and notes_updated_at on their appointments
create policy "Specialists can update session notes"
  on public.appointments for update
  using (auth.uid() = specialist_id)
  with check (auth.uid() = specialist_id);

-- Admins can do everything
create policy "Admins have full access to appointments"
  on public.appointments for all
  using (public.has_role(auth.uid(), 'admin'));

-- ─────────────────────────────────────────
-- 9. SPECIALIST INVITATIONS
-- Specialists can only join via invite
-- ─────────────────────────────────────────
create table if not exists public.specialist_invitations (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  full_name   text,
  invited_by  uuid references auth.users(id) on delete set null,
  token       text not null unique default encode(gen_random_bytes(32), 'hex'),
  status      public.invitation_status not null default 'pending',
  expires_at  timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at  timestamptz default now()
);

alter table public.specialist_invitations enable row level security;

-- Admins can do everything
create policy "Admins manage invitations"
  on public.specialist_invitations for all
  using (public.has_role(auth.uid(), 'admin'));

-- Anyone (even unauthenticated) can read a single invite row by token
-- (used by /invite/:token page before login)
create policy "Public can read invitations by token"
  on public.specialist_invitations for select
  using (true);

-- ─────────────────────────────────────────
-- 10. TRIGGERS
-- ─────────────────────────────────────────

-- 10a. on_auth_user_created
-- Creates a profile row and assigns 'customer' role on new signup.
-- Skips role assignment if email already has an accepted specialist invitation
-- (the accept-specialist-invite edge function handles role in that case).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite_exists boolean;
begin
  -- Upsert profile
  insert into public.profiles (id, email, full_name, notifications_opt_in)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'notifications_opt_in')::boolean, false)
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, profiles.full_name);

  -- Check if this email has an accepted specialist invitation
  select exists (
    select 1 from public.specialist_invitations
    where email = new.email and status = 'accepted'
  ) into v_invite_exists;

  -- Only assign 'customer' role if not a specialist invite
  if not v_invite_exists then
    insert into public.user_roles (user_id, role)
    values (new.id, 'customer')
    on conflict (user_id, role) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 10b. appointments_stamp_customer
-- Denormalises customer full_name onto appointments so specialists can see
-- the patient name without a join that crosses RLS boundaries.
create or replace function public.stamp_customer_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.customer_name := (
    select full_name from public.profiles where id = new.customer_id
  );
  return new;
end;
$$;

drop trigger if exists appointments_stamp_customer on public.appointments;
create trigger appointments_stamp_customer
  before insert on public.appointments
  for each row execute function public.stamp_customer_name();

-- 10c. updated_at auto-stamps
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists specialist_profiles_updated_at on public.specialist_profiles;
create trigger specialist_profiles_updated_at
  before update on public.specialist_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists appointments_updated_at on public.appointments;
create trigger appointments_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────
-- 11. INDEXES (performance)
-- ─────────────────────────────────────────
create index if not exists idx_appointments_customer_id     on public.appointments(customer_id);
create index if not exists idx_appointments_specialist_id   on public.appointments(specialist_id);
create index if not exists idx_appointments_scheduled_at    on public.appointments(scheduled_at);
create index if not exists idx_appointments_status          on public.appointments(status);
create index if not exists idx_appointments_payu_txn_id     on public.appointments(payu_txn_id);
create index if not exists idx_specialist_tiers_specialist  on public.specialist_tiers(specialist_id);
create index if not exists idx_availability_specialist      on public.specialist_availability(specialist_id);
create index if not exists idx_invitations_token            on public.specialist_invitations(token);
create index if not exists idx_invitations_email            on public.specialist_invitations(email);
create index if not exists idx_user_roles_user_id           on public.user_roles(user_id);

-- ─────────────────────────────────────────
-- 12. GRANT USAGE
-- Ensure the anon / authenticated roles can use the public schema
-- ─────────────────────────────────────────
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
grant select on public.specialist_profiles to anon;
grant select on public.specialist_tiers to anon;
grant select on public.specialist_invitations to anon;

-- ─────────────────────────────────────────
-- DONE — run "db/002_promote_admin.sql" next
-- to give yourself the admin role.
-- ─────────────────────────────────────────
