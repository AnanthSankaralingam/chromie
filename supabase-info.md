# Database Schema & Permissions for chromie
Project: bxzxoixtutqpmqjkjvbh

## Table Structures

---

### 1. `profiles`
Tracks user info (linked to Supabase Auth).

| Column              | Type         | Details                                        |
|---------------------|--------------|------------------------------------------------|
| `id`                | uuid         | PK, FK → `auth.users.id`, ON DELETE CASCADE    |
| `name`              | text         | User display name                              |
| `email`             | text         | User email                                     |
| `provider`          | text         | 'google', 'github', ...                        |
| `stripe_customer_id`| text         | Stripe customer ref                            |
| `project_count`     | integer      | DEFAULT 0, tracks total active projects        |
| `welcome_email_sent`| boolean      | DEFAULT false, tracks if welcome email was sent |
| `welcome_email_sent_at`| timestamptz | NULL, when welcome email was sent              |
| `email_campaign_stage`| integer     | NOT NULL, DEFAULT 1; campaign progression (`0`=unsubscribed/suppressed, `1+`=active sequence step for new signups and beyond; increment per campaign step) |
| `email_campaign_updated_at`| timestamptz | NOT NULL, DEFAULT now(); when `email_campaign_stage` was last updated |
| `gov_profile_id`    | uuid         | NULL, FK → `gov_profiles.id`, ON DELETE SET NULL; links user to shared gov contractor profile |
| `created_at`        | timestamptz  | DEFAULT now()                                  |
| `last_used_at`      | timestamptz  | DEFAULT now()                                  |

---

### 1a. `gov_profiles`
Shared company profile for gov contracting customers (ICP + SAM.gov search config + past RFPs). Multiple users link via `profiles.gov_profile_id`.

| Column                  | Type         | Details                                                                 |
|-------------------------|--------------|-------------------------------------------------------------------------|
| `id`                    | uuid         | PK, DEFAULT gen_random_uuid()                                           |
| `name`                  | text         | NOT NULL; company name (e.g. MorphWorks)                                |
| `search_keywords`       | text[]       | NOT NULL, DEFAULT `{}`; SAM.gov batch search keywords                   |
| `naics_codes`           | text[]       | NOT NULL, DEFAULT `{}`; NAICS codes                                     |
| `corporate_overview`    | text         | NULL; company context for future matching                               |
| `past_rfps`             | jsonb        | NOT NULL, DEFAULT `[]`; PDF metadata: `{ id, filename, storage_path, size_bytes, uploaded_at }` (files in Storage bucket `gov-profile-rfps`) |
| `created_at`            | timestamptz  | NOT NULL, DEFAULT now()                                                 |
| `updated_at`            | timestamptz  | NOT NULL, DEFAULT now()                                                 |

Apply migration: `sql/create_gov_profiles.sql`

Storage bucket for past RFP PDFs: `sql/gov_profile_rfp_storage.sql`

If you applied an earlier version with extra columns, run: `sql/alter_gov_profiles_simplify.sql`

Link a user to MorphWorks (after seed):
```sql
update public.profiles
set gov_profile_id = (select id from public.gov_profiles where name = 'MorphWorks' limit 1)
where email = 'user@example.com';
```

RLS policies:
- Linked users can SELECT and UPDATE their org row (where `profiles.gov_profile_id = gov_profiles.id`).
- INSERT/DELETE restricted to service role (admin seeding).

---

### 2. `projects`
One project per row.

| Column                | Type         | Details                                                     |
|-----------------------|--------------|-------------------------------------------------------------|
| `id`                  | uuid         | PK, DEFAULT gen_random_uuid()                               |
| `user_id`             | uuid         | FK → `profiles.id`, ON DELETE CASCADE                       |
| `name`                | text         | NOT NULL                                                    |
| `description`         | text         | Project description                                         |
| `created_at`          | timestamptz  | DEFAULT now()                                               |
| `last_used_at`        | timestamptz  | DEFAULT now()                                               |
| `archived`            | boolean      | DEFAULT false (soft delete)                                 |
| `api_key_hash`        | text         | SHA-256 hash of the API key (never stored in plaintext)    |
| `api_key_prefix`      | text         | Display prefix for UI (e.g., 'chromie_live_abc...xyz')      |
| `api_key_last_used_at`| timestamptz  | Timestamp of last successful API key authentication         |

Additional indexes:
- `idx_projects_api_key_hash` on `api_key_hash` WHERE `api_key_hash IS NOT NULL` for authentication

Helper functions:
- `generate_api_key()` - Generates a new secure API key with hash and prefix
- `validate_api_key(p_key text)` - Validates an API key and returns associated `project_id`

---

### 2a. `featured_projects`
Stores a curated list of project IDs that should appear in the "Featured Creations" gallery on the Chromie home page.

| Column           | Type         | Details                                                                      |
|------------------|--------------|------------------------------------------------------------------------------|
| `id`             | uuid         | PK, DEFAULT gen_random_uuid()                                               |
| `project_id`     | uuid         | FK → `projects.id`, ON DELETE CASCADE                                       |
| `position`       | integer      | Optional; smaller numbers appear earlier in the gallery                     |
| `demo_video_url` | text         | Optional; YouTube or direct video URL (mp4, webm) for the featured card    |
| `chrome_web_store_url` | text   | Optional; Chrome Web Store listing URL for the featured extension           |
| `is_public`      | boolean      | NOT NULL, DEFAULT true; whether the featured project is allowed to be forked |
| `created_at`     | timestamptz  | DEFAULT now(); when the project was added to the featured list              |

Recommended indexes:
- `idx_featured_projects_project_id` on `project_id` for fast joins
- `idx_featured_projects_position` on `position` for ordering

RLS policies:
- Public read access for all rows so the home page can render without requiring auth:
  - `SELECT` allowed for all roles.
- Insert/update/delete restricted to privileged roles (e.g., service role or admin dashboard) so only admins can curate the list.

Current curation snapshot:
- `featured_projects` was refreshed on 2026-04-28 with 16 published Chromie extensions.
- Records are ordered by `position` and include optional `demo_video_url` values for gallery playback.
- Records also include optional `chrome_web_store_url` values for direct listing links.
- `is_public` is used as a fork policy gate for featured projects; `chromie.dev` is set to `false`.
- Missing source projects were created as lightweight `projects` records to preserve complete gallery coverage.

---

### 3. `code_files`
Stores each code file per project.

| Column        | Type         | Details                                  |
|---------------|--------------|------------------------------------------|
| `id`          | uuid         | PK, DEFAULT gen_random_uuid()            |
| `project_id`  | uuid         | FK → `projects.id`, ON DELETE CASCADE    |
| `file_path`   | text         | NOT NULL                                 |
| `content`     | text         | Raw file contents                        |
| `last_used_at`  | timestamptz  | DEFAULT now()                            |

---

### 4. `conversations`
Stores conversation history per project as JSONB array (one row per project).

| Column        | Type         | Details                                   |
|---------------|--------------|-------------------------------------------|
| `id`          | uuid         | PK, DEFAULT gen_random_uuid()             |
| `project_id`  | uuid         | UNIQUE, FK → `projects.id`, ON DELETE CASCADE |
| `history`     | jsonb        | NOT NULL, DEFAULT '[]'::jsonb, array of message objects [{role, content, timestamp}, ...] |
| `created_at`  | timestamptz  | DEFAULT now()                             |
| `updated_at`  | timestamptz  | DEFAULT now()                             |

**Note**: Messages older than 2 hours are automatically filtered out when adding new messages via the `add_conversation_message()` PostgreSQL function.

Additional indexes:
- `idx_conversations_project_id` on `project_id` for fast lookups
- `idx_conversations_updated_at` on `updated_at` for cleanup queries

---

### 5. `billing` *(Optional: Stripe references)*
Not for credit card data — only foreign keys to Stripe.

| Column                | Type         | Details                                      |
|-----------------------|--------------|----------------------------------------------|
| `id`                  | uuid         | PK, DEFAULT gen_random_uuid()                |
| `user_id`             | uuid         | FK → `profiles.id`, ON DELETE CASCADE        |
| `stripe_customer_id`  | text         | Stripe ref                                   |
| `stripe_subscription_id`| text       | Stripe ref                                   |
| `plan`                | text         | e.g. 'free', 'pro', 'builder'                |
| `status`              | text         | e.g. 'active', 'past_due'                    |
| `created_at`          | timestamptz  | DEFAULT now()                                |
| `valid_until`         | timestamptz  | Optional, subscription expiry                |
| `purchase_count`      | integer      | DEFAULT 0, legacy field from earlier billing model |
| `has_one_time_purchase`| boolean     | DEFAULT false, legacy field from earlier billing model |

---

### 6. `purchases` *(Purchase ledger)*
Tracks purchases and subscriptions as a ledger.

| Column                    | Type         | Details                                      |
|---------------------------|--------------|----------------------------------------------|
| `id`                      | uuid         | PK, DEFAULT gen_random_uuid()                |
| `user_id`                 | uuid         | FK → `profiles.id`, ON DELETE CASCADE        |
| `stripe_payment_intent_id`| text         | Stripe payment intent ID (legacy one-time support) |
| `stripe_subscription_id`  | text         | Stripe subscription ID (subscriptions)       |
| `plan`                    | text         | 'pro' or 'builder' (active subscriptions)     |
| `purchase_type`           | text         | 'subscription' (legacy one-time rows may exist) |
| `status`                  | text         | 'active', 'refunded', 'expired', 'canceled'  |
| `credits_purchased`        | bigint       | Monthly credit allowance for this subscription row (mirrors plan; limits enforced via `PLAN_LIMITS`) |
| `purchased_at`            | timestamptz  | When purchase was made                       |
| `expires_at`              | timestamptz  | Renewal date for subscriptions                |
| `created_at`              | timestamptz  | DEFAULT now()                                |
| `updated_at`              | timestamptz  | DEFAULT now()                                |

Additional indexes:
- `idx_purchases_user_id` on `user_id` for user queries
- `idx_purchases_user_status` on `(user_id, status)` for active purchases
- `idx_purchases_stripe_payment_intent` on `stripe_payment_intent_id` for webhook lookups
- `idx_purchases_stripe_subscription` on `stripe_subscription_id` for webhook lookups

---

### 7. `token_usage`
Tracks credit usage (billing), browser minutes, **extension LLM proxy** token usage (plan-limited), and separate **aggregate** token totals for main-app analytics per user.

**Constraint:** `user_id` is **UNIQUE** (`token_usage_user_id_key`) — one row per user. Service-role upserts (e.g. Stripe webhook) must pass `{ onConflict: 'user_id' }` so existing free-tier rows update instead of inserting a second row.

| Column                    | Type         | Details                                           |
|---------------------------|--------------|---------------------------------------------------|
| `id`                      | uuid         | PK, DEFAULT gen_random_uuid()                    |
| `user_id`                 | uuid         | FK → `profiles.id`, ON DELETE CASCADE            |
| `total_credits`           | integer      | Total credits used (for billing limits)          |
| `total_tokens`            | integer      | Total tokens used **for main-app analytics / cost tracking** (not the extension proxy counter) |
| `extension_proxy_tokens`  | integer      | NOT NULL, DEFAULT 0; LLM tokens consumed via `/api/extension/llm` only; **not** mixed into `total_tokens` |
| `extension_proxy_monthly_reset` | timestamptz | NULL allowed; anchor for the **rolling monthly** extension-proxy window. All plans now use monthly-cycle reset behavior. |
| `monthly_reset`           | timestamptz  | DEFAULT now()                                    |
| `browser_minutes`         | integer      | Total browser minutes used                        |

Apply in Supabase SQL editor (once):

```sql
alter table public.token_usage
  add column if not exists extension_proxy_monthly_reset timestamptz;
```

---

### 8. `shared_links`
Stores shareable links for projects with expiration and access tracking.

| Column             | Type         | Details                                                     |
|--------------------|--------------|-------------------------------------------------------------|
| `id`               | uuid         | PK, DEFAULT gen_random_uuid()                               |
| `project_id`       | uuid         | FK → `projects.id`, ON DELETE CASCADE                      |
| `user_id`          | uuid         | FK → `profiles.id`, ON DELETE CASCADE                      |
| `share_token`      | text         | NOT NULL, UNIQUE, secure random token for sharing           |
| `expires_at`       | timestamptz  | NOT NULL, DEFAULT (now() + '7 days'::interval). Admins (`profiles.is_admin`) get `2099-12-31` via app when creating shares; existing admin links are extended in API. |
| `download_count`   | integer      | DEFAULT 0, tracks number of downloads                      |
| `view_count`       | integer      | DEFAULT 0, tracks number of page views                     |
| `is_active`        | boolean      | DEFAULT true, for soft deletion                             |
| `created_at`       | timestamptz  | DEFAULT now()                                               |
| `last_accessed_at` | timestamptz  | Tracks when link was last accessed                          |

Additional indexes:
- `idx_shared_links_token` on `share_token` for fast lookups
- `idx_shared_links_project` on `project_id` for project queries

---

### 9. `shared_icons`
Content-addressed, deduplicated icon storage shared across projects.

| Column           | Type         | Details                                                     |
|------------------|--------------|-------------------------------------------------------------|
| `hash`           | text         | PK, sha256 of binary content (content-addressed key)        |
| `path_hint`      | text         | NOT NULL; e.g., 'icons/icon16.png'                          |
| `sizes`          | text[]       | NOT NULL, DEFAULT '{}'                                      |
| `mime`           | text         | NOT NULL, DEFAULT 'image/png'                               |
| `visibility`     | text         | NOT NULL, DEFAULT 'global' ('global' | 'project_only')      |
| `content_base64` | text         | NOT NULL; base64-encoded file contents                      |
| `created_at`     | timestamptz  | DEFAULT now()                                               |

Additional indexes and constraints:
- Unique on `(path_hint, visibility)` to prevent duplicates per visibility scope.

---

### 10. `project_assets`
Stores user-uploaded files and custom icons for Chrome extensions.

| Column           | Type         | Details                                                     |
|------------------|--------------|-------------------------------------------------------------|
| `id`             | uuid         | PK, DEFAULT gen_random_uuid()                               |
| `project_id`     | uuid         | FK → `projects.id`, ON DELETE CASCADE                      |
| `file_path`      | text         | NOT NULL; file path within extension (e.g., 'icons/custom.png') |
| `content_base64` | text         | NOT NULL; base64-encoded file contents                      |
| `file_type`      | text         | NOT NULL; 'icon', 'asset', 'data', etc.                     |
| `mime_type`      | text         | NOT NULL, DEFAULT 'image/png'                               |
| `file_size`      | integer      | NOT NULL; size in bytes                                     |
| `created_at`     | timestamptz  | DEFAULT now()                                               |
| `updated_at`     | timestamptz  | DEFAULT now()                                               |

Additional indexes and constraints:
- Unique on `(project_id, file_path)` to prevent duplicate files per project
- `idx_project_assets_project_id` on `project_id` for fast lookups
- `idx_project_assets_file_type` on `(project_id, file_type)` for filtering by type

---

### 11. `project_versions`
Stores version history snapshots of projects including all files and assets.

| Column           | Type         | Details                                                     |
|------------------|--------------|-------------------------------------------------------------|
| `id`             | uuid         | PK, DEFAULT gen_random_uuid()                               |
| `project_id`     | uuid         | FK → `projects.id`, ON DELETE CASCADE                      |
| `version_number` | integer      | NOT NULL; incremental version number per project            |
| `version_name`   | text         | Optional name for the version                               |
| `description`    | text         | Optional description of changes                             |
| `snapshot_data`  | jsonb        | NOT NULL; complete project state (files, assets, metadata)  |
| `created_at`     | timestamptz  | DEFAULT now()                                               |
| `created_by`     | uuid         | FK → auth.users.id, ON DELETE SET NULL                     |

Additional indexes and constraints:
- Unique on `(project_id, version_number)` to prevent duplicate version numbers
- `idx_project_versions_project_id` on `project_id` for fast lookups
- `idx_project_versions_project_version` on `(project_id, version_number DESC)` for sorting
- `idx_project_versions_created_at` on `(project_id, created_at DESC)` for time-based queries

Helper functions:
- `get_next_version_number(p_project_id)` - Returns the next version number for a project
- `create_project_version(p_project_id, p_version_name, p_description)` - Creates a version snapshot

---

### 12. `api_docs_cache`

| Column            | Type                       | Description                              |
| ----------------- | -------------------------- | ---------------------------------------- |
| `id`              | `uuid` (PK)                |                                          |
| `api_url`         | `text`                     | Canonical API root (optional, extracted) |
| `api_name`        | `text`                     | API name (from user or extracted)        |
| `doc_link`        | `text`                     | URL of documentation (unique)            |
| `doc_content`     | `jsonb`                    | Structured content from Hyper Browser    |
| `last_crawled_at` | `timestamptz`              | Crawl timestamp                          |
| `source`          | `text`                     | `'hyperbrowser_extract'`                 |
| `status`          | `enum('success','failed')` | Crawl result status                      |
| `error_message`   | `text`                     | Optional failure log                     |

---

### 13. `metrics_events`
Stores analytics events from Chrome extensions for observability and metrics.

| Column        | Type         | Details                                                     |
|---------------|--------------|-------------------------------------------------------------|
| `id`          | bigint       | PK, GENERATED BY DEFAULT AS IDENTITY (optimized for high-volume inserts) |
| `project_id`  | uuid         | FK → `projects.id`, ON DELETE CASCADE                      |
| `user_uuid`   | text         | Anonymous Chrome user ID from SDK                           |
| `event_type`  | text         | NOT NULL; e.g. 'install', 'uninstall', 'button_click', 'frontend_displayed' |
| `event_time`  | timestamptz  | NOT NULL, DEFAULT now(); when the event occurred (from client/SDK) |
| `metadata`    | jsonb        | Optional context (e.g., {label: 'save_button', value: 42}) |
| `received_at` | timestamptz  | NOT NULL, DEFAULT now(); when the event was received by backend |
| `batch_id`    | uuid         | Optional, for grouping batched event uploads                |
| `source`      | text         | NOT NULL, DEFAULT 'sdk'; source of event ('sdk', 'api', 'import', etc.) |

Additional indexes:
- `idx_metrics_events_project_id` on `project_id` for project queries
- `idx_metrics_events_event_time` on `event_time DESC` for time-series queries
- `idx_metrics_events_event_type` on `event_type` for filtering by type
- `idx_metrics_events_project_time` on `(project_id, event_time DESC)` for common queries
- `idx_metrics_events_batch_id` on `batch_id` for batch lookups
- `idx_metrics_events_user_uuid` on `user_uuid` for user tracking
- `idx_metrics_events_project_type_time` on `(project_id, event_type, event_time DESC)` for analytics queries

Helper functions:
- `metrics_dashboard(p_project_id uuid, p_from timestamptz, p_to timestamptz, p_bucket text default 'day')`  
  Returns aggregated metrics for a project over a time range as JSONB:
  - `summary`: total events, unique users
  - `by_type`: event_type → count
  - `series`: time buckets with counts and unique users (bucket = date_trunc of `p_bucket`)

**Note:** Events older than 3 days are automatically cleaned up by the `metrics-events-retention` cron job.

---

### 14. `metrics_aggregates`
Daily aggregated metrics for efficient dashboard queries. Generated by pg_cron job at 2 AM UTC daily.

| Column                | Type         | Details                                                     |
|-----------------------|--------------|-------------------------------------------------------------|
| `id`                  | bigint       | PK, GENERATED BY DEFAULT AS IDENTITY                        |
| `project_id`          | uuid         | FK → `projects.id`, ON DELETE CASCADE                      |
| `aggregate_date`      | date         | NOT NULL; date for which metrics are aggregated             |
| `event_type`          | text         | NOT NULL; type of event being aggregated                    |
| `event_count`         | bigint       | NOT NULL, DEFAULT 0; total count of events                   |
| `unique_users`        | integer      | NOT NULL, DEFAULT 0; number of unique users                 |
| `new_users`           | integer      | NOT NULL, DEFAULT 0; number of new users (first event)      |
| `returning_users`     | integer      | NOT NULL, DEFAULT 0; number of returning users               |
| `first_event_at`      | timestamptz  | NULL; timestamp of first event in the day                   |
| `last_event_at`       | timestamptz  | NULL; timestamp of last event in the day                    |
| `top_labels`          | jsonb        | NULL, DEFAULT '{}'::jsonb; top labels from metadata         |
| `top_views`           | jsonb        | NULL, DEFAULT '{}'::jsonb; top page views                    |
| `top_button_ids`      | jsonb        | NULL, DEFAULT '{}'::jsonb; top button IDs clicked           |
| `value_sum`           | numeric      | NULL, DEFAULT 0; sum of numeric values from metadata         |
| `value_count`         | integer      | NULL, DEFAULT 0; count of events with numeric values       |
| `value_min`           | numeric      | NULL; minimum value from metadata                           |
| `value_max`           | numeric      | NULL; maximum value from metadata                           |
| `error_codes`         | jsonb        | NULL, DEFAULT '{}'::jsonb; distribution of error codes      |
| `hourly_distribution` | jsonb        | NULL, DEFAULT '{}'::jsonb; event distribution by hour       |
| `source_distribution` | jsonb        | NULL, DEFAULT '{}'::jsonb; event distribution by source     |
| `created_at`          | timestamptz  | NOT NULL, DEFAULT now()                                     |
| `updated_at`          | timestamptz  | NOT NULL, DEFAULT now()                                     |

Additional indexes and constraints:
- Unique constraint on `(project_id, aggregate_date, event_type)` to prevent duplicate aggregates
- `idx_metrics_aggregates_project_date` on `(project_id, aggregate_date DESC)` for project queries
- `idx_metrics_aggregates_project_type_date` on `(project_id, event_type, aggregate_date DESC)` for filtered queries
- `idx_metrics_aggregates_date` on `aggregate_date DESC` for date-based queries
- `idx_metrics_aggregates_page_views` on `(project_id, aggregate_date DESC)` WHERE `event_type = 'page_view'` for page view analytics
- `idx_metrics_aggregates_button_clicks` on `(project_id, aggregate_date DESC)` WHERE `event_type = 'button_click'` for button click analytics

**Purpose:** Pre-aggregated daily metrics enable fast dashboard queries without scanning the entire `metrics_events` table. The aggregation job runs daily at 2 AM UTC and processes events from the previous day.

---

### 15. `agent_file_operations`
Audit log for AI agent file operations (create, update, delete).

| Column           | Type         | Details                                                     |
|------------------|--------------|-------------------------------------------------------------|
| `id`             | uuid         | PK, DEFAULT gen_random_uuid()                               |
| `project_id`     | uuid         | FK → `projects.id`, ON DELETE CASCADE                      |
| `operation_type` | text         | NOT NULL; 'delete', 'create', 'update'                     |
| `file_path`      | text         | NOT NULL; path of the affected file                        |
| `reason`         | text         | Agent's explanation for the operation                       |
| `user_confirmed` | boolean      | DEFAULT false; whether user approved the operation          |
| `created_at`     | timestamptz  | DEFAULT now()                                               |

Additional indexes:
- `idx_agent_file_ops_project` on `project_id` for project queries
- `idx_agent_file_ops_created` on `created_at DESC` for chronological ordering

RLS policies:
- Users can SELECT operations only for projects they own
- Service role can INSERT operations (bypassing RLS for audit logging)
- No UPDATE/DELETE policies (audit logs are immutable)

---

### 16. `session_replays`
Stores testing replay videos and live URLs for each test run from the simulated browser.

| Column            | Type         | Details                                                     |
|-------------------|--------------|-------------------------------------------------------------|
| `id`              | uuid         | PK, DEFAULT gen_random_uuid()                               |
| `project_id`      | uuid         | FK → `projects.id`, ON DELETE CASCADE                      |
| `session_id`      | text         | NOT NULL; Hyperbrowser session ID                          |
| `live_url`        | text         | Live view URL for the browser session                       |
| `video_url`       | text         | Video recording URL (MP4)                                   |
| `recording_status` | text         | DEFAULT 'unknown'; status of video recording                |
| `test_type`       | text         | NOT NULL, DEFAULT 'ai'; type of test ('ai', 'puppeteer', 'hyperagent') |
| `test_result`     | jsonb        | Test results and metadata                                   |
| `created_at`      | timestamptz  | DEFAULT now()                                               |
| `updated_at`      | timestamptz  | DEFAULT now()                                               |

Additional indexes:
- `idx_session_replays_project_id` on `project_id` for fast project queries
- `idx_session_replays_created_at` on `created_at DESC` for chronological ordering

RLS policies:
- Users can SELECT replays only for projects they own
- Users can INSERT replays only for projects they own
- Users can DELETE replays only for projects they own

---

---
## Project Limits by Plan

| Plan    | Max Projects | Credits | Browser Minutes | Reset Type | Description                    |
|---------|--------------|---------|-----------------|------------|--------------------------------|
| free    | 1            | 30      | 15              | monthly    | Entry plan with monthly reset credits |
| pro     | Infinity     | 250     | Infinity        | monthly    | Paid monthly subscription |
| builder | 300          | 500     | 240             | monthly    | Higher-capacity monthly subscription |

**Extension LLM proxy** (`/api/extension/llm`): caps are `PLAN_LIMITS.*.extension_proxy_tokens` in `src/lib/constants.js` (free 100k, pro 500k, builder 1M). Usage is stored in `token_usage.extension_proxy_tokens` and resets on a **rolling monthly** window from `token_usage.extension_proxy_monthly_reset` for all plans.

## Credit Costs

- **Initial code generation**: 3 credits (for new extension projects)
- **Follow-up code generation**: 1 credit (for updates to existing extensions)

---

## Permissions (RLS Policies)

> **All tables have RLS (Row Level Security) enabled and are protected by default.**

---

### 1. `profiles`

- Users can SELECT, UPDATE, DELETE only their own row (where `id = auth.uid()`).
- Users can INSERT their own row (optional; often managed by backend).
- `project_count` is automatically maintained by database triggers.
- `gov_profile_id` is set manually in Supabase (links user to shared gov contractor profile).

### 1a. `gov_profiles`

- Linked users can SELECT and UPDATE only the row referenced by their `profiles.gov_profile_id`.
- No user INSERT/DELETE (admin/service role only).

### 2. `projects`

- Users can SELECT, UPDATE, DELETE projects only where `user_id = auth.uid()`.
- Users can INSERT rows with their own `user_id = auth.uid()`.
- Project count is automatically updated via database triggers.

### 3. `code_files`

- Users can SELECT, UPDATE, DELETE code files only for projects they own,  
  i.e., if `code_files.project_id` points to a project where `projects.user_id = auth.uid()`.
- Users can INSERT rows only if the `project_id` belongs to a project they own.

### 4. `conversations`

- Users can SELECT, UPDATE, DELETE conversations only for projects they own.
- Users can INSERT if the `project_id` belongs to one of their projects.

### 5. `billing`

- Users can SELECT, UPDATE, DELETE billing rows only for themselves (`user_id = auth.uid()`).
- Users can INSERT rows only for themselves (`user_id = auth.uid()`).

### 6. `purchases`

- Users can SELECT purchases only where `user_id = auth.uid()`.
- Users can INSERT purchases only for themselves (`user_id = auth.uid()`).
- No UPDATE/DELETE policies (purchases are immutable ledger entries).

### 8. `shared_links`

- Users can SELECT, UPDATE, DELETE shared links only where `user_id = auth.uid()`.
- Users can INSERT shared links only for their own projects (`user_id = auth.uid()`).
- Public READ access allowed for active, non-expired links (for sharing functionality).

### 9. `shared_icons`

- RLS enabled on the table.
- READ access allowed only where `visibility = 'global'`.
- No default INSERT/UPDATE/DELETE rights are granted by this policy.

Example policy (already applied):
```sql
create policy shared_icons_read_global
  on public.shared_icons for select
  using (visibility = 'global');
```

### 10. `project_assets`

- Users can SELECT, UPDATE, DELETE assets only for projects they own.
- Users can INSERT assets only for their own projects (`project_id` belongs to user).
- Unique constraint on `(project_id, file_path)` prevents duplicate uploads.

### 11. `project_versions`

- Users can SELECT versions only for projects they own.
- Users can INSERT versions only for their own projects (`project_id` belongs to user).
- Users can DELETE versions only for projects they own.
- No UPDATE policy (versions are immutable snapshots).

### 13. `metrics_events`

- Users can SELECT metrics only for projects they own.
- Users can INSERT metrics only for their own projects (`project_id` belongs to user).
- No UPDATE/DELETE policies (metrics are immutable event logs).
- **Note:** For SDK ingestion, use service role or create authenticated endpoints that validate `project_id` ownership server-side.

### 14. `metrics_aggregates`

- Users can SELECT aggregates only for projects they own.
- No INSERT/UPDATE/DELETE policies for users (aggregates are generated automatically by cron jobs).
- **Note:** Aggregates are read-only for users and managed exclusively by the `daily-metrics-aggregation` cron job.

### 16. `session_replays`
- Users can SELECT replays only for projects they own.
- Users can INSERT replays only for projects they own.
- Users can DELETE replays only for projects they own.
- No UPDATE policy (replays are immutable records).

---

## Summary

- **User isolation:** Each user can only see and modify their own data—never anyone's.
- **Project/file-level security:** Files/conversations are always scoped to a user's own projects.
- **Billing data:** No unauthorized access to others' billing info.
- **Project limits:** Automatically enforced based on user's subscription plan.
- **Best practice:** All foreign keys are set to ON DELETE CASCADE for streamlined cleanup.
- **Automatic counting:** Project counts are maintained automatically via database triggers.