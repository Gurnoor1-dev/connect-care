create table if not exists public.specialist_session_earnings (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments(id) on delete cascade,
  specialist_id uuid not null references public.specialist_profiles(id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null,
  earned_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists specialist_session_earnings_specialist_earned_idx
  on public.specialist_session_earnings (specialist_id, earned_at desc);

alter table public.specialist_session_earnings enable row level security;

drop policy if exists "Specialists can view their own session earnings" on public.specialist_session_earnings;
create policy "Specialists can view their own session earnings"
  on public.specialist_session_earnings
  for select
  to authenticated
  using ((select auth.uid()) = specialist_id);

revoke all on public.specialist_session_earnings from anon;
grant select on public.specialist_session_earnings to authenticated;

create or replace function public.finalize_expired_appointments()
returns integer
language plpgsql
as $function$
declare
  changed integer := 0;
begin
  update public.appointments a
  set status = case
      when a.specialist_joined_at is null and a.customer_joined_at is null then 'no_show'::public.appointment_status
      when a.specialist_joined_at is not null
        and a.customer_joined_at is not null
        and (a.specialist_left_at is null or a.specialist_left_at >= a.scheduled_at + make_interval(mins => a.duration_minutes))
        and (a.customer_left_at is null or a.customer_left_at >= a.scheduled_at + make_interval(mins => a.duration_minutes))
        then 'completed'::public.appointment_status
      else 'partially_completed'::public.appointment_status
    end,
    session_ended_at = a.scheduled_at + make_interval(mins => a.duration_minutes),
    updated_at = now()
  where a.status = 'confirmed'::public.appointment_status
    and now() >= a.scheduled_at + make_interval(mins => a.duration_minutes);

  get diagnostics changed = row_count;

  insert into public.specialist_session_earnings (
    appointment_id, specialist_id, amount_cents, currency, earned_at
  )
  select
    a.id,
    a.specialist_id,
    case
      when coalesce(a.amount_cents, 0) > 0 then a.amount_cents
      when t.tier_type = 'bundle' and coalesce(t.session_count, 0) > 0
        then floor(t.price_cents::numeric / t.session_count)::integer
      else coalesce(t.price_cents, 0)
    end,
    coalesce(nullif(a.currency, ''), t.currency, 'USD'),
    a.session_ended_at
  from public.appointments a
  left join public.specialist_tiers t on t.id = a.tier_id
  where a.status = 'completed'::public.appointment_status
    and a.razorpay_payment_status = 'captured'
    and a.session_ended_at is not null
  on conflict (appointment_id) do update
    set amount_cents = excluded.amount_cents,
        currency = excluded.currency,
        earned_at = excluded.earned_at;

  return changed;
end;
$function$;

insert into public.specialist_session_earnings (
  appointment_id, specialist_id, amount_cents, currency, earned_at
)
select
  a.id,
  a.specialist_id,
  case
    when coalesce(a.amount_cents, 0) > 0 then a.amount_cents
    when t.tier_type = 'bundle' and coalesce(t.session_count, 0) > 0
      then floor(t.price_cents::numeric / t.session_count)::integer
    else coalesce(t.price_cents, 0)
  end,
  coalesce(nullif(a.currency, ''), t.currency, 'USD'),
  a.session_ended_at
from public.appointments a
left join public.specialist_tiers t on t.id = a.tier_id
where a.status = 'completed'::public.appointment_status
  and a.razorpay_payment_status = 'captured'
  and a.session_ended_at is not null
on conflict (appointment_id) do nothing;
