-- Keep legacy gov monitor automations when a creator profile is deleted.
-- Non-gov personal automations are still removed before user_id is set null.

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
    and scenario_id not in ('gov_contract_sam_gov', 'gov_contract_sbir_tech_marketplace');

  return old;
end;
$$;
