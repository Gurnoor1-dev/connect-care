-- Keep a session alive when either participant misses the first 10 minutes.
-- A consultant who actually attends can still complete the full one-hour window,
-- be marked completed at the 50-minute attendance threshold, and earn the session.
create or replace function public.expire_unattended_appointments()
returns integer
language plpgsql
security definer
set search_path = public
as $function$
declare
  affected integer;
begin
  update public.appointments
  set status = 'no_show',
      updated_at = now()
  where status = 'confirmed'
    and scheduled_at + interval '10 minutes' <= now()
    and (customer_joined_at is null or customer_joined_at > scheduled_at + interval '10 minutes')
    and (specialist_joined_at is null or specialist_joined_at > scheduled_at + interval '10 minutes');

  get diagnostics affected = row_count;
  return affected;
end
$function$;

-- Finalize every expired session, including sessions previously marked no_show or
-- partially_completed by the old 10-minute rule. This makes the completion/earning
-- state recoverable globally for every consultant.
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
  set specialist_attendance_seconds = least(
        60 * 60,
        greatest(
          coalesce(a.specialist_attendance_seconds, 0),
          coalesce(
            case
              when a.specialist_joined_at is not null then greatest(
                0,
                extract(epoch from (
                  least(
                    a.scheduled_at + session_window,
                    coalesce(a.specialist_last_seen_at, a.specialist_left_at, a.specialist_last_left_at, a.scheduled_at + session_window)
                  ) - a.specialist_joined_at
                ))::integer
              )
              else 0
            end,
            0
          )
        )
      ),
      customer_attendance_seconds = least(
        60 * 60,
        greatest(
          coalesce(a.customer_attendance_seconds, 0),
          coalesce(
            case
              when a.customer_joined_at is not null then greatest(
                0,
                extract(epoch from (
                  least(
                    a.scheduled_at + session_window,
                    coalesce(a.customer_last_seen_at, a.customer_left_at, a.scheduled_at + session_window)
                  ) - a.customer_joined_at
                ))::integer
              )
              else 0
            end,
            0
          )
        )
      )
  where a.status in ('confirmed'::public.appointment_status, 'partially_completed'::public.appointment_status, 'no_show'::public.appointment_status)
    and now() >= a.scheduled_at + session_window;

  update public.appointments a
  set status = case
      when coalesce(a.specialist_attendance_seconds, 0) >= attendance_threshold_seconds then 'completed'::public.appointment_status
      when coalesce(a.specialist_attendance_seconds, 0) > 0 or coalesce(a.customer_attendance_seconds, 0) > 0 then 'partially_completed'::public.appointment_status
      else 'no_show'::public.appointment_status
    end,
    specialist_left_at = coalesce(a.specialist_left_at, a.specialist_last_left_at, a.specialist_last_seen_at, case when a.specialist_joined_at is not null then a.scheduled_at + session_window end),
    specialist_last_left_at = coalesce(a.specialist_last_left_at, a.specialist_left_at, a.specialist_last_seen_at, case when a.specialist_joined_at is not null then a.scheduled_at + session_window end),
    customer_left_at = coalesce(a.customer_left_at, a.customer_last_seen_at, case when a.customer_joined_at is not null then a.scheduled_at + session_window end),
    session_ended_at = coalesce(a.session_ended_at, a.scheduled_at + session_window),
    updated_at = now()
  where a.status in ('confirmed'::public.appointment_status, 'partially_completed'::public.appointment_status, 'no_show'::public.appointment_status)
    and now() >= a.scheduled_at + session_window;

  get diagnostics changed = row_count;

  insert into public.specialist_session_earnings (appointment_id, specialist_id, amount_cents, currency, earned_at)
  select a.id,
         a.specialist_id,
         single_tier.price_cents,
         coalesce(nullif(single_tier.currency, ''), a.currency, 'USD'),
         coalesce(a.specialist_last_left_at, a.specialist_left_at, a.session_ended_at, a.updated_at)
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
  where a.status = 'completed'::public.appointment_status
    and coalesce(a.specialist_attendance_seconds, 0) >= attendance_threshold_seconds
    and (a.razorpay_payment_status = 'captured' or a.payment_method = 'credits')
  on conflict (appointment_id) do update set
    specialist_id = excluded.specialist_id,
    amount_cents = excluded.amount_cents,
    currency = excluded.currency,
    earned_at = excluded.earned_at;

  return changed;
end;
$function$;

-- Repair all already-finished sessions immediately, including historical sessions
-- that were incorrectly left as no_show/partially_completed by the old rule.
select public.finalize_expired_appointments();
