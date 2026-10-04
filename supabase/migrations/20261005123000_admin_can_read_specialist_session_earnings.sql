-- Allow the admin dashboard to read attendance-qualified specialist earnings.
-- The policy is idempotent so the migration remains safe after the live policy
-- has already been applied directly to the Breatherise project.

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'specialist_session_earnings'
      and policyname = 'Admins can read all specialist session earnings'
  ) then
    create policy "Admins can read all specialist session earnings"
      on public.specialist_session_earnings
      for select
      to authenticated
      using (has_role(auth.uid(), 'admin'::app_role));
  end if;
end
$$;
