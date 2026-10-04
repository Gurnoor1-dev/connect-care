CREATE OR REPLACE FUNCTION public.prevent_overlapping_appointments()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
begin
  if new.status not in ('cancelled','no_show') then
    perform pg_advisory_xact_lock(hashtextextended(new.specialist_id::text, 0));

    if exists (
      select 1 from public.appointments a
      where a.specialist_id = new.specialist_id
        and a.id <> new.id
        and a.status not in ('cancelled','no_show')
        and tstzrange(a.scheduled_at, a.scheduled_at + interval '1 hour', '[)')
            && tstzrange(new.scheduled_at, new.scheduled_at + make_interval(mins => new.duration_minutes), '[)')
    ) then
      raise exception 'This specialist already has a reserved time during that hour';
    end if;
  end if;

  return new;
end
$function$;
