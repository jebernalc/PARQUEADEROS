-- PARKSOLVEX security hardening applied in Supabase.
create schema if not exists authz;

-- Authorization helpers are kept outside the exposed public API schema.
-- Legacy public helpers are moved to authz when present.
do $$
begin
  if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='is_platform_owner' and pg_get_function_identity_arguments(p.oid)='uid uuid') then
    execute 'alter function public.is_platform_owner(uuid) set schema authz';
  end if;
  if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='has_org_role') then
    execute 'alter function public.has_org_role(uuid,text[],uuid) set schema authz';
  end if;
end $$;

revoke all on schema authz from public, anon;
grant usage on schema authz to authenticated, service_role;
revoke all on function authz.is_platform_owner(uuid) from public, anon;
revoke all on function authz.has_org_role(uuid,text[],uuid) from public, anon;
grant execute on function authz.is_platform_owner(uuid) to authenticated, service_role;
grant execute on function authz.has_org_role(uuid,text[],uuid) to authenticated, service_role;

alter function public.set_updated_at() set search_path = public, pg_temp;

alter table public.platform_owners enable row level security;
drop policy if exists platform_owner_self_read on public.platform_owners;
create policy platform_owner_self_read on public.platform_owners
for select to authenticated using (user_id=(select auth.uid()));
