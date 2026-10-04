create or replace function public.finalize_expired_appointments()
returns integer
language plpgsql
as $function$
declare
  changed integer := 0;
  attendance_threshold interval := interval '50 minutes';
  session_window interval := interval '60 minutes';
begin
  update public.appointments a
  set status = case
      when a.specialist_joined_at is not null
        and a.customer_joined_at is not null
        and (a.specialist_left_at is null or a.specialist_left_at >= a.scheduled_at + attendance_threshold)
        and (a.customer_left_at is null or a.customer_left_at >= a.scheduled_at + attendance_threshold)
        then 'completed'::public.appointment_status
      when a.specialist_joined_at is not null
        or a.customer_joined_at is not null
        then 'partially_completed'::public.appointment_status
      else 'no_show'::public.appointment_status
    end,
    session_ended_at = coalesce(a.session_ended_at, a.scheduled_at + session_window),
    updated_at = now()
  where a.status = 'confirmed'::public.appointment_status
    and now() >= a.scheduled_at + session_window;

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
    and a.session_ended_at is not null
    and (a.razorpay_payment_status = 'captured' or a.payment_method = 'credits')
  on conflict (appointment_id) do update
    set amount_cents = excluded.amount_cents,
        currency = excluded.currency,
        earned_at = excluded.earned_at;

  return changed;
end;
$function$;
