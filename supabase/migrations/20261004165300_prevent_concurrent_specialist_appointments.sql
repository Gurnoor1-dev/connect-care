create or replace function public.prevent_overlapping_appointments()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  if new.status not in ('cancelled','no_show') then
    -- Serialize appointment inserts/updates per specialist so two clients cannot
    -- pass the overlap check at the same time.
    perform pg_advisory_xact_lock(hashtextextended(new.specialist_id::text, 0));

    if exists (
      select 1 from public.appointments a
      where a.specialist_id = new.specialist_id
        and a.id <> new.id
        and a.status not in ('cancelled','no_show')
        and tstzrange(a.scheduled_at, a.scheduled_at + make_interval(mins => a.duration_minutes), '[)')
            && tstzrange(new.scheduled_at, new.scheduled_at + make_interval(mins => new.duration_minutes), '[)')
    ) then
      raise exception 'This specialist already has an appointment during that time';
    end if;
  end if;

  return new;
end
$function$;
