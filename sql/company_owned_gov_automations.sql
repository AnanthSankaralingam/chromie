-- Move government monitor automation ownership from creator users to gov_profiles.
-- General-purpose automations remain user-owned and are cleaned up when a profile is deleted.

alter table public.automations
  add column if not exists gov_profile_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'automations_gov_profile_id_fkey'
      and conrelid = 'public.automations'::regclass
  ) then
    alter table public.automations
      add constraint automations_gov_profile_id_fkey
      foreign key (gov_profile_id)
      references public.gov_profiles(id)
      on delete cascade;
  end if;
end $$;

update public.automations
set gov_profile_id = (params->>'gov_profile_id')::uuid
where scenario_id in ('morphworks_sam_gov', 'morphworks_sbir_tech_marketplace')
  and gov_profile_id is null
  and params ? 'gov_profile_id'
  and params->>'gov_profile_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and exists (
    select 1
    from public.gov_profiles gp
    where gp.id = (automations.params->>'gov_profile_id')::uuid
  );

update public.automations a
set gov_profile_id = p.gov_profile_id
from public.profiles p
where a.user_id = p.id
  and a.gov_profile_id is null
  and p.gov_profile_id is not null
  and a.scenario_id in ('morphworks_sam_gov', 'morphworks_sbir_tech_marketplace');

create index if not exists idx_automations_gov_profile_scenario
  on public.automations (gov_profile_id, scenario_id)
  where gov_profile_id is not null;

create unique index if not exists automations_gov_profile_scenario_unique
  on public.automations (gov_profile_id, scenario_id)
  where scenario_id in ('morphworks_sam_gov', 'morphworks_sbir_tech_marketplace')
    and gov_profile_id is not null;

alter table public.automations
  alter column user_id drop not null;

alter table public.automations
  drop constraint if exists automations_user_id_fkey;

alter table public.automations
  add constraint automations_user_id_fkey
  foreign key (user_id)
  references public.profiles(id)
  on delete set null;

create or replace function public.delete_personal_automations_before_profile_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.automations
  where user_id = old.id
    and gov_profile_id is null
    and scenario_id not in ('morphworks_sam_gov', 'morphworks_sbir_tech_marketplace');

  return old;
end;
$$;

drop trigger if exists profiles_delete_personal_automations on public.profiles;

create trigger profiles_delete_personal_automations
before delete on public.profiles
for each row
execute function public.delete_personal_automations_before_profile_delete();
