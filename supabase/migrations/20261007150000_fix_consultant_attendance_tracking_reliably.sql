alter table public.appointments
  add column if not exists specialist_last_seen_at timestamptz,
  add column if not exists customer_last_seen_at timestamptz;

update public.appointments
set specialist_last_seen_at = coalesce(specialist_last_seen_at, specialist_last_left_at, specialist_left_at, specialist_joined_at)
where specialist_last_seen_at is null and specialist_joined_at is not null;

update public.appointments
set customer_last_seen_at = coalesce(customer_last_seen_at, customer_left_at, customer_joined_at)
where customer_last_seen_at is null and customer_joined_at is not null;

update public.appointments
set specialist_attendance_seconds = greatest(
      coalesce(specialist_attendance_seconds, 0),
      least(60 * 60, greatest(0, extract(epoch from (
        least(scheduled_at + interval '60 minutes', specialist_last_left_at)
        - greatest(specialist_first_joined_at, scheduled_at - interval '2 minutes')
      ))::integer))
    ),
    status = 'completed'::public.appointment_status,
    session_ended_at = coalesce(session_ended_at, scheduled_at + interval '60 minutes'),
    updated_at = now()
where status in ('confirmed','partially_completed','no_show')
  and specialist_first_joined_at is not null
  and specialist_last_left_at is not null
  and scheduled_at < now()
  and specialist_last_left_at > specialist_first_joined_at
  and extract(epoch from (
    least(scheduled_at + interval '60 minutes', specialist_last_left_at)
    - greatest(specialist_first_joined_at, scheduled_at - interval '2 minutes')
  )) >= 50 * 60;

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
          then greatest(0, extract(epoch from (
            least(a.scheduled_at + session_window, coalesce(a.specialist_last_seen_at, a.specialist_joined_at))
            - a.specialist_joined_at
          ))::integer)
        else 0 end),
      customer_attendance_seconds = least(60 * 60, coalesce(a.customer_attendance_seconds, 0) + case
        when a.customer_joined_at is not null and a.customer_left_at is null
          then greatest(0, extract(epoch from (
            least(a.scheduled_at + session_window, coalesce(a.customer_last_seen_at, a.customer_joined_at))
            - a.customer_joined_at
          ))::integer)
        else 0 end)
  where a.status = 'confirmed'::public.appointment_status
    and now() >= a.scheduled_at + session_window;

  update public.appointments a
  set status = case
      when coalesce(a.specialist_attendance_seconds, 0) >= attendance_threshold_seconds then 'completed'::public.appointment_status
      when coalesce(a.specialist_attendance_seconds, 0) > 0 or coalesce(a.customer_attendance_seconds, 0) > 0 then 'partially_completed'::public.appointment_status
      else 'no_show'::public.appointment_status
    end,
    specialist_left_at = coalesce(a.specialist_left_at, a.specialist_last_seen_at, case when a.specialist_joined_at is not null then a.scheduled_at + session_window end),
    specialist_last_left_at = coalesce(a.specialist_last_left_at, a.specialist_last_seen_at, case when a.specialist_joined_at is not null then a.scheduled_at + session_window end),
    customer_left_at = coalesce(a.customer_left_at, a.customer_last_seen_at, case when a.customer_joined_at is not null then a.scheduled_at + session_window end),
    session_ended_at = coalesce(a.session_ended_at, a.scheduled_at + session_window),
    updated_at = now()
  where a.status = 'confirmed'::public.appointment_status
    and now() >= a.scheduled_at + session_window;

  get diagnostics changed = row_count;

  insert into public.specialist_session_earnings (appointment_id, specialist_id, amount_cents, currency, earned_at)
  select a.id, a.specialist_id, single_tier.price_cents,
    coalesce(nullif(single_tier.currency, ''), a.currency, 'USD'),
    coalesce(a.specialist_last_left_at, a.session_ended_at, a.updated_at)
  from public.appointments a
  join lateral (
    select t.price_cents, t.currency from public.specialist_tiers t
    where t.specialist_id = a.specialist_id and t.is_active = true and t.tier_type = 'single'
      and (t.duration_minutes = a.duration_minutes or t.duration_minutes is null)
    order by case when t.duration_minutes = a.duration_minutes then 0 else 1 end, t.created_at asc
    limit 1
  ) single_tier on true
  where a.status = 'completed'::public.appointment_status
    and coalesce(a.specialist_attendance_seconds, 0) >= attendance_threshold_seconds
    and (a.razorpay_payment_status = 'captured' or a.payment_method = 'credits')
  on conflict (appointment_id) do update set
    specialist_id = excluded.specialist_id, amount_cents = excluded.amount_cents,
    currency = excluded.currency, earned_at = excluded.earned_at;

  return changed;
end;
$function$;

insert into public.specialist_session_earnings (appointment_id, specialist_id, amount_cents, currency, earned_at)
select a.id, a.specialist_id, single_tier.price_cents,
  coalesce(nullif(single_tier.currency, ''), a.currency, 'USD'),
  coalesce(a.session_ended_at, a.updated_at, now())
from public.appointments a
join lateral (
  select t.price_cents, t.currency from public.specialist_tiers t
  where t.specialist_id = a.specialist_id and t.is_active = true and t.tier_type = 'single'
    and (t.duration_minutes = a.duration_minutes or t.duration_minutes is null)
  order by case when t.duration_minutes = a.duration_minutes then 0 else 1 end, t.created_at asc
  limit 1
) single_tier on true
where a.status = 'completed'::public.appointment_status
  and coalesce(a.specialist_attendance_seconds, 0) >= 50 * 60
  and (a.razorpay_payment_status = 'captured' or a.payment_method = 'credits')
on conflict (appointment_id) do update set
  specialist_id = excluded.specialist_id, amount_cents = excluded.amount_cents,
  currency = excluded.currency, earned_at = excluded.earned_at;