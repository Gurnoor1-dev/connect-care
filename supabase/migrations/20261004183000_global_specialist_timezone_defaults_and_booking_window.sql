-- Keep specialist availability in a real, deterministic timezone for every specialist.
-- Existing null/blank values are normalized to the app's default timezone (India).
update public.specialist_profiles
set timezone = 'Asia/Calcutta'
where timezone is null or btrim(timezone) = '';

alter table public.specialist_profiles
  alter column timezone set default 'Asia/Calcutta';

-- Server-side booking validation must use the same fallback as the UI.
create or replace function public.validate_appointment_booking_window()
returns trigger
language plpgsql
as $$
declare
  today_local date;
  latest_book_date date;
  specialist_tz text;
  minimum_book_at timestamptz;
  immediate_enabled boolean := false;
  local_start timestamp;
  local_end timestamp;
  availability_found boolean := false;
begin
  select coalesce(nullif(btrim(sp.timezone), ''), 'Asia/Calcutta'), coalesce(sp.immediate_sessions, false)
    into specialist_tz, immediate_enabled
  from public.specialist_profiles sp
  where sp.id = new.specialist_id;

  if specialist_tz is null then specialist_tz := 'Asia/Calcutta'; end if;

  if not exists (
    select 1 from public.specialist_profiles sp
    where sp.id = new.specialist_id and sp.is_published = true
  ) then
    raise exception 'This specialist is not currently available for booking';
  end if;

  today_local := (now() at time zone specialist_tz)::date;
  latest_book_date := today_local + 7;

  if immediate_enabled then
    minimum_book_at := now() + interval '5 minutes';
  else
    minimum_book_at := date_trunc('hour', now())
      + floor(extract(minute from now()) / 15) * interval '15 minutes'
      + interval '5 hours';
  end if;

  if (new.scheduled_at at time zone specialist_tz)::date < today_local
     or (new.scheduled_at at time zone specialist_tz)::date > latest_book_date then
    raise exception 'Appointment must be scheduled for today or within the next 7 days';
  end if;

  if (new.scheduled_at at time zone specialist_tz)::date = today_local
     and new.scheduled_at < minimum_book_at then
    if immediate_enabled then
      raise exception 'Immediate booking must be at least 5 minutes in the future';
    else
      raise exception 'Same-day appointments must be at least 5 hours ahead, rounded to a 15-minute slot';
    end if;
  end if;

  if new.scheduled_at <= now() + interval '5 minutes' then
    raise exception 'Appointment must be in the future';
  end if;

  local_start := new.scheduled_at at time zone specialist_tz;
  local_end := local_start + make_interval(mins => new.duration_minutes);

  select exists (
    select 1
    from public.specialist_availability a
    where a.specialist_id = new.specialist_id
      and a.is_active = true
      and (
        (
          a.start_time < a.end_time
          and a.day_of_week = extract(dow from local_start)::integer
          and local_start::time >= a.start_time
          and local_end::date = local_start::date
          and local_end::time <= a.end_time
        )
        or
        (
          a.start_time >= a.end_time
          and (
            (
              a.day_of_week = extract(dow from local_start)::integer
              and local_start::time >= a.start_time
              and local_end <= (local_start::date + interval '1 day' + a.end_time)
            )
            or
            (
              a.day_of_week = ((extract(dow from local_start)::integer + 6) % 7)
              and local_start::time < a.end_time
              and local_end <= (local_start::date + a.end_time)
            )
          )
        )
      )
  ) into availability_found;

  if not availability_found then
    raise exception 'This specialist can only be booked during their active availability';
  end if;

  return new;
end;
$$;
