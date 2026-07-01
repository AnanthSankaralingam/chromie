drop table if exists public.token_usage;
drop table if exists public.purchases;
drop table if exists public.billing;

alter table public.profiles
  drop column if exists stripe_customer_id;
