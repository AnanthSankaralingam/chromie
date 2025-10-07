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

### 6. `token_usage`
Tracks LLM token usage per user.

| Column            | Type         | Details                                           |
|-------------------|--------------|---------------------------------------------------|
| `id`              | uuid         | PK, DEFAULT gen_random_uuid()                    |
| `user_id`         | uuid         | FK → `profiles.id`, ON DELETE CASCADE            |
| `total_tokens`    | integer      | Total tokens = prompt + completion               |
| `model`           | text         | Model used (e.g. 'gpt-4o')                        |
| `monthly_reset`      | timestamptz  | DEFAULT now()                                    |
| `browser_minutes`      | integer  | Total browser minutes                                |

---

### 7. `shared_links`
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

### 8. `shared_icons`
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

| Plan    | Max Projects | Description                    |
|---------|--------------|--------------------------------|
| free    | 10           | Basic tier with limited projects |
| starter | 25           | Mid-tier with more projects    |
| pro     | 50           | Premium tier with max projects |

---

## Required SQL Updates

Run these SQL commands in your Supabase SQL editor to implement project counting:

```sql
-- Add project_count column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS project_count INTEGER DEFAULT 0;

-- Create function to update project count
CREATE OR REPLACE FUNCTION update_project_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles 
    SET project_count = project_count + 1 
    WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles 
    SET project_count = project_count - 1 
    WHERE id = OLD.user_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle case where user_id changes (shouldn't happen but safety)
    IF OLD.user_id != NEW.user_id THEN
      UPDATE profiles SET project_count = project_count - 1 WHERE id = OLD.user_id;
      UPDATE profiles SET project_count = project_count + 1 WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update project count
DROP TRIGGER IF EXISTS trigger_update_project_count ON projects;
CREATE TRIGGER trigger_update_project_count
  AFTER INSERT OR DELETE OR UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_project_count();

-- Update existing project counts for all users
UPDATE profiles 
SET project_count = (
  SELECT COUNT(*) 
  FROM projects 
  WHERE projects.user_id = profiles.id 
  AND projects.archived = false
);
```

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

### 7. `shared_links`

- Users can SELECT, UPDATE, DELETE shared links only where `user_id = auth.uid()`.
- Users can INSERT shared links only for their own projects (`user_id = auth.uid()`).
- Public READ access allowed for active, non-expired links (for sharing functionality).

### 8. `shared_icons`

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