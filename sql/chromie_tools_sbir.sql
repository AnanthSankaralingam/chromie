-- Gov dual monitor: pin both SAM and SBIR tool rows to chromie-tools main
-- (older SAM pins lacked morphworks_sbir_tech_marketplace in scenario.py).
-- Run in Supabase SQL editor if Lambda SBIR runs fail to load tools.

insert into public.chromie_tools (name, scenario_id, github_path, github_ref)
values (
  'morphworks_sbir_tech_marketplace',
  'morphworks_sbir_tech_marketplace',
  'tools/deterministic_actions/morphworks_sam_gov.py',
  'main'
)
on conflict do nothing;

update public.chromie_tools
set github_ref = 'main',
    updated_at = now()
where scenario_id = 'morphworks_sam_gov'
  and coalesce(github_ref, '') <> 'main';
