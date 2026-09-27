-- Razorpay payment migration
-- Keeps legacy PayU columns/labels for historical reconciliation, but all new
-- payment flows use Razorpay.
alter table public.appointments
  add column if not exists razorpay_order_id text,
  add column if not exists razorpay_payment_id text,
  add column if not exists razorpay_payment_status text,
  add column if not exists razorpay_base_amount integer,
  add column if not exists razorpay_base_currency text,
  add column if not exists razorpay_fee integer,
  add column if not exists razorpay_tax integer;

create unique index if not exists appointments_razorpay_order_id_idx
  on public.appointments(razorpay_order_id)
  where razorpay_order_id is not null;

create unique index if not exists appointments_razorpay_payment_id_idx
  on public.appointments(razorpay_payment_id)
  where razorpay_payment_id is not null;

alter table public.appointments
  alter column payment_method set default 'razorpay';

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'appointments_payment_method_check'
      and conrelid = 'public.appointments'::regclass
  ) then
    alter table public.appointments drop constraint appointments_payment_method_check;
  end if;

  alter table public.appointments
    add constraint appointments_payment_method_check
    check (payment_method in ('razorpay', 'credits', 'payu'));
end $$;
