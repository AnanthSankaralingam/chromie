-- Gov contractor company profiles (ICP + SAM.gov search config + past RFPs).
-- Safe first-run migration (no DROP statements).
-- Link users via: UPDATE profiles SET gov_profile_id = '<uuid>' WHERE id = '<user_id>';

create table if not exists public.gov_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company_domain text,
  search_keywords text[] not null default '{}',
  naics_codes text[] not null default '{}',
  corporate_overview text,
  -- [{ id, filename, storage_path, size_bytes, uploaded_at }]
  past_rfps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists gov_profile_id uuid references public.gov_profiles(id) on delete set null;

create index if not exists idx_profiles_gov_profile_id on public.profiles(gov_profile_id);

create unique index if not exists gov_profiles_company_domain_key
  on public.gov_profiles (lower(company_domain))
  where company_domain is not null;

create or replace function public.set_gov_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'gov_profiles_updated_at'
      and tgrelid = 'public.gov_profiles'::regclass
  ) then
    create trigger gov_profiles_updated_at
      before update on public.gov_profiles
      for each row execute function public.set_gov_profiles_updated_at();
  end if;
end $$;

alter table public.gov_profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'gov_profiles'
      and policyname = 'gov_profiles_select_linked'
  ) then
    create policy gov_profiles_select_linked
      on public.gov_profiles for select
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.gov_profile_id = gov_profiles.id
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'gov_profiles'
      and policyname = 'gov_profiles_update_linked'
  ) then
    create policy gov_profiles_update_linked
      on public.gov_profiles for update
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.gov_profile_id = gov_profiles.id
        )
      )
      with check (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.gov_profile_id = gov_profiles.id
        )
      );
  end if;
end $$;

-- Seed MorphWorks (idempotent by name).
insert into public.gov_profiles (
  name,
  search_keywords,
  naics_codes,
  corporate_overview
)
select
  'MorphWorks',
  array[
    'IT modernization',
    'data integration',
    'data visualization',
    'asset management'
  ],
  array['541511', '541512', '541519'],
  'MorphWorks is a government contracting firm focused on IT modernization, data integration, visualization, and asset management for federal agencies.'
where not exists (
  select 1 from public.gov_profiles where name = 'MorphWorks'
);
