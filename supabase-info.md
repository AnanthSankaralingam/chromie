# Database Schema & Permissions for chromie

Project: `bxzxoixtutqpmqjkjvbh`

Chromie is now an automation hub. The active schema centers on user profiles, workflow automations, workflow run history, and government-contracting profiles/results. The retired Chrome extension builder tables are documented in `sql/drop_extension_builder_artifacts.sql` as deletion candidates.

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
| `corporate_overview` | Company context used for fit analysis. |
| `past_rfps` | Uploaded RFP PDF metadata stored in bucket `gov-profile-rfps`. |
| `created_at`, `updated_at` | Audit timestamps. |

SQL files:
- `sql/create_gov_profiles.sql`
- `sql/add_gov_profiles_company_domain.sql`
- `sql/alter_gov_profiles_simplify.sql`
- `sql/gov_profile_rfp_storage.sql`

RLS: users linked through `profiles.gov_profile_id` can select/update that company profile. Inserts/deletes are service-role/admin only. Self-serve onboarding uses a service-role API endpoint to create/find by `company_domain` and link the authenticated user's profile.

### `gov_runs`

Normalized government opportunity results, typically produced from SAM.gov workflow runs.

| Column Group | Purpose |
| --- | --- |
| Profile/run linkage | `gov_profile_id`, optional `run_id` to `workflow_runs.id`. |
| Source fields | `source`, `source_ref`, `source_url`, `scenario_id`. |
| Opportunity fields | `title`, `agency`, `customer_name`, `published_date`, `response_date`. |
| Analysis fields | `contract_summary`, `fit_score`, `fit_rationale`, `profile_fit_verified`. |
| Timestamps | `created_at`, `updated_at`. |

SQL file: `sql/create_gov_runs_table.sql`

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

### Billing And Account Tables

These are retained for account/subscription infrastructure:

| Table | Purpose |
| --- | --- |
| `billing` | Current Stripe customer/subscription status. Plans are now `free` or `pro`. |
| `purchases` | Subscription ledger. Legacy `builder` values should be normalized to `pro` by `sql/drop_extension_builder_artifacts.sql`. |
| `token_usage` | Retained usage/accounting row. Extension proxy columns are stale and should be dropped by the cleanup script. |
| `global_feedback` | Product feedback submitted from the app. |
| `waitlist` | Waitlist signups. |

## Active Storage

| Bucket | Purpose |
| --- | --- |
| `gov-profile-rfps` | Past RFP PDFs attached to `gov_profiles.past_rfps`. |

## Retired Builder Artifacts

The Chrome extension builder/codegen surface has been removed from the app code. Review `sql/drop_extension_builder_artifacts.sql` before running it to remove related database artifacts:

- Tables: `projects`, `code_files`, `conversations`, `shared_links`, `shared_icons`, `featured_projects`, `project_assets`, `project_versions`, `metrics_events`, `metrics_aggregates`, `agent_file_operations`, `session_replays`, `project_collaborators`, `extension_templates`, `extension_project_metadata`, `scraper`, `scraper_misses`, `api_docs_cache`.
- Functions: `create_project_version`, `get_next_version_number`, `add_conversation_message`, `generate_api_key`, `validate_api_key`, `metrics_dashboard`.
- Stale columns: `profiles.project_count`, GitHub builder export columns, and `token_usage` extension-proxy counters.

Do not apply the cleanup script to production without first confirming that no external service still writes to the retired tables.
