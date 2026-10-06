create or replace function public.get_specialist_pending_sessions()
returns table (
  customer_id uuid,
  customer_name text,
  credit_points integer,
  sessions_remaining integer
)
language sql
security definer
set search_path = public
as $$
  with current_specialist as (
    select auth.uid() as specialist_id
    where exists (
      select 1
      from public.specialist_profiles sp
      where sp.id = auth.uid()
    )
  )
  select
    c.customer_id,
    coalesce(
      nullif(max(p.full_name) filter (where p.full_name is not null and p.full_name <> ''), ''),
      nullif(max(a.customer_name) filter (where a.customer_name is not null and a.customer_name <> ''), ''),
      'Patient'
    ) as customer_name,
    c.credit_points,
    floor(c.credit_points::numeric / 2)::integer as sessions_remaining
  from public.customer_specialist_credits c
  join current_specialist cs on cs.specialist_id = c.specialist_id
  left join public.profiles p on p.id = c.customer_id
  left join public.appointments a
    on a.customer_id = c.customer_id
   and a.specialist_id = c.specialist_id
  where c.credit_points >= 2
  group by c.customer_id, c.credit_points
  order by sessions_remaining desc, customer_name asc;
$$;

grant execute on function public.get_specialist_pending_sessions() to authenticated;
