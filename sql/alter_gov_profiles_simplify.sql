-- Run if you already applied an earlier version of create_gov_profiles.sql
-- that included sam_gov_base_url, icp_keywords, email_subject, min/max search fields.

alter table public.gov_profiles drop column if exists sam_gov_base_url;
alter table public.gov_profiles drop column if exists icp_keywords;
alter table public.gov_profiles drop column if exists email_subject;
alter table public.gov_profiles drop column if exists min_opportunities;
alter table public.gov_profiles drop column if exists max_keyword_searches;
alter table public.gov_profiles drop column if exists max_pages_per_keyword;
