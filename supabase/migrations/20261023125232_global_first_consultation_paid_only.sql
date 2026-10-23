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
  has_paid_consultation boolean;
begin
  select price_cents, currency, coalesce(tier_type, 'single')
    into tier_price, tier_currency, tier_kind
  from public.specialist_tiers
  where id = new.tier_id
    and specialist_id = new.specialist_id;

  if tier_price is null then
    raise exception 'The selected session plan is unavailable.';
  end if;

  -- Credit bookings are paid with credits, not the first-consultation cash offer.
  if new.payment_method = 'credits' and new.amount_cents = 0 then
    new.currency := tier_currency;
    return new;
  end if;

  -- Always start from the regular tier price; only eligible first paid sessions are discounted.
  new.amount_cents := tier_price;
  new.currency := tier_currency;

  if tier_currency <> 'USD' or tier_kind = 'bundle' then
    return new;
  end if;

  -- Serialize eligibility checks across every specialist for this customer.
  perform pg_advisory_xact_lock(hashtextextended(new.customer_id::text, 0));

  -- Pending, abandoned, or failed payments do not consume the offer.
  -- A captured Razorpay or legacy PayU payment does, regardless of specialist.
  select exists (
    select 1
    from public.appointments a
    where a.customer_id = new.customer_id
      and (
        a.payment_captured_at is not null
        or a.razorpay_payment_status = 'captured'
        or a.payu_mihpayid is not null
      )
  ) into has_paid_consultation;

  if not has_paid_consultation then
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
