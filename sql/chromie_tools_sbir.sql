-- SBIR Tech Marketplace sparse-fetch row (SAM.gov row should already exist).
-- Run in Supabase SQL editor if Lambda SBIR runs fail to load tools.

insert into public.chromie_tools (name, scenario_id, github_path, github_ref)
values (
  'morphworks_sbir_tech_marketplace',
  'morphworks_sbir_tech_marketplace',
  'tools/deterministic_actions/morphworks_sam_gov.py',
  'main'
)
on conflict do nothing;
