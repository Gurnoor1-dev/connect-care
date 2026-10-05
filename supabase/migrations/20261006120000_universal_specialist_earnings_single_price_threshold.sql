create or replace function public.record_specialist_session_earning()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  single_price integer;
  single_currency text;
  earned_time timestamptz;
begin
  -- A specialist earns exactly one full single-session price per completed
  -- appointment. Bundle discounts never determine specialist earnings.
  if new.status <> 'completed'::public.appointment_status then
    return new;
  end if;

  -- A completed earning is only valid when the specialist actually attended
  -- the full 50-minute session threshold.
  if coalesce(new.specialist_attendance_seconds, 0) < 50 * 60 then
    return new;
  end if;

  if not (new.razorpay_payment_status = 'captured' or new.payment_method = 'credits') then
    return new;
  end if;

  -- Always resolve the consultant's active single-session tier. This applies
  -- equally to single bookings and bundle/credit bookings.
  select t.price_cents, t.currency
    into single_price, single_currency
  from public.specialist_tiers t
  where t.specialist_id = new.specialist_id
    and t.is_active = true
    and t.tier_type = 'single'
    and (t.duration_minutes = new.duration_minutes or t.duration_minutes is null)
  order by case when t.duration_minutes = new.duration_minutes then 0 else 1 end,
           t.created_at asc
  limit 1;

  if single_price is null then
    return new;
  end if;

  earned_time := coalesce(new.session_ended_at, new.updated_at, now());

  insert into public.specialist_session_earnings
    (appointment_id, specialist_id, amount_cents, currency, earned_at)
  values
    (new.id, new.specialist_id, single_price,
     coalesce(nullif(single_currency, ''), new.currency, 'USD'), earned_time)
  on conflict (appointment_id) do update set
    specialist_id = excluded.specialist_id,
    amount_cents = excluded.amount_cents,
    currency = excluded.currency,
    earned_at = excluded.earned_at;

  return new;
end;
$$;

drop trigger if exists trg_record_specialist_session_earning on public.appointments;
create trigger trg_record_specialist_session_earning
after insert or update of status, amount_cents, currency, tier_id, payment_method, razorpay_payment_status, session_ended_at
on public.appointments
for each row
when (new.status = 'completed'::public.appointment_status)
execute function public.record_specialist_session_earning();

-- Repair/backfill all eligible completed sessions for every specialist. This
-- intentionally replaces any historical bundle-discount amount with the
-- consultant's single-session price and creates missing earning rows.
insert into public.specialist_session_earnings
  (appointment_id, specialist_id, amount_cents, currency, earned_at)
select
  a.id,
  a.specialist_id,
  single_tier.price_cents,
  coalesce(nullif(single_tier.currency, ''), a.currency, 'USD'),
  coalesce(a.session_ended_at, a.updated_at, now())
from public.appointments a
join lateral (
  select t.price_cents, t.currency
  from public.specialist_tiers t
  where t.specialist_id = a.specialist_id
    and t.is_active = true
    and t.tier_type = 'single'
    and (t.duration_minutes = a.duration_minutes or t.duration_minutes is null)
  order by case when t.duration_minutes = a.duration_minutes then 0 else 1 end,
           t.created_at asc
  limit 1
) single_tier on true
where a.status = 'completed'::public.appointment_status
  and coalesce(a.specialist_attendance_seconds, 0) >= 50 * 60
  and (a.razorpay_payment_status = 'captured' or a.payment_method = 'credits')
on conflict (appointment_id) do update set
  specialist_id = excluded.specialist_id,
  amount_cents = excluded.amount_cents,
  currency = excluded.currency,
  earned_at = excluded.earned_at;
