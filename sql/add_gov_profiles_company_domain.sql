-- Add self-serve onboarding domain key for gov contractor profiles.
-- Safe to run alongside cleanup migrations: additive only, no drops/renames.

alter table public.gov_profiles
  add column if not exists company_domain text;

update public.gov_profiles
set company_domain = lower(trim(company_domain))
where company_domain is not null
  and company_domain <> lower(trim(company_domain));

create unique index if not exists gov_profiles_company_domain_key
  on public.gov_profiles (lower(company_domain))
  where company_domain is not null;
