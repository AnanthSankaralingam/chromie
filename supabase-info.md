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
| `updated_at`  | timestamptz  | DEFAULT now()                            |

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
| `plan`                | text         | e.g. 'free', 'pro'                           |
| `status`              | text         | e.g. 'active', 'past_due'                    |
| `created_at`          | timestamptz  | DEFAULT now()                                |
| `valid_until`         | timestamptz  | Optional, subscription expiry                |

### 6. `token_usage`
Tracks OpenAI token usage per user and project.

| Column            | Type         | Details                                           |
|-------------------|--------------|---------------------------------------------------|
| `id`              | uuid         | PK, DEFAULT gen_random_uuid()                    |
| `user_id`         | uuid         | FK → `profiles.id`, ON DELETE CASCADE            |
| `project_id`      | uuid         | FK → `projects.id`, ON DELETE CASCADE            |
| `request_id`      | uuid         | Optional session/request reference               |
| `prompt_tokens`   | integer      | Tokens sent in prompt                            |
| `completion_tokens`| integer     | Tokens generated in response                     |
| `total_tokens`    | integer      | Total tokens = prompt + completion               |
| `model`           | text         | Model used (e.g. 'gpt-4o')                        |
| `created_at`      | timestamptz  | DEFAULT now()                                    |


---

## Permissions (RLS Policies)

> **All tables have RLS (Row Level Security) enabled and are protected by default.**

---

### 1. `profiles`

- Users can SELECT, UPDATE, DELETE only their own row (where `id = auth.uid()`).
- Users can INSERT their own row (optional; often managed by backend).

### 2. `projects`

- Users can SELECT, UPDATE, DELETE projects only where `user_id = auth.uid()`.
- Users can INSERT rows with their own `user_id = auth.uid()`.

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

---

## Summary

- **User isolation:** Each user can only see and modify their own data—never anyone else’s.
- **Project/file-level security:** Files/conversations are always scoped to a user’s own projects.
- **Billing data:** No unauthorized access to others’ billing info.
- **Best practice:** All foreign keys are set to ON DELETE CASCADE for streamlined cleanup.

---

## Browserbase Integration

The project now includes Browserbase integration for testing Chrome extensions in a real browser environment.

### Required Environment Variables

Add these to your `.env.local` file:

```bash
# Browserbase Configuration (for Chrome Extension Testing)
# Get these from https://browserbase.com
BROWSERBASE_API_KEY=bb_live_your_api_key_here
BROWSERBASE_PROJECT_ID=prj_your_project_id_here
```

### How to Get Browserbase Credentials

1. Go to [browserbase.com](https://browserbase.com) and create an account
2. Create a new project in your Browserbase dashboard
3. Copy the Project ID from your project settings
4. Generate an API key from your account settings
5. Add both values to your `.env.local` file

### Features

- **Real Browser Testing**: Test your extensions in actual Chrome browsers
- **Live View**: Get iframe URLs to see your extension running in real-time
- **Extension Upload**: Automatically packages and uploads your extension files
- **Session Management**: Creates isolated browser sessions for each test

### Usage

When you click "Test Extension" in the builder, the app will:
1. Package your extension files into a zip
2. Upload to Browserbase
3. Create a new browser session with your extension loaded
4. Display the live browser in an iframe

---

