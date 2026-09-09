alter table public.specialist_tiers
  add column if not exists tier_type text not null default 'single';

alter table public.specialist_tiers
  add column if not exists session_count integer not null default 1;

alter table public.specialist_tiers
  add column if not exists credit_points integer not null default 2;

alter table public.specialist_tiers
  add column if not exists savings_label text;

alter table public.appointments
  add column if not exists bundle_credits_awarded_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'specialist_tiers_tier_type_check'
      and conrelid = 'public.specialist_tiers'::regclass
  ) then
    alter table public.specialist_tiers
      add constraint specialist_tiers_tier_type_check
      check (tier_type in ('single', 'bundle'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'specialist_tiers_session_count_check'
      and conrelid = 'public.specialist_tiers'::regclass
  ) then
    alter table public.specialist_tiers
      add constraint specialist_tiers_session_count_check
      check (session_count > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'specialist_tiers_credit_points_check'
      and conrelid = 'public.specialist_tiers'::regclass
  ) then
    alter table public.specialist_tiers
      add constraint specialist_tiers_credit_points_check
      check (credit_points >= session_count * 2);
  end if;
end $$;

update public.specialist_tiers
set
  tier_type = case when session_count > 1 then 'bundle' else 'single' end,
  session_count = greatest(coalesce(session_count, 1), 1),
  credit_points = greatest(coalesce(credit_points, 2), greatest(coalesce(session_count, 1), 1) * 2)
where session_count is null or credit_points is null or tier_type is null;

create table if not exists public.customer_specialist_credits (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  specialist_id uuid not null references public.specialist_profiles(id) on delete cascade,
  credit_points integer not null default 0 check (credit_points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, specialist_id)
);

create index if not exists customer_specialist_credits_customer_idx
  on public.customer_specialist_credits(customer_id);

create index if not exists customer_specialist_credits_specialist_idx
  on public.customer_specialist_credits(specialist_id);

alter table public.customer_specialist_credits enable row level security;

drop policy if exists "Customers can view own specialist credits" on public.customer_specialist_credits;
create policy "Customers can view own specialist credits"
on public.customer_specialist_credits
for select
to authenticated
using ((select auth.uid()) = customer_id);

drop policy if exists "Admins can manage customer specialist credits" on public.customer_specialist_credits;
create policy "Admins can manage customer specialist credits"
on public.customer_specialist_credits
for all
to authenticated
using (public.has_role((select auth.uid()), 'admin'))
with check (public.has_role((select auth.uid()), 'admin'));

grant select on public.customer_specialist_credits to authenticated;
grant insert, update, delete on public.customer_specialist_credits to authenticated;
grant select on public.specialist_tiers to anon, authenticated;
grant select, insert, update, delete on public.specialist_tiers to authenticated;
