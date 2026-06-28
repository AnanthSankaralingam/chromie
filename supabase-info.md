# Database Schema & Permissions for chromie

Project: `bxzxoixtutqpmqjkjvbh`

Chromie is now an automation hub. The active schema centers on user profiles, workflow automations, workflow run history, workflow tool metadata, and government-contracting profiles/results. The retired Chrome extension builder tables are documented in `sql/drop_extension_builder_artifacts.sql`.

## Active Tables

### `profiles`

Auth-linked user profile.

| Column | Purpose |
| --- | --- |
| `id` | Primary key, references `auth.users.id`. |
| `name` / `email` / `provider` | User identity metadata. |
| `stripe_customer_id` | Stripe customer reference for billing. |
| `welcome_email_sent`, `welcome_email_sent_at` | Welcome email state. |
| `email_campaign_stage`, `email_campaign_updated_at` | Email lifecycle state; stage `0` means unsubscribed/suppressed. |
| `gov_profile_id` | Optional link to a shared `gov_profiles.id`; can be set by admin/service role or the self-serve gov onboarding API. |
| `is_admin` | Optional admin flag from `sql/add_profiles_is_admin.sql`. |
| `created_at`, `last_used_at` | Audit timestamps. |

RLS: users can read/update their own row. `gov_profile_id` is usually set by an admin or service role.

### `gov_profiles`

Shared company profile for government-contracting customers.

| Column | Purpose |
| --- | --- |
| `id` | Primary key. |
| `name` | Company name. |
| `company_domain` | Normalized work-email/company domain used to link self-serve teammates to the same company profile. |
| `search_keywords` | SAM.gov batch search terms. |
| `naics_codes` | NAICS filters. |
| `sbir_categories` | Internal SBIR Tech Marketplace category filters inferred during onboarding; not shown in the UI. |
| `corporate_overview` | Company context used for fit analysis. |
| `past_rfps` | Uploaded past RFP PDF metadata plus processed scoring context stored in bucket `gov-profile-rfps`. |
| `created_at`, `updated_at` | Audit timestamps. |

Indexes:
- `gov_profiles_company_domain_key` — unique on `lower(company_domain)` where set; prevents duplicate company profiles during self-serve onboarding.
- `gov_profiles_updated_at_idx` — supports recent-profile listing/sorting.

SQL files:
- `sql/create_gov_profiles.sql`
- `sql/add_gov_profiles_company_domain.sql`
- `sql/alter_gov_profiles_simplify.sql`
- `sql/add_gov_profiles_sbir_categories.sql`

RLS: users linked through `profiles.gov_profile_id` can select/update that company profile. Inserts/deletes are service-role/admin only. Self-serve onboarding uses a service-role API endpoint to create/find by `company_domain` and link the authenticated user's profile. When a signed-in user's work-email domain matches an existing `company_domain`, `/api/gov-onboarding` auto-links them to that shared profile on onboarding load so teammates inherit the same search config and opportunity context without re-entering company details.

**Gov contract monitor auto-provisioning:** When the first user completes self-serve onboarding for a new company (`/api/gov-onboarding` POST, not `link_existing`), Chromie automatically creates SAM.gov + SBIR monitor automations for that user, sets a **single org-level daily EventBridge schedule** on the primary SAM automation (`morphworks_sam_gov`) at the onboarding time (browser timezone), and kicks off the first dual-source search immediately when the org is under the daily run cap. Teammates who join an existing company inherit the org schedule/status via `/api/gov-monitor/status` and do not receive a second schedule or onboarding invoke. A daily run cap of **5 org-wide searches per calendar day** (schedule timezone) is enforced app-side before Chromie-initiated invokes by counting org-wide `workflow_runs` for the linked `gov_profile_id` on the current calendar day.

**Gov outreach share links:** No schema changes. Outreach uses public URLs like `/gov/share?company=acmefederal.com` (`company` is a normalized domain only). The share page shows illustrative blurred opportunities and sends sign-ups to `/gov/onboarding?company=…`. Profiles are **not** pre-created. After auth, if the user's verified work-email domain exactly matches the invite domain, onboarding auto-enriches from `https://{domain}` and pre-fills the review form before the existing `/api/gov-onboarding` POST creates/links the `gov_profiles` row. If the email domain does not match, onboarding shows a notice and falls back to the standard manual flow.

`past_rfps` entries are JSON objects. The stable file fields are `id`, `filename`, `storage_path`, `size_bytes`, and `uploaded_at`. Upload processing adds `processing_status` (`pending`, `processed`, or `failed`), `processed_at`, `processing_error`, `summary`, `capabilities`, `agencies`, `naics_codes`, `contract_keywords`, and `fit_context`. The app builds a compact `past_rfp_context` from processed entries and injects it into government automation params; it is also appended to `corporate_overview` for compatibility with the workflow scorer.

### `gov_runs`

Normalized government opportunity results, typically produced from SAM.gov workflow runs.

| Column Group | Purpose |
| --- | --- |
| Profile/run linkage | `gov_profile_id`, optional `run_id` to `workflow_runs.id`. |
| Source fields | `source`, `source_ref`, `source_url`, `scenario_id`. |
| Opportunity fields | `title`, `agency`, `customer_name`, `published_date`, `response_date`. |
| Analysis fields | `contract_summary`, `fit_score`, `fit_rationale`, `profile_fit_verified`. |
| Timestamps | `created_at`, `updated_at`. |

Indexes:
- `gov_runs_profile_source_ref_key` — unique on `(gov_profile_id, source, source_ref)`; one row per opportunity per company profile.
- `gov_runs_profile_fit_created_idx` — `(gov_profile_id, fit_score desc, created_at desc)` for dashboard listing.
- `gov_runs_run_id_idx`, `gov_runs_automation_id_idx`, `gov_runs_scenario_id_idx`, `gov_runs_response_date_idx` — linkage and filtering.

SQL files:
- `sql/create_gov_runs_table.sql`
- `sql/add_gov_indexes_and_opportunity_dedup.sql`

RLS: users can read rows for the `gov_profiles` record linked from their profile.

### `automations`

User-owned workflow configuration.

| Column Group | Purpose |
| --- | --- |
| Identity | `id`, `user_id`, `name`, `scenario_id`. |
| Configuration | `params`, `enabled`. |
| Scheduling | `schedule_kind`, `schedule_enabled`, `schedule_frequency`, `schedule_times`, `schedule_weekday`, `schedule_timezone`, `cron_expression`, `eventbridge_schedule_name`. |
| Timestamps | `created_at`, `updated_at`, schedule timestamps. |

SQL file in repo: `sql/workflow_automation_schedule.sql` adds/updates schedule fields. The base workflow schema may have been applied outside this repo and should be confirmed before production DB cleanup.

RLS: users can CRUD their own automation rows.

### `workflow_runs`

Execution/audit log for automations.

| Column Group | Purpose |
| --- | --- |
| Linkage | `id`, `automation_id`. |
| Status | `status`, `started_at`, `finished_at`. |
| Runner data | Browserbase session/debug/replay fields and Lambda metadata. |
| Results | `result`, `evaluation`, error details. |

Used by dashboard run history, live/session/replay routes, and `gov_runs.run_id`.

RLS: users can read runs through automations they own.

### `workflow_editable_params`

Parameter metadata for scenario-specific automation forms.

| Column Group | Purpose |
| --- | --- |
| Scenario | `scenario_id`, parameter key/order/grouping. |
| UI config | label, type, choices, defaults, help text, validation flags. |

Used by `/api/workflow-editable-params` and `AutomationParamFields`.

### `workflow_browser_contexts`

Scenario-level Browserbase context metadata used by workflow execution infrastructure.

| Column | Purpose |
| --- | --- |
| `scenario_id` | Primary key for a workflow scenario. |
| `browserbase_context_id` | Browserbase context used for persisted browser state. |
| `updated_at` | Audit timestamp. |

### `chromie_tools`

Workflow tool registry used by the production automation runner to locate scenario code in `chromie-dev/chromie-tools`.

| Column Group | Purpose |
| --- | --- |
| Identity | `id`, `name`, `scenario_id`. |
| GitHub source | `github_repo`, `github_path`, `github_ref`, `bundle_paths`. |
| Timestamps | `created_at`, `updated_at`. |

Gov dual monitor (`gov_dual_source`) needs rows for both `morphworks_sam_gov` and `morphworks_sbir_tech_marketplace`, each pinned to a `github_ref` that includes SBIR scenario support (use `main`). Seed/migrate with `sql/chromie_tools_sbir.sql`.

### Billing And Account Tables

These are retained for account/subscription infrastructure:

| Table | Purpose |
| --- | --- |
| `billing` | Current Stripe customer/subscription status. Plans are now `free` or `pro`. |
| `purchases` | Subscription ledger. Legacy `builder` values should be normalized to `pro` by `sql/drop_extension_builder_artifacts.sql`. |
| `token_usage` | Retained usage/accounting row. Extension proxy columns are stale and should be dropped by the cleanup script. |
| `global_feedback` | Product feedback submitted from the app. |

Note: the `/api/waitlist` route still targets `public.waitlist`, but the current Supabase project does not include that table.

## Active Storage

| Bucket | Purpose |
| --- | --- |
| `gov-profile-rfps` | Past RFP PDFs attached to `gov_profiles.past_rfps`; extracted summaries stay in the profile JSON, not in storage. Private bucket; server API routes use the service role after auth checks. |

## Dropped Builder Artifacts

The Chrome extension builder/codegen surface has been removed from the app code. `sql/drop_extension_builder_artifacts.sql` removes related database artifacts:

- Tables: `projects`, `code_files`, `conversations`, `shared_links`, `shared_icons`, `featured_projects`, `project_assets`, `project_versions`, `project_databases`, `project_database_data`, `metrics_events`, `metrics_aggregates`, `cron_job_log`, `agent_file_operations`, `session_replays`, `project_collaborators`, `extension_templates`, `extension_project_metadata`, `extension_user_settings`, `scraper`, `scraper_misses`, `api_docs_cache`.
- Functions: `create_project_version`, `get_next_version_number`, `add_conversation_message`, `generate_api_key`, `validate_api_key`, `metrics_dashboard`.
- Stale columns: `profiles.project_count`, `profiles.hyperbrowser_profile_id`, GitHub builder export columns, and `token_usage` extension-proxy counters.

Billing tables are intentionally preserved for backwards compatibility.
