alter table public.profiles
  drop column if exists welcome_email_sent,
  drop column if exists welcome_email_sent_at,
  drop column if exists email_campaign_stage,
  drop column if exists email_campaign_updated_at;
