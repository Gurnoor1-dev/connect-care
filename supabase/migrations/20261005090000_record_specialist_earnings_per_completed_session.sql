create or replace function public.record_specialist_session_earning()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tier_price integer;
  tier_currency text;
  tier_type text;
  tier_session_count integer;
  earning_amount integer;
  earning_currency text;
  earned_time timestamptz;
begin
  if new.status <> 'completed'::public.appointment_status then
    return new;
  end if;

  if not (new.razorpay_payment_status = 'captured' or new.payment_method = 'credits') then
    return new;
  end if;

  select t.price_cents, t.currency, t.tier_type, t.session_count
    into tier_price, tier_currency, tier_type, tier_session_count
  from public.specialist_tiers t
  where t.id = new.tier_id;

  if tier_type = 'bundle' and coalesce(tier_session_count, 0) > 0 then
    earning_amount := floor(tier_price::numeric / tier_session_count)::integer;
  else
    earning_amount := coalesce(nullif(new.amount_cents, 0), tier_price, 0);
  end if;

  earning_currency := coalesce(nullif(new.currency, ''), tier_currency, 'USD');
  earned_time := coalesce(new.session_ended_at, new.updated_at, now());

  insert into public.specialist_session_earnings
    (appointment_id, specialist_id, amount_cents, currency, earned_at)
  values
    (new.id, new.specialist_id, earning_amount, earning_currency, earned_time)
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

insert into public.specialist_session_earnings
  (appointment_id, specialist_id, amount_cents, currency, earned_at)
select
  a.id,
  a.specialist_id,
  case
    when t.tier_type = 'bundle' and coalesce(t.session_count, 0) > 0
      then floor(t.price_cents::numeric / t.session_count)::integer
    else coalesce(nullif(a.amount_cents, 0), t.price_cents, 0)
  end,
  coalesce(nullif(a.currency, ''), t.currency, 'USD'),
  coalesce(a.session_ended_at, a.updated_at, now())
from public.appointments a
left join public.specialist_tiers t on t.id = a.tier_id
where a.status = 'completed'::public.appointment_status
  and (a.razorpay_payment_status = 'captured' or a.payment_method = 'credits')
on conflict (appointment_id) do update set
  specialist_id = excluded.specialist_id,
  amount_cents = excluded.amount_cents,
  currency = excluded.currency,
  earned_at = excluded.earned_at;
