create or replace function public.finalize_expired_appointments()
returns integer
language plpgsql
as $function$
declare
  changed integer := 0;
  attendance_threshold_seconds integer := 50 * 60;
  session_window interval := interval '60 minutes';
begin
  update public.appointments a
  set specialist_attendance_seconds = least(60 * 60, coalesce(a.specialist_attendance_seconds, 0) + case
        when a.specialist_joined_at is not null and a.specialist_left_at is null
          then greatest(0, extract(epoch from (least(now(), a.scheduled_at + session_window) - a.specialist_joined_at))::integer)
        else 0 end),
      customer_attendance_seconds = least(60 * 60, coalesce(a.customer_attendance_seconds, 0) + case
        when a.customer_joined_at is not null and a.customer_left_at is null
          then greatest(0, extract(epoch from (least(now(), a.scheduled_at + session_window) - a.customer_joined_at))::integer)
        else 0 end)
  where a.status = 'confirmed'::public.appointment_status
    and now() >= a.scheduled_at + session_window;

  update public.appointments a
  set status = case
      when coalesce(a.specialist_attendance_seconds, 0) >= attendance_threshold_seconds then 'completed'::public.appointment_status
      when coalesce(a.specialist_attendance_seconds, 0) > 0 or coalesce(a.customer_attendance_seconds, 0) > 0 then 'partially_completed'::public.appointment_status
      else 'no_show'::public.appointment_status
    end,
    specialist_left_at = case when a.specialist_joined_at is not null and a.specialist_left_at is null then a.scheduled_at + session_window else a.specialist_left_at end,
    specialist_last_left_at = case when a.specialist_joined_at is not null and a.specialist_left_at is null then a.scheduled_at + session_window else a.specialist_last_left_at end,
    customer_left_at = case when a.customer_joined_at is not null and a.customer_left_at is null then a.scheduled_at + session_window else a.customer_left_at end,
    session_ended_at = coalesce(a.session_ended_at, a.scheduled_at + session_window),
    updated_at = now()
  where a.status = 'confirmed'::public.appointment_status
    and now() >= a.scheduled_at + session_window;

  get diagnostics changed = row_count;

  insert into public.specialist_session_earnings (appointment_id, specialist_id, amount_cents, currency, earned_at)
  select a.id, a.specialist_id,
    coalesce(single_tier.price_cents, 0),
    coalesce(nullif(single_tier.currency, ''), a.currency, 'USD'),
    coalesce(a.specialist_last_left_at, a.session_ended_at)
  from public.appointments a
  left join lateral (
    select t.price_cents, t.currency
    from public.specialist_tiers t
    where t.specialist_id = a.specialist_id
      and t.is_active = true
      and t.tier_type = 'single'
      and (t.duration_minutes = a.duration_minutes or t.duration_minutes is null)
    order by case when t.duration_minutes = a.duration_minutes then 0 else 1 end, t.created_at asc
    limit 1
  ) single_tier on true
  where a.status = 'completed'::public.appointment_status
    and coalesce(a.specialist_last_left_at, a.session_ended_at) is not null
    and (a.razorpay_payment_status = 'captured' or a.payment_method = 'credits')
  on conflict (appointment_id) do update set
    amount_cents=excluded.amount_cents,
    currency=excluded.currency,
    earned_at=excluded.earned_at;

  return changed;
end;
$function$;

update public.specialist_session_earnings e
set amount_cents = single_tier.price_cents,
    currency = coalesce(nullif(single_tier.currency, ''), a.currency, 'USD')
from public.appointments a
join lateral (
  select t.price_cents, t.currency
  from public.specialist_tiers t
  where t.specialist_id = a.specialist_id
    and t.is_active = true
    and t.tier_type = 'single'
    and (t.duration_minutes = a.duration_minutes or t.duration_minutes is null)
  order by case when t.duration_minutes = a.duration_minutes then 0 else 1 end, t.created_at asc
  limit 1
) single_tier on true
join public.specialist_tiers bundle_tier
  on bundle_tier.id = a.tier_id
 and bundle_tier.tier_type = 'bundle'
where e.appointment_id = a.id
  and a.status = 'completed'::public.appointment_status;