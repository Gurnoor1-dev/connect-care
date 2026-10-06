alter table public.appointments
  add column if not exists reminder_30_email_sent_at timestamptz,
  add column if not exists reminder_10_email_sent_at timestamptz,
  add column if not exists reminder_1_email_sent_at timestamptz;

update public.appointments
set reminder_30_email_sent_at = reminder_email_sent_at
where reminder_email_sent_at is not null
  and reminder_30_email_sent_at is null;
