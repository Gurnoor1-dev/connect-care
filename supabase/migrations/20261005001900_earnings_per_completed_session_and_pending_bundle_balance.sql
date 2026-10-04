create or replace function public.finalize_expired_appointments()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  changed integer := 0;
  attendance_threshold_seconds integer := 50 * 60;
  session_window interval := interval '60 minutes';
begin
  update public.appointments a
  set specialist_attendance_seconds = least(60 * 60, coalesce(a.specialist_attendance_seconds, 0) + case
        when a.specialist_joined_at is not null and a.specialist_left_at is null
          then greatest(0, extract(epoch from ((a.scheduled_at + session_window) - a.specialist_joined_at))::integer)
        else 0 end),
      customer_attendance_seconds = least(60 * 60, coalesce(a.customer_attendance_seconds, 0) + case
        when a.customer_joined_at is not null and a.customer_left_at is null
          then greatest(0, extract(epoch from ((a.scheduled_at + session_window) - a.customer_joined_at))::integer)
        else 0 end)
  where a.status = 'confirmed'::public.appointment_status
    and now() >= a.scheduled_at + session_window;

  update public.appointments a
  set status = case
      when coalesce(a.specialist_attendance_seconds, 0) >= attendance_threshold_seconds
       and coalesce(a.customer_attendance_seconds, 0) >= attendance_threshold_seconds then 'completed'::public.appointment_status
      when coalesce(a.specialist_attendance_seconds, 0) > 0
        or coalesce(a.customer_attendance_seconds, 0) > 0 then 'partially_completed'::public.appointment_status
      else 'no_show'::public.appointment_status
    end,
    session_ended_at = coalesce(a.session_ended_at, a.scheduled_at + session_window),
    updated_at = now()
  where a.status = 'confirmed'::public.appointment_status
    and now() >= a.scheduled_at + session_window;

  get diagnostics changed = row_count;

  -- Earnings represent one actually completed session, never a bundle purchase.
  -- Always use the consultant's active single-session price, even when the client
  -- originally purchased a discounted multi-session bundle.
  insert into public.specialist_session_earnings (appointment_id, specialist_id, amount_cents, currency, earned_at)
  select a.id,
    a.specialist_id,
    single_tier.price_cents,
    coalesce(nullif(single_tier.currency, ''), a.currency, 'USD'),
    coalesce(a.specialist_left_at, a.session_ended_at, now())
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
  left join public.specialist_session_earnings existing on existing.appointment_id = a.id
  where a.status = 'completed'::public.appointment_status
    and a.session_ended_at is not null
    and a.tier_id is not null
    and exists (select 1 from public.specialist_tiers booked_tier where booked_tier.id = a.tier_id and booked_tier.tier_type = 'single')
    and (a.razorpay_payment_status = 'captured' or a.payment_method = 'credits')
    and existing.id is null;

  return changed;
end;
$$;

create or replace function public.get_specialist_pending_sessions()
returns table (
  customer_id uuid,
  customer_name text,
  credit_points integer,
  sessions_remaining integer
)
language sql
security definer
set search_path = public
as $$
  with current_specialist as (
    select auth.uid() as specialist_id
    where exists (select 1 from public.specialist_profiles sp where sp.id = auth.uid())
  ),
  session_cost as (
    select cs.specialist_id,
           coalesce(min(t.credit_points) filter (where t.credit_points > 0), 2)::integer as credits_per_session
    from current_specialist cs
    left join public.specialist_tiers t
      on t.specialist_id = cs.specialist_id
     and t.is_active = true
     and t.tier_type = 'single'
    group by cs.specialist_id
  )
  select c.customer_id,
         coalesce(
           nullif(max(p.full_name) filter (where p.full_name is not null and p.full_name <> ''), ''),
           nullif(max(a.customer_name) filter (where a.customer_name is not null and a.customer_name <> ''), ''),
           'Patient'
         ) as customer_name,
         c.credit_points,
         floor(c.credit_points::numeric / sc.credits_per_session)::integer as sessions_remaining
  from public.customer_specialist_credits c
  join session_cost sc on sc.specialist_id = c.specialist_id
  left join public.profiles p on p.id = c.customer_id
  left join public.appointments a
    on a.customer_id = c.customer_id
   and a.specialist_id = c.specialist_id
  where c.specialist_id = sc.specialist_id
    and c.credit_points >= sc.credits_per_session
  group by c.customer_id, c.credit_points, sc.credits_per_session
  order by sessions_remaining desc, customer_name asc;
$$;

grant execute on function public.get_specialist_pending_sessions() to authenticated;
