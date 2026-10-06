-- Public specialist cards and booking pages must be able to read active availability
-- so the client timezone conversion can run for unauthenticated visitors as well.
drop policy if exists "Authenticated users can view availability" on public.specialist_availability;
drop policy if exists "Public can view active availability" on public.specialist_availability;

create policy "Public can view active availability"
on public.specialist_availability
for select
to public
using (is_active = true);
