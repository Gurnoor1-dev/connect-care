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
  return changed;
end;
$$;
