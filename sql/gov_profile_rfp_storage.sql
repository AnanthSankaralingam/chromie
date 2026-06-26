-- Supabase Storage bucket for gov profile past RFP PDFs.
-- Run after create_gov_profiles.sql.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gov-profile-rfps',
  'gov-profile-rfps',
  false,
  15728640,
  array['application/pdf']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Linked users can manage PDFs under their gov_profile_id folder.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'gov_profile_rfps_select'
  ) then
    create policy gov_profile_rfps_select
      on storage.objects for select
      using (
        bucket_id = 'gov-profile-rfps'
        and exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and p.gov_profile_id::text = (storage.foldername(name))[1]
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'gov_profile_rfps_insert'
  ) then
    create policy gov_profile_rfps_insert
      on storage.objects for insert
      with check (
        bucket_id = 'gov-profile-rfps'
        and exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and p.gov_profile_id::text = (storage.foldername(name))[1]
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'gov_profile_rfps_delete'
  ) then
    create policy gov_profile_rfps_delete
      on storage.objects for delete
      using (
        bucket_id = 'gov-profile-rfps'
        and exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and p.gov_profile_id::text = (storage.foldername(name))[1]
        )
      );
  end if;
end $$;
