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
| `gov_profile_id` | Optional link to a shared `gov_profiles.id`; can be set by admin/service role or the self-serve gov onboarding API. |
| `is_admin` | Optional admin flag from `sql/add_profiles_is_admin.sql`. |
| `browserbase_context_id` | Account-level (identity) Browserbase persisted Context (cookie jar) shared by all of the owner's **personal** automations — `/new` custom recorded automations AND eviivo (`eviivo_data_pull`); frozen on first use. Corporate users inherit the earliest teammate's context for their work-email domain; consumer/free-email users get their own. One login here covers every personal automation for the identity. **Gov monitors are excluded** (org/`gov_profile`-scoped, dedicated per-scenario contexts). Applied via Supabase migration `add_profiles_browserbase_context_id`. |
| `browser_minutes` / `input_tokens` / `output_tokens` | Cumulative automation usage counters. The runner increments these after a `workflow_runs` row transitions out of `running`, using measured Browserbase session-minutes plus LLM prompt and completion usage from the run report. Applied directly to the Supabase project. |
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
| `share_enabled` | Explicit opt-in flag for public no-login gov share pages; defaults to `false` for existing and newly-created profiles. |
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

**Gov contract monitor auto-provisioning:** When the first user completes self-serve onboarding for a new company (`/api/gov-onboarding` POST, not `link_existing`), Chromie automatically creates company-owned SAM.gov + SBIR monitor automations linked to `automations.gov_profile_id`, sets a **single org-level daily EventBridge schedule** on the primary SAM automation (`gov_contract_sam_gov`) at the onboarding time (browser timezone), and kicks off the first dual-source search immediately when the org is under the daily run cap. Teammates who join an existing company inherit the org schedule/status via `/api/gov-monitor/status` and do not receive a second schedule or onboarding invoke. A daily run cap of **5 org-wide searches per calendar day** (schedule timezone) is enforced app-side before Chromie-initiated invokes by counting org-wide `workflow_runs` for automations linked to the `gov_profile_id` on the current calendar day.

**Gov outreach share links:** General outreach can still use public URLs like `/gov/share?company=acmefederal.com` (`company` is a normalized domain only). That share page shows illustrative blurred opportunities and sends sign-ups to `/gov/onboarding?company=…`. Profiles are **not** pre-created for that flow. Manually-approved profiles can also be shared with no-login URLs like `/gov/share/{gov_profile_id}` when `gov_profiles.share_enabled = true`. The public share API uses the service role after checking `share_enabled`, returns dashboard-like opportunity detail for that enabled profile, and does not change RLS or expose anonymous Supabase table reads. After auth, if the user's verified work-email domain exactly matches an invite domain, onboarding auto-enriches from `https://{domain}` and pre-fills the review form before the existing `/api/gov-onboarding` POST creates/links the `gov_profiles` row. If the email domain does not match, onboarding shows a notice and falls back to the standard manual flow.

`past_rfps` entries are JSON objects. The stable file fields are `id`, `filename`, `storage_path`, `size_bytes`, and `uploaded_at`. Upload processing adds `processing_status` (`pending`, `processed`, or `failed`), `processed_at`, `processing_error`, `summary`, `capabilities`, `agencies`, `naics_codes`, `contract_keywords`, and `fit_context`. The app builds a compact `past_rfp_context` from processed entries and injects it into government automation params; it is also appended to `corporate_overview` for compatibility with the workflow scorer.

### `gov_runs`

Normalized government opportunity results, typically produced from SAM.gov workflow runs.

| Column Group | Purpose |
| --- | --- |
| Profile/run linkage | `gov_profile_id`, optional `run_id` to `workflow_runs.id`. |
| Source fields | `source`, `source_ref`, `source_url`, `scenario_id`. |
| Opportunity fields | `title`, `agency`, `customer_name`, `published_date`, `response_date`. |
| Analysis fields | `contract_summary`, `fit_score`, `fit_rationale`, `profile_fit_verified`, `analysis_payload`. |

`analysis_payload` is JSON from the gov scoring workflow. Common keys include `criteria_status`, `icp_match_terms`, `matched_keyword`, and `compliance_checklist` (string array of submission/compliance steps shown in the opportunities UI as the compliance matrix).
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
| Identity | `id`, nullable `user_id` creator/owner for personal workflows, nullable `gov_profile_id` owner for company gov monitors, nullable `company_id` (normalized work-email domain) owner for company-shared recorded automations, `name`, `scenario_id`. |
| Configuration | `params` (jsonb; also holds `/new` recorder capture — see below), `enabled`. |
| Scheduling | `schedule_kind`, `schedule_timezone`, `cron_expression`, `eventbridge_schedule_name`. |
| Timestamps | `created_at`, `updated_at`, schedule timestamps. |

SQL files in repo:
- `sql/workflow_automation_schedule.sql` adds/updates schedule fields. The base workflow schema may have been applied outside this repo and should be confirmed before production DB cleanup.
- `sql/company_owned_gov_automations.sql` adds `automations.gov_profile_id`, backfills valid gov monitor rows from `params.gov_profile_id` / `profiles.gov_profile_id`, changes `automations.user_id` to nullable `ON DELETE SET NULL`, and adds a cleanup trigger for non-gov personal automations before profile deletion.
- `sql/scope_personal_automation_delete_trigger.sql` tightens that cleanup trigger so legacy unmapped gov monitor rows are not deleted without EventBridge cleanup.
- `company_id` (normalized corporate email domain) column plus additive company-scoped SELECT/UPDATE RLS policies were applied directly to the project (via Supabase migration `new_automation_company_access`). `company_id` is not backfilled, so existing personal automations stay private. (The `/new` recorder capture is stored in `params`, not in dedicated columns.)

RLS: users can CRUD their own personal automation rows through `user_id`. Additive company policies grant SELECT/UPDATE to any authenticated user whose JWT email domain equals `company_id`, so recorded automations saved from `/new` are shared with teammates on the same **corporate** work-email domain (DELETE stays owner-only). The app only ever sets `company_id` for genuine corporate domains via `companyDomainFromEmail` (src/lib/gov-domain.js); consumer/free providers (gmail.com, outlook.com, etc.) resolve to `null`, so personal-email automations stay private to their creator and are never shared across a shared public domain. Gov monitor APIs use the service role to access company-owned rows by `gov_profile_id`; general automations UI/API does not directly expose org-owned gov rows. Deleting an auth/profile user no longer cascades to valid company-owned gov monitor automations or their `workflow_runs`; deleting a `gov_profiles` row cascades to its company-owned automations.

**Recorded `/new` automations:** The self-serve recorder (`/new`) saves via `POST /api/new-automation-sessions/{sessionId}/save` with `scenario_id = 'custom_recorded_automation'`, `enabled = false`, `user_id = creator`, and `company_id = creator's corporate email domain` (null for consumer/free email providers, keeping those private to the creator). The captured recording is stored inside `params`: `source` (`'new_automation_page'`), `description`, `browserbase_session_id` (the ephemeral recording session — distinct from the reusable `automations.browserbase_context_id`), `pages_visited`, `action_transcript`, `recording_meta`, and `logs`.

**Account-level (identity) persisted login:** Personal automations share ONE **identity context frozen on `profiles.browserbase_context_id`** (not derived per-automation): a corporate user (work-email domain via `companyDomainFromEmail`) inherits the earliest teammate's context for that domain, while a consumer/free-email user gets their own. It is provisioned lazily by `ensureProfileBrowserbaseContextId` (`src/lib/new-automation/recording-context.js`), which runs with the **service role** (corporate teammates live in other users' `profiles` rows that per-user RLS would hide). Both the `/new` recorder (`POST /api/new-automation-sessions`) and eviivo (`ensureHospitalityAutomation`) resolve this id and stamp it onto `automations.browserbase_context_id`; the recorder session runs with `browserSettings.context = { id, persist: true }` so the human's first login is saved back. On the runner, identity scenarios (`eviivo_data_pull`, `custom_recorded_automation`) resolve the context from `profiles.browserbase_context_id` (source of truth) and **never** fall back to the shared per-scenario `workflow_browser_contexts`. So **one login on `/new` covers every personal automation for that identity, eviivo included.** A brand-new context is an empty cookie jar — not authenticated until the user logs in once. **Gov monitors are excluded** — org/`gov_profile`-scoped, they keep their dedicated per-scenario contexts.

**Identity egress pinning (must match across deployments):** Login-bound sites reject a restored context when the egress IP/fingerprint rotates, so the `/new` recording session pins region + Browserbase proxy + viewport via `resolveIdentitySessionPinning()` in `src/lib/browserbase.js` (`BROWSERBASE_IDENTITY_*` env; proxies default ON, viewport `1920x1080`). eviivo runs reuse the **same** pin: the runner's identity pin reads `BROWSERBASE_IDENTITY_*` then `BROWSERBASE_EVIIVO_*` then defaults. Because chromie (Vercel) and the runner (Lambda) are separate deployments, the identity `BROWSERBASE_*` values must be set identically in both (or left at defaults, which match) — otherwise a login captured on `/new` is rejected by the eviivo run. The recording session is a human-driven login, so it passes `solveCaptchas: false` (like `scripts/eviivo_login.py`) so the real challenge renders for the person to solve; scheduled runs leave the captcha solver at its default (on). **Tradeoff:** one shared jar means a context reset/bot-flag for an identity wipes every login for that identity at once, and its single pin must serve all its automations.

### `workflow_runs`

Execution/audit log for automations.

| Column Group | Purpose |
| --- | --- |
| Linkage | `id`, `automation_id`. |
| Status | `status`, `started_at`, `finished_at`. |
| Runner data | Browserbase session/debug/replay fields and Lambda metadata. |
| Results | `result`, `evaluation`, error details. `evaluation.browser_minutes`, `evaluation.input_tokens`, and `evaluation.output_tokens` record per-run usage for profile counter reconciliation. |

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

Gov dual monitor (`gov_dual_source`) needs rows for both `gov_contract_sam_gov` and `gov_contract_sbir_tech_marketplace`, each pinned to a `github_ref` that includes SBIR scenario support (use `main`). Seed/migrate with `sql/chromie_tools_sbir.sql`.

### Account Tables

Remaining lightweight account-adjacent tables:

| Table | Purpose |
| --- | --- |
| `global_feedback` | Product feedback submitted from the app. |

Deprecated billing tables (`billing`, `purchases`, `token_usage`) and `profiles.stripe_customer_id` are removed by `sql/drop_deprecated_billing_tables.sql` after the billing APIs and paid-plan client plumbing were removed. The waitlist API was also removed; the current Supabase project did not include `public.waitlist`.

## Active Storage

| Bucket | Purpose |
| --- | --- |
| `gov-profile-rfps` | Past RFP PDFs attached to `gov_profiles.past_rfps`; extracted summaries stay in the profile JSON, not in storage. Private bucket; server API routes use the service role after auth checks. |

## Dropped Builder Artifacts

The Chrome extension builder/codegen surface has been removed from the app code. `sql/drop_extension_builder_artifacts.sql` removes related database artifacts:

- Tables: `projects`, `code_files`, `conversations`, `shared_links`, `shared_icons`, `featured_projects`, `project_assets`, `project_versions`, `project_databases`, `project_database_data`, `metrics_events`, `metrics_aggregates`, `cron_job_log`, `agent_file_operations`, `session_replays`, `project_collaborators`, `extension_templates`, `extension_project_metadata`, `extension_user_settings`, `scraper`, `scraper_misses`, `api_docs_cache`.
- Functions: `create_project_version`, `get_next_version_number`, `add_conversation_message`, `generate_api_key`, `validate_api_key`, `metrics_dashboard`.
- Stale columns: `profiles.project_count`, `profiles.hyperbrowser_profile_id`, and GitHub builder export columns.

Unused profile email lifecycle columns are removed by `sql/drop_unused_profile_email_columns.sql`.
