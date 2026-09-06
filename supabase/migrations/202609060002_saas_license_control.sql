create table if not exists public.platform_owners(
  user_id uuid primary key references auth.users on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.app_installations(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  device_id text not null,
  label text,
  platform text not null default 'android',
  app_version text,
  active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  unique(organization_id,device_id)
);

create table if not exists public.license_issuances(
  id uuid primary key default gen_random_uuid(),
  license_id text not null unique,
  organization_id uuid not null references public.organizations on delete cascade,
  installation_id uuid references public.app_installations on delete set null,
  device_id text not null,
  plan_code text not null,
  issued_to text not null,
  license_key text not null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users,
  metadata jsonb not null default '{}'
);

alter table public.platform_owners enable row level security;
alter table public.app_installations enable row level security;
alter table public.license_issuances enable row level security;

create policy platform_owner_self_read on public.platform_owners
for select using(user_id=auth.uid());
create policy installations_member_read on public.app_installations
for select using(public.is_member(organization_id));
create policy installations_admin_write on public.app_installations
for all using(public.has_role(organization_id,array['platform_owner','tenant_admin']::public.app_role[]))
with check(public.has_role(organization_id,array['platform_owner','tenant_admin']::public.app_role[]));
create policy licenses_member_read on public.license_issuances
for select using(public.is_member(organization_id));

create or replace function public.is_platform_owner() returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from platform_owners where user_id=auth.uid() and active)
$$;

grant execute on function public.is_platform_owner() to authenticated;
