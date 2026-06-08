insert into public.user_roles (user_id, role)
select id, 'admin'
from auth.users
where email = 'admin@breatherise.com'
on conflict (user_id, role) do nothing;
