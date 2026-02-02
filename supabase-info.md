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
| `created_at`        | timestamptz  | DEFAULT now()                                  |
| `last_used_at`      | timestamptz  | DEFAULT now()                                  |

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
| `created_at`     | timestamptz  | DEFAULT now(); when the project was added to the featured list              |

Recommended indexes:
- `idx_featured_projects_project_id` on `project_id` for fast joins
- `idx_featured_projects_position` on `position` for ordering

RLS policies:
- Public read access for all rows so the home page can render without requiring auth:
  - `SELECT` allowed for all roles.
- Insert/update/delete restricted to privileged roles (e.g., service role or admin dashboard) so only admins can curate the list.

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
| `plan`                | text         | e.g. 'free', 'starter', 'pro'                |
| `status`              | text         | e.g. 'active', 'past_due'                    |
| `created_at`          | timestamptz  | DEFAULT now()                                |
| `valid_until`         | timestamptz  | Optional, subscription expiry                |
| `purchase_count`      | integer      | DEFAULT 0, tracks number of one-time purchases |
| `has_one_time_purchase`| boolean     | DEFAULT false, indicates if user has one-time purchases |

---

### 6. `purchases` *(Purchase ledger)*
Tracks all purchases (one-time and subscriptions) as a ledger.

| Column                    | Type         | Details                                      |
|---------------------------|--------------|----------------------------------------------|
| `id`                      | uuid         | PK, DEFAULT gen_random_uuid()                |
| `user_id`                 | uuid         | FK → `profiles.id`, ON DELETE CASCADE        |
| `stripe_payment_intent_id`| text         | Stripe payment intent ID (one-time purchases) |
| `stripe_subscription_id`  | text         | Stripe subscription ID (subscriptions)       |
| `plan`                    | text         | 'starter', 'pro', 'legend'                   |
| `purchase_type`           | text         | 'one_time' or 'subscription'                 |
| `status`                  | text         | 'active', 'refunded', 'expired', 'canceled'  |
| `credits_purchased`        | bigint       | Credits included in this purchase             |
| `tokens_purchased`         | bigint       | Tokens included in this purchase (for analytics) |
| `browser_minutes_purchased`| integer     | Browser minutes included in this purchase    |
| `projects_purchased`      | integer      | Projects included in this purchase           |
| `purchased_at`            | timestamptz  | When purchase was made                       |
| `expires_at`              | timestamptz  | NULL for one-time, renewal date for subs     |
| `created_at`              | timestamptz  | DEFAULT now()                                |
| `updated_at`              | timestamptz  | DEFAULT now()                                |

Additional indexes:
- `idx_purchases_user_id` on `user_id` for user queries
- `idx_purchases_user_status` on `(user_id, status)` for active purchases
- `idx_purchases_stripe_payment_intent` on `stripe_payment_intent_id` for webhook lookups
- `idx_purchases_stripe_subscription` on `stripe_subscription_id` for webhook lookups

---

### 7. `token_usage`
Tracks both credit usage (for billing) and token usage (for analytics) per user.

| Column            | Type         | Details                                           |
|-------------------|--------------|---------------------------------------------------|
| `id`              | uuid         | PK, DEFAULT gen_random_uuid()                    |
| `user_id`         | uuid         | FK → `profiles.id`, ON DELETE CASCADE            |
| `total_credits`   | integer      | Total credits used (for billing limits)          |
| `total_tokens`    | integer      | Total tokens used (for analytics/cost tracking)   |
| `model`           | text         | Model used (e.g. 'gpt-4o')                        |
| `monthly_reset`   | timestamptz  | DEFAULT now()                                    |
| `browser_minutes` | integer      | Total browser minutes used                        |

---

### 8. `shared_links`
Stores shareable links for projects with expiration and access tracking.

| Column             | Type         | Details                                                     |
|--------------------|--------------|-------------------------------------------------------------|
| `id`               | uuid         | PK, DEFAULT gen_random_uuid()                               |
| `project_id`       | uuid         | FK → `projects.id`, ON DELETE CASCADE                      |
| `user_id`          | uuid         | FK → `profiles.id`, ON DELETE CASCADE                      |
| `share_token`      | text         | NOT NULL, UNIQUE, secure random token for sharing           |
| `expires_at`       | timestamptz  | NOT NULL, DEFAULT (now() + '7 days'::interval)             |
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

---
## Project Limits by Plan

| Plan    | Max Projects | Credits | Browser Minutes | Reset Type | Description                    |
|---------|--------------|---------|-----------------|------------|--------------------------------|
| free    | 1            | 5       | 15              | monthly    | Basic tier with limited projects |
| starter | 2            | 20      | 30              | one-time   | One-time purchase package       |
| pro     | 10           | 100     | 120             | one-time   | One-time purchase package       |
| legend  | 300          | 1000    | 240             | monthly    | Monthly subscription            |

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

---

## Summary

- **User isolation:** Each user can only see and modify their own data—never anyone's.
- **Project/file-level security:** Files/conversations are always scoped to a user's own projects.
- **Billing data:** No unauthorized access to others' billing info.
- **Project limits:** Automatically enforced based on user's subscription plan.
- **Best practice:** All foreign keys are set to ON DELETE CASCADE for streamlined cleanup.
- **Automatic counting:** Project counts are maintained automatically via database triggers.