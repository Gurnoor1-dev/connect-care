create or replace function public.apply_first_consultation_discount()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  tier_price integer;
  tier_currency text;
  tier_kind text;
  has_previous boolean;
begin
  select price_cents, currency, coalesce(tier_type, 'single')
    into tier_price, tier_currency, tier_kind
  from public.specialist_tiers
  where id = new.tier_id
    and specialist_id = new.specialist_id;

  if tier_price is null then
    raise exception 'The selected session plan is unavailable.';
  end if;

  if new.payment_method = 'credits' and new.amount_cents = 0 then
    new.currency := tier_currency;
    return new;
  end if;

  new.amount_cents := tier_price;
  new.currency := tier_currency;

  if tier_currency <> 'USD' or tier_kind = 'bundle' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.customer_id::text || ':' || new.specialist_id::text, 0));

  select exists (
    select 1
    from public.appointments a
    where a.customer_id = new.customer_id
      and a.specialist_id = new.specialist_id
      and a.status <> 'cancelled'
  ) into has_previous;

  if not has_previous then
    case tier_price
      when 9900 then new.amount_cents := 6900;
      when 12900 then new.amount_cents := 9100;
      when 18900 then new.amount_cents := 13300;
      else new.amount_cents := tier_price;
    end case;
  end if;

  return new;
end;
$$;

revoke all on function public.apply_first_consultation_discount() from public, anon, authenticated;

drop trigger if exists appointments_first_consultation_discount on public.appointments;
create trigger appointments_first_consultation_discount
before insert on public.appointments
for each row execute function public.apply_first_consultation_discount();
