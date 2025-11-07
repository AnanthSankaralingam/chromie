# Database Schema & Permissions for Chrome Extension Builder

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

| Column          | Type         | Details                                  |
|-----------------|--------------|------------------------------------------|
| `id`            | uuid         | PK, DEFAULT gen_random_uuid()            |
| `user_id`       | uuid         | FK → `profiles.id`, ON DELETE CASCADE    |
| `name`          | text         | NOT NULL                                 |
| `description`   | text         | Project description                      |
| `created_at`    | timestamptz  | DEFAULT now()                            |
| `last_used_at`  | timestamptz  | DEFAULT now()                            |
| `archived`      | boolean      | DEFAULT false (soft delete)              |

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
Stores AI/user messages per project (for OpenAI codegen context, etc).

| Column        | Type         | Details                                   |
|---------------|--------------|-------------------------------------------|
| `id`          | uuid         | PK, DEFAULT gen_random_uuid()             |
| `project_id`  | uuid         | FK → `projects.id`, ON DELETE CASCADE     |
| `role`        | text         | NOT NULL ('user', 'assistant', etc.)      |
| `content`     | text         | Message body                              |
| `created_at`  | timestamptz  | DEFAULT now()                             |

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
| `tokens_purchased`        | bigint       | Tokens included in this purchase             |
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
Tracks LLM token usage per user.

| Column            | Type         | Details                                           |
|-------------------|--------------|---------------------------------------------------|
| `id`              | uuid         | PK, DEFAULT gen_random_uuid()                    |
| `user_id`         | uuid         | FK → `profiles.id`, ON DELETE CASCADE            |
| `total_tokens`    | integer      | Total tokens = prompt + completion               |
| `model`           | text         | Model used (e.g. 'gpt-4o')                        |
| `monthly_reset`      | timestamptz  | DEFAULT now()                                    |
| `browser_minutes`      | integer  | Total browser minutes used                               |

---

### 8. `shared_links`
Stores shareable links for projects with expiration and access tracking.

| Column             | Type         | Details                                                     |
|--------------------|--------------|-------------------------------------------------------------|
| `id`               | uuid         | PK, DEFAULT gen_random_uuid()                               |
| `project_id`       | uuid         | FK → `projects.id`, ON DELETE CASCADE                      |
| `user_id`          | uuid         | FK → `profiles.id`, ON DELETE CASCADE                      |
| `share_token`      | text         | NOT NULL, UNIQUE, secure random token for sharing           |
| `expires_at`       | timestamptz  | NOT NULL, DEFAULT (now() + '24:00:00'::interval)           |
| `download_count`   | integer      | DEFAULT 0, tracks number of downloads                      |
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

## Project Limits by Plan

| Plan    | Max Projects | Tokens | Browser Minutes | Reset Type | Description                    |
|---------|--------------|--------|-----------------|------------|--------------------------------|
| free    | 1            | 40K    | 15              | monthly    | Basic tier with limited projects |
| starter | 2            | 150K   | 30              | one-time   | One-time purchase package       |
| pro     | 10           | 1M     | 120             | one-time   | One-time purchase package       |
| legend  | 300          | 5M     | 240             | monthly    | Monthly subscription            |

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

---

## Summary

- **User isolation:** Each user can only see and modify their own data—never anyone's.
- **Project/file-level security:** Files/conversations are always scoped to a user's own projects.
- **Billing data:** No unauthorized access to others' billing info.
- **Project limits:** Automatically enforced based on user's subscription plan.
- **Best practice:** All foreign keys are set to ON DELETE CASCADE for streamlined cleanup.
- **Automatic counting:** Project counts are maintained automatically via database triggers.