alter table public.appointments
  add column if not exists reminder_30_consultant_email_sent_at timestamptz,
  add column if not exists reminder_30_client_email_sent_at timestamptz,
  add column if not exists reminder_10_consultant_email_sent_at timestamptz,
  add column if not exists reminder_10_client_email_sent_at timestamptz,
  add column if not exists reminder_1_consultant_email_sent_at timestamptz,
  add column if not exists reminder_1_client_email_sent_at timestamptz;

create index if not exists appointments_reminder_30_due_idx
  on public.appointments (scheduled_at)
  where status = 'confirmed' and reminder_30_email_sent_at is null;

create index if not exists appointments_reminder_10_due_idx
  on public.appointments (scheduled_at)
  where status = 'confirmed' and reminder_10_email_sent_at is null;

create index if not exists appointments_reminder_1_due_idx
  on public.appointments (scheduled_at)
  where status = 'confirmed' and reminder_1_email_sent_at is null;


create or replace function public.expire_unattended_appointments()
returns integer
language plpgsql
security definer
set search_path = public
as $function$
declare
  affected integer;
begin
  update public.appointments
  set status = 'no_show',
      updated_at = now()
  where status = 'confirmed'
    and scheduled_at + interval '10 minutes' <= now()
    and (
      customer_joined_at is null
      or customer_joined_at > scheduled_at + interval '10 minutes'
      or specialist_joined_at is null
      or specialist_joined_at > scheduled_at + interval '10 minutes'
    );

  get diagnostics affected = row_count;
  return affected;
end
$function$;
