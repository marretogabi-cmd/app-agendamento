alter table public.profiles enable row level security;
alter table public."AvailabilityRuleGroup" enable row level security;
alter table public."AvailabilityRule" enable row level security;
alter table public."Client" enable row level security;
alter table public."ProviderClient" enable row level security;
alter table public."AvailabilityOverride" enable row level security;
alter table public."Appointment" enable row level security;
alter table public.email_outbox enable row level security;
alter table public.idempotency_record enable row level security;

revoke all on all tables in schema public from anon, authenticated;

grant all on table public.profiles to service_role;
grant all on table public."AvailabilityRuleGroup" to service_role;
grant all on table public."AvailabilityRule" to service_role;
grant all on table public."Client" to service_role;
grant all on table public."ProviderClient" to service_role;
grant all on table public."AvailabilityOverride" to service_role;
grant all on table public."Appointment" to service_role;
grant all on table public.email_outbox to service_role;
grant all on table public.idempotency_record to service_role;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public."AvailabilityRuleGroup" to authenticated;
grant select, insert, update, delete on table public."AvailabilityRule" to authenticated;
grant select on table public."ProviderClient" to authenticated;
grant select on table public."Appointment" to authenticated;
grant select, insert, update, delete on table public."AvailabilityOverride" to authenticated;

create policy profiles_select_own
on public.profiles for select to authenticated
using ((select auth.uid()) is not null and id = (select auth.uid()));

create policy profiles_insert_own
on public.profiles for insert to authenticated
with check ((select auth.uid()) is not null and id = (select auth.uid()));

create policy profiles_update_own
on public.profiles for update to authenticated
using ((select auth.uid()) is not null and id = (select auth.uid()))
with check ((select auth.uid()) is not null and id = (select auth.uid()));

create policy groups_select_own
on public."AvailabilityRuleGroup" for select to authenticated
using ((select auth.uid()) is not null and provider_id = (select auth.uid()));

create policy groups_insert_own
on public."AvailabilityRuleGroup" for insert to authenticated
with check ((select auth.uid()) is not null and provider_id = (select auth.uid()));

create policy groups_update_own
on public."AvailabilityRuleGroup" for update to authenticated
using ((select auth.uid()) is not null and provider_id = (select auth.uid()))
with check ((select auth.uid()) is not null and provider_id = (select auth.uid()));

create policy groups_delete_own
on public."AvailabilityRuleGroup" for delete to authenticated
using ((select auth.uid()) is not null and provider_id = (select auth.uid()));

create policy rules_select_own
on public."AvailabilityRule" for select to authenticated
using (
  exists (
    select 1 from public."AvailabilityRuleGroup" as rule_group
    where rule_group.id = group_id
      and rule_group.provider_id = (select auth.uid())
  )
);

create policy rules_insert_own
on public."AvailabilityRule" for insert to authenticated
with check (
  exists (
    select 1 from public."AvailabilityRuleGroup" as rule_group
    where rule_group.id = group_id
      and rule_group.provider_id = (select auth.uid())
  )
);

create policy rules_update_own
on public."AvailabilityRule" for update to authenticated
using (
  exists (
    select 1 from public."AvailabilityRuleGroup" as rule_group
    where rule_group.id = group_id
      and rule_group.provider_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public."AvailabilityRuleGroup" as rule_group
    where rule_group.id = group_id
      and rule_group.provider_id = (select auth.uid())
  )
);

create policy rules_delete_own
on public."AvailabilityRule" for delete to authenticated
using (
  exists (
    select 1 from public."AvailabilityRuleGroup" as rule_group
    where rule_group.id = group_id
      and rule_group.provider_id = (select auth.uid())
  )
);

create policy overrides_select_own
on public."AvailabilityOverride" for select to authenticated
using ((select auth.uid()) is not null and provider_id = (select auth.uid()));

create policy overrides_insert_own
on public."AvailabilityOverride" for insert to authenticated
with check ((select auth.uid()) is not null and provider_id = (select auth.uid()));

create policy overrides_update_own
on public."AvailabilityOverride" for update to authenticated
using ((select auth.uid()) is not null and provider_id = (select auth.uid()))
with check ((select auth.uid()) is not null and provider_id = (select auth.uid()));

create policy overrides_delete_own
on public."AvailabilityOverride" for delete to authenticated
using ((select auth.uid()) is not null and provider_id = (select auth.uid()));

create policy appointments_select_own
on public."Appointment" for select to authenticated
using ((select auth.uid()) is not null and provider_id = (select auth.uid()));

create policy provider_clients_select_own
on public."ProviderClient" for select to authenticated
using ((select auth.uid()) is not null and provider_id = (select auth.uid()));

-- No anon policies exist. Public access is mediated by validated Edge Functions.
-- email_outbox and idempotency_record intentionally have no user policies.
