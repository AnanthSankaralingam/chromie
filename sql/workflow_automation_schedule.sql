-- Workflow automation schedules (EventBridge Scheduler + dashboard UI).
-- Run in Supabase SQL editor after workflow_automations.sql.

alter table public.automations
  add column if not exists schedule_kind text not null default 'on_demand'
    check (schedule_kind in ('on_demand', 'cron'));

alter table public.automations
  add column if not exists cron_expression text;

alter table public.automations
  add column if not exists schedule_timezone text not null default 'UTC';

alter table public.automations
  add column if not exists eventbridge_schedule_name text;

comment on column public.automations.schedule_kind is
  'on_demand = manual Run now only; cron = EventBridge Scheduler invokes Lambda';
comment on column public.automations.cron_expression is
  'EventBridge Scheduler expression, e.g. cron(0 9 * * ? *)';
comment on column public.automations.schedule_timezone is
  'IANA timezone for cron evaluation, e.g. America/New_York';
comment on column public.automations.eventbridge_schedule_name is
  'AWS Scheduler schedule name (chromie-<automation_id>)';
