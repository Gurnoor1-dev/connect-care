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
  if v_specialist_id is null then
    raise exception 'Authentication required';
  end if;

  update public.appointments a
  set specialist_attendance_seconds = greatest(
        coalesce(a.specialist_attendance_seconds, 0),
        least(
          60 * 60,
          greatest(
            0,
            extract(epoch from (
              least(
                a.scheduled_at + session_window,
                coalesce(a.specialist_last_left_at, a.specialist_left_at, a.specialist_last_seen_at)
              )
              - greatest(a.specialist_first_joined_at, a.scheduled_at - join_early)
            ))::integer
          )
        )
      ),
      session_ended_at = coalesce(a.session_ended_at, a.scheduled_at + session_window),
      updated_at = now()
  where a.specialist_id = v_specialist_id
    and a.status in ('confirmed'::public.appointment_status, 'partially_completed'::public.appointment_status, 'no_show'::public.appointment_status)
    and now() >= a.scheduled_at + session_window
    and a.specialist_first_joined_at is not null
    and coalesce(a.specialist_last_left_at, a.specialist_left_at, a.specialist_last_seen_at) is not null;

  update public.appointments a
  set status = 'completed'::public.appointment_status,
      specialist_left_at = coalesce(a.specialist_left_at, a.specialist_last_left_at, a.specialist_last_seen_at, a.scheduled_at + session_window),
      specialist_last_left_at = coalesce(a.specialist_last_left_at, a.specialist_left_at, a.specialist_last_seen_at, a.scheduled_at + session_window),
      session_ended_at = coalesce(a.session_ended_at, a.scheduled_at + session_window),
      updated_at = now()
  where a.specialist_id = v_specialist_id
    and a.status in ('confirmed'::public.appointment_status, 'partially_completed'::public.appointment_status, 'no_show'::public.appointment_status)
    and now() >= a.scheduled_at + session_window
    and coalesce(a.specialist_attendance_seconds, 0) >= attendance_threshold_seconds;

  get diagnostics changed = row_count;

  insert into public.specialist_session_earnings (appointment_id, specialist_id, amount_cents, currency, earned_at)
  select a.id,
         a.specialist_id,
         single_tier.price_cents,
         coalesce(nullif(single_tier.currency, ''), a.currency, 'USD'),
         coalesce(a.specialist_last_left_at, a.session_ended_at, a.updated_at)
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
  where a.specialist_id = v_specialist_id
    and a.status = 'completed'::public.appointment_status
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

revoke all on function public.reconcile_specialist_attendance() from public;
grant execute on function public.reconcile_specialist_attendance() to authenticated;
