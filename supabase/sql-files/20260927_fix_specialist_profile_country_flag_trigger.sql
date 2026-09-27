-- Fix specialist profile saves by preventing the country flag trigger from
-- issuing a table-wide UPDATE without a WHERE clause.
create or replace function public.update_country_flags()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  new.country_flag :=
    case
      when lower(trim(new.country)) = 'india' then '🇮🇳'
      when lower(trim(new.country)) = 'united states' then '🇺🇸'
      when lower(trim(new.country)) = 'usa' then '🇺🇸'
      when lower(trim(new.country)) = 'united kingdom' then '🇬🇧'
      when lower(trim(new.country)) = 'uk' then '🇬🇧'
      when lower(trim(new.country)) = 'canada' then '🇨🇦'
      when lower(trim(new.country)) = 'australia' then '🇦🇺'
      else new.country_flag
    end;

  return new;
end;
$function$;
