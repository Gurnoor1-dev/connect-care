alter table public.specialist_offline_periods
  add column if not exists day_of_week integer
  check (day_of_week is null or day_of_week between 0 and 6);

comment on column public.specialist_offline_periods.day_of_week is
  '0=Sunday through 6=Saturday. NULL preserves legacy periods that repeat every day.';

create index if not exists idx_specialist_offline_periods_specialist_day
  on public.specialist_offline_periods (specialist_id, day_of_week);
