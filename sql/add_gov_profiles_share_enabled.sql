alter table public.gov_profiles
  add column if not exists share_enabled boolean not null default false;
