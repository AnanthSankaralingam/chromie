-- Add gov profile/run indexes and enforce one row per opportunity per company profile.
-- Safe to re-run: uses IF NOT EXISTS / IF EXISTS guards.

-- Remove duplicate opportunities, keeping the best-scored / most recently updated row.
delete from public.gov_runs
where id in (
  select id
  from (
    select
      id,
      row_number() over (
        partition by gov_profile_id, source, source_ref
        order by fit_score desc nulls last, updated_at desc, created_at desc
      ) as rn
    from public.gov_runs
  ) ranked
  where rn > 1
);

-- Per-run uniqueness allowed the same SAM.gov notice across multiple runs for one profile.
alter table public.gov_runs
  drop constraint if exists gov_runs_run_source_ref_key;

create unique index if not exists gov_runs_profile_source_ref_key
  on public.gov_runs (gov_profile_id, source, source_ref);

-- Dashboard query: filter by profile, sort by fit_score then created_at.
create index if not exists gov_runs_profile_fit_created_idx
  on public.gov_runs (gov_profile_id, fit_score desc nulls last, created_at desc);

create index if not exists gov_runs_run_id_idx
  on public.gov_runs (run_id);

-- Redundant once profile_fit_created_idx exists.
drop index if exists public.gov_runs_gov_profile_id_idx;
drop index if exists public.gov_runs_fit_score_idx;
drop index if exists public.gov_runs_created_at_idx;
drop index if exists public.gov_runs_source_ref_idx;

create index if not exists gov_profiles_updated_at_idx
  on public.gov_profiles (updated_at desc);

comment on index public.gov_runs_profile_source_ref_key is
  'Ensures each opportunity (source + source_ref) appears once per gov profile.';
