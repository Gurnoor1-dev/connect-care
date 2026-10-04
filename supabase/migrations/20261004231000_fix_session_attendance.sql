-- Session attendance must represent actual time spent in the call, not time since first join.
-- This migration adds cumulative attendance seconds for each participant.
alter table public.appointments
  add column if not exists specialist_attendance_seconds integer not null default 0,
  add column if not exists customer_attendance_seconds integer not null default 0;

update public.appointments
set specialist_attendance_seconds = greatest(0, extract(epoch from (
  least(coalesce(specialist_left_at, session_ended_at, scheduled_at + interval '60 minutes'), scheduled_at + interval '60 minutes')
  - greatest(specialist_joined_at, scheduled_at - interval '2 minutes')
))::integer)
where specialist_attendance_seconds = 0 and specialist_joined_at is not null;

update public.appointments
set customer_attendance_seconds = greatest(0, extract(epoch from (
  least(coalesce(customer_left_at, session_ended_at, scheduled_at + interval '60 minutes'), scheduled_at + interval '60 minutes')
  - greatest(customer_joined_at, scheduled_at - interval '2 minutes')
))::integer)
where customer_attendance_seconds = 0 and customer_joined_at is not null;
