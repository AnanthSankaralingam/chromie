-- Government contract run results.
-- One row per contract/opportunity found for a customer gov profile.

create table if not exists public.gov_runs (
  id uuid primary key default gen_random_uuid(),
  gov_profile_id uuid not null references public.gov_profiles(id) on delete cascade,
  run_id uuid not null references public.workflow_runs(id) on delete cascade,
  automation_id uuid references public.automations(id) on delete set null,
  scenario_id text not null,
  customer_name text,
  source text not null,
  source_ref text not null,
  source_url text,
  title text not null,
  agency text,
  contract_summary text,
  published_date date,
  response_date date,
  fit_score numeric(5, 4) check (fit_score is null or (fit_score >= 0 and fit_score <= 1)),
  fit_rationale text,
  profile_fit_verified boolean not null default false,
  source_payload jsonb not null default '{}'::jsonb,
  analysis_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gov_runs_profile_source_ref_key unique (gov_profile_id, source, source_ref)
);

create index if not exists gov_runs_profile_fit_created_idx
  on public.gov_runs (gov_profile_id, fit_score desc nulls last, created_at desc);

create index if not exists gov_runs_run_id_idx
  on public.gov_runs (run_id);

create index if not exists gov_runs_automation_id_idx
  on public.gov_runs (automation_id);

create index if not exists gov_runs_scenario_id_idx
  on public.gov_runs (scenario_id);

create index if not exists gov_runs_response_date_idx
  on public.gov_runs (response_date);

alter table public.gov_runs enable row level security;

drop policy if exists "Users can read their gov profile runs" on public.gov_runs;
create policy "Users can read their gov profile runs"
  on public.gov_runs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.gov_profile_id = gov_runs.gov_profile_id
    )
  );

comment on table public.gov_runs is
  'Normalized government contract opportunities produced by automation runs, linked to customer gov profiles.';

comment on column public.gov_runs.source_ref is
  'Stable source-specific identifier, e.g. SAM.gov notice_id or URL fallback.';

comment on column public.gov_runs.source_payload is
  'Source-specific metadata such as SAM.gov notice type, inactive policy, raw dates, and identifiers.';

comment on column public.gov_runs.analysis_payload is
  'Automation-generated details such as match terms, checklist, criteria, rejection reason, and raw opportunity payload.';
