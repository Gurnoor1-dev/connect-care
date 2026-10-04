create or replace function public.prevent_overlapping_appointments()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  if new.status not in ('cancelled','no_show') then
    perform pg_advisory_xact_lock(hashtextextended(new.specialist_id::text, 0));

    if exists (
      select 1
      from public.appointments a
      where a.specialist_id = new.specialist_id
        and a.id <> new.id
        and a.status not in ('cancelled','no_show')
        and tstzrange(a.scheduled_at, a.scheduled_at + make_interval(mins => greatest(coalesce(a.duration_minutes, 0), 60)), '[)')
            && tstzrange(new.scheduled_at, new.scheduled_at + make_interval(mins => greatest(coalesce(new.duration_minutes, 0), 60)), '[)')
    ) then
      raise exception 'This specialist is already booked for this time. Please choose another time.';
    end if;
  end if;

  return new;
end
$function$;

create or replace function public.get_specialist_booked_slots(
  p_specialist_id uuid,
  p_from timestamptz default now()
)
returns table (
  scheduled_at timestamptz,
  duration_minutes integer,
  status text
)
language sql
security definer
set search_path = public
as $function$
  select
    a.scheduled_at,
    greatest(coalesce(a.duration_minutes, 0), 60)::integer as duration_minutes,
    a.status
  from public.appointments a
  where a.specialist_id = p_specialist_id
    and a.status in ('pending_payment', 'confirmed')
    and a.scheduled_at >= p_from
  order by a.scheduled_at;
$function$;

revoke all on function public.get_specialist_booked_slots(uuid, timestamptz) from public;
grant execute on function public.get_specialist_booked_slots(uuid, timestamptz) to authenticated;
