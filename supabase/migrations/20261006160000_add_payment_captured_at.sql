alter table public.appointments
  add column if not exists payment_captured_at timestamptz;

update public.appointments
set payment_captured_at = coalesce(payment_captured_at, created_at)
where razorpay_payment_status = 'captured'
  and payment_captured_at is null;
