-- Cleanup script for the retired Chrome extension builder surface.
-- Review and run manually in Supabase SQL editor. This is intentionally not applied by the app.
--
-- Preserves:
--   profiles, gov_profiles, gov_runs, automations, workflow_runs,
--   workflow_editable_params, billing, purchases, token_usage, global_feedback, waitlist.

begin;

-- Remove obsolete builder-only helper functions.
drop function if exists public.create_project_version(uuid, text, text);
drop function if exists public.get_next_version_number(uuid);
drop function if exists public.add_conversation_message(uuid, jsonb);
drop function if exists public.generate_api_key();
drop function if exists public.validate_api_key(text);
drop function if exists public.metrics_dashboard(uuid, timestamptz, timestamptz, text);

-- Remove tables that only supported extension projects, generation, sharing, testing, and metrics.
drop table if exists public.project_collaborators cascade;
drop table if exists public.agent_file_operations cascade;
drop table if exists public.session_replays cascade;
drop table if exists public.metrics_aggregates cascade;
drop table if exists public.metrics_events cascade;
drop table if exists public.project_versions cascade;
drop table if exists public.project_assets cascade;
drop table if exists public.shared_links cascade;
drop table if exists public.shared_icons cascade;
drop table if exists public.featured_projects cascade;
drop table if exists public.conversations cascade;
drop table if exists public.code_files cascade;
drop table if exists public.extension_project_metadata cascade;
drop table if exists public.extension_templates cascade;
drop table if exists public.scraper_misses cascade;
drop table if exists public.scraper cascade;
drop table if exists public.api_docs_cache cascade;
drop table if exists public.projects cascade;

-- Remove stale profile fields that only served the extension builder account page.
alter table if exists public.profiles
  drop column if exists project_count,
  drop column if exists github_access_token,
  drop column if exists github_username;

-- Remove extension-proxy counters from retained token usage rows.
alter table if exists public.token_usage
  drop column if exists extension_proxy_tokens,
  drop column if exists extension_proxy_monthly_reset;

-- Normalize legacy builder plan labels into the retained pro tier for billing history.
update public.billing
set plan = 'pro'
where plan = 'builder';

update public.purchases
set plan = 'pro'
where plan = 'builder';

commit;
