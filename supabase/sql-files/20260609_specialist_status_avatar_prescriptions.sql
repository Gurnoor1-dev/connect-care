alter table public.specialist_profiles
  add column if not exists avatar_url text;

alter table public.specialist_profiles
  add column if not exists availability_status text not null default 'offline';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'specialist_profiles_availability_status_check'
      and conrelid = 'public.specialist_profiles'::regclass
  ) then
    alter table public.specialist_profiles
      add constraint specialist_profiles_availability_status_check
      check (availability_status in ('online', 'offline'));
  end if;
end $$;

alter table public.appointments
  add column if not exists prescription text;

alter table public.appointments
  add column if not exists prescription_updated_at timestamptz;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'specialist-avatars',
  'specialist-avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view specialist avatars" on storage.objects;
create policy "Public can view specialist avatars"
on storage.objects
for select
to public
using (bucket_id = 'specialist-avatars');

drop policy if exists "Specialists can upload own avatar" on storage.objects;
create policy "Specialists can upload own avatar"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'specialist-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Specialists can update own avatar" on storage.objects;
create policy "Specialists can update own avatar"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'specialist-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'specialist-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Specialists can delete own avatar" on storage.objects;
create policy "Specialists can delete own avatar"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'specialist-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Specialists can manage own tiers" on public.specialist_tiers;

drop policy if exists "Admins can manage specialist tiers" on public.specialist_tiers;
create policy "Admins can manage specialist tiers"
on public.specialist_tiers
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

grant select on public.specialist_profiles to anon, authenticated;
grant select on public.specialist_tiers to anon, authenticated;
grant select, insert, update, delete on public.specialist_tiers to authenticated;
