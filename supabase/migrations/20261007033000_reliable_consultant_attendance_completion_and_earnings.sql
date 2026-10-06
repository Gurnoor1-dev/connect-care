-- Authoritative global reconciliation for expired consultant sessions.
create or replace function public.finalize_expired_appointments()
returns integer
language plpgsql
as $function$
declare
  changed integer := 0;
  attendance_threshold_seconds integer := 50 * 60;
  session_window interval := interval '60 minutes';
  join_early interval := interval '2 minutes';
begin
  with reconciled as (
    select
      a.id,
      least(60 * 60, greatest(coalesce(a.specialist_attendance_seconds, 0),
        case when a.specialist_first_joined_at is not null then greatest(0, extract(epoch from (
          least(a.scheduled_at + session_window,
            coalesce(a.specialist_last_left_at, a.specialist_left_at, a.specialist_last_seen_at, a.scheduled_at + session_window))
          - greatest(a.specialist_first_joined_at, a.scheduled_at - join_early)))::integer) else 0 end)) as specialist_seconds,
      least(60 * 60, greatest(coalesce(a.customer_attendance_seconds, 0),
        case when a.customer_joined_at is not null then greatest(0, extract(epoch from (
          least(a.scheduled_at + session_window,
            coalesce(a.customer_left_at, a.customer_last_seen_at, a.scheduled_at + session_window))
          - greatest(a.customer_joined_at, a.scheduled_at - join_early)))::integer) else 0 end)) as customer_seconds
    from public.appointments a
    where a.status in ('confirmed'::public.appointment_status, 'partially_completed'::public.appointment_status, 'no_show'::public.appointment_status)
      and now() >= a.scheduled_at + session_window
      and a.specialist_id is not null
  )
  update public.appointments a
  set specialist_attendance_seconds = r.specialist_seconds,
      customer_attendance_seconds = r.customer_seconds,
      status = case
        when r.specialist_seconds >= attendance_threshold_seconds then 'completed'::public.appointment_status
        when r.specialist_seconds > 0 or r.customer_seconds > 0 then 'partially_completed'::public.appointment_status
        else 'no_show'::public.appointment_status
      end,
      specialist_left_at = case when a.specialist_first_joined_at is not null then coalesce(a.specialist_left_at, a.specialist_last_left_at, a.specialist_last_seen_at, a.scheduled_at + session_window) else a.specialist_left_at end,
      specialist_last_left_at = case when a.specialist_first_joined_at is not null then coalesce(a.specialist_last_left_at, a.specialist_left_at, a.specialist_last_seen_at, a.scheduled_at + session_window) else a.specialist_last_left_at end,
      customer_left_at = case when a.customer_joined_at is not null then coalesce(a.customer_left_at, a.customer_last_seen_at, a.scheduled_at + session_window) else a.customer_left_at end,
      session_ended_at = coalesce(a.session_ended_at, a.scheduled_at + session_window),
      updated_at = now()
  from reconciled r
  where a.id = r.id;
  get diagnostics changed = row_count;

  insert into public.specialist_session_earnings (appointment_id, specialist_id, amount_cents, currency, earned_at)
  select a.id, a.specialist_id, single_tier.price_cents,
         coalesce(nullif(single_tier.currency, ''), a.currency, 'USD'),
         coalesce(a.specialist_last_left_at, a.specialist_left_at, a.session_ended_at, a.updated_at)
  from public.appointments a
  join lateral (
    select t.price_cents, t.currency
    from public.specialist_tiers t
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

create or replace function public.reconcile_specialist_attendance()
returns integer
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_specialist_id uuid := auth.uid();
  changed integer := 0;
  attendance_threshold_seconds integer := 50 * 60;
  session_window interval := interval '60 minutes';
  join_early interval := interval '2 minutes';
begin
  if v_specialist_id is null then raise exception 'Authentication required'; end if;

  with reconciled as (
    select a.id,
      least(60 * 60, greatest(coalesce(a.specialist_attendance_seconds, 0),
        case when a.specialist_first_joined_at is not null then greatest(0, extract(epoch from (
          least(a.scheduled_at + session_window,
            coalesce(a.specialist_last_left_at, a.specialist_left_at, a.specialist_last_seen_at, a.scheduled_at + session_window))
          - greatest(a.specialist_first_joined_at, a.scheduled_at - join_early)))::integer) else 0 end)) as specialist_seconds
    from public.appointments a
    where a.specialist_id = v_specialist_id
      and a.status in ('confirmed'::public.appointment_status, 'partially_completed'::public.appointment_status, 'no_show'::public.appointment_status)
      and now() >= a.scheduled_at + session_window
      and a.specialist_first_joined_at is not null
  )
  update public.appointments a
  set specialist_attendance_seconds = r.specialist_seconds,
      status = case when r.specialist_seconds >= attendance_threshold_seconds then 'completed'::public.appointment_status else a.status end,
      specialist_left_at = coalesce(a.specialist_left_at, a.specialist_last_left_at, a.specialist_last_seen_at, a.scheduled_at + session_window),
      specialist_last_left_at = coalesce(a.specialist_last_left_at, a.specialist_left_at, a.specialist_last_seen_at, a.scheduled_at + session_window),
      session_ended_at = coalesce(a.session_ended_at, a.scheduled_at + session_window),
      updated_at = now()
  from reconciled r
  where a.id = r.id;
  get diagnostics changed = row_count;

  insert into public.specialist_session_earnings (appointment_id, specialist_id, amount_cents, currency, earned_at)
  select a.id, a.specialist_id, single_tier.price_cents,
         coalesce(nullif(single_tier.currency, ''), a.currency, 'USD'),
         coalesce(a.specialist_last_left_at, a.specialist_left_at, a.session_ended_at, a.updated_at)
  from public.appointments a
  join lateral (
    select t.price_cents, t.currency
    from public.specialist_tiers t
    where t.specialist_id = a.specialist_id and t.is_active = true and t.tier_type = 'single'
      and (t.duration_minutes = a.duration_minutes or t.duration_minutes is null)
    order by case when t.duration_minutes = a.duration_minutes then 0 else 1 end, t.created_at asc
    limit 1
  ) single_tier on true
  where a.specialist_id = v_specialist_id
    and a.status = 'completed'::public.appointment_status
    and coalesce(a.specialist_attendance_seconds, 0) >= attendance_threshold_seconds
    and (a.razorpay_payment_status = 'captured' or a.payment_method = 'credits')
  on conflict (appointment_id) do update set
    specialist_id = excluded.specialist_id, amount_cents = excluded.amount_cents,
    currency = excluded.currency, earned_at = excluded.earned_at;

  return changed;
end;
$function$;