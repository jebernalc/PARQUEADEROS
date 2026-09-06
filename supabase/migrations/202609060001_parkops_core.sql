create extension if not exists pgcrypto;
create type public.app_role as enum ('platform_owner','tenant_admin','auditor','supervisor','operator','cashier','viewer');
create type public.plan_code as enum ('trial','monthly','annual','lifetime');

create table public.organizations(id uuid primary key default gen_random_uuid(),legal_name text not null,trade_name text not null,tax_id text,email text,phone text,status text not null default 'active',created_at timestamptz not null default now());
create table public.sites(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations on delete cascade,name text not null,address text,city text default 'Bogotá D.C.',capacity integer default 0,active boolean default true,unique(organization_id,name));
create table public.profiles(user_id uuid primary key references auth.users on delete cascade,full_name text not null,document_number text,phone text,active boolean default true,created_at timestamptz default now());
create table public.memberships(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations on delete cascade,user_id uuid not null references auth.users on delete cascade,role public.app_role not null,active boolean default true,unique(organization_id,user_id));
create table public.site_access(membership_id uuid references public.memberships on delete cascade,site_id uuid references public.sites on delete cascade,primary key(membership_id,site_id));
create table public.plans(code public.plan_code primary key,name text not null,price_cop numeric(14,2) default 0,duration_days integer,max_sites integer,max_users integer,features jsonb default '{}',active boolean default true);
insert into public.plans values
('trial','Prueba',0,15,1,2,'{"audit":true,"reports":true}',true),
('monthly','Mensual',0,30,3,20,'{"audit":true,"reports":true}',true),
('annual','Anual',0,365,10,100,'{"audit":true,"reports":true,"discount":true}',true),
('lifetime','Vitalicio',0,null,null,null,'{"audit":true,"reports":true}',true) on conflict do nothing;
create table public.subscriptions(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations on delete cascade,plan_code public.plan_code references public.plans,status text default 'trialing',starts_at timestamptz default now(),ends_at timestamptz,amount_cop numeric(14,2) default 0,payment_provider text,external_reference text);
create table public.customers(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations on delete cascade,customer_type text default 'visitor',document_type text,document_number text,full_name text not null,email text,phone text,active boolean default true,created_at timestamptz default now());
create table public.vehicles(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations on delete cascade,customer_id uuid references public.customers on delete set null,plate text not null,vehicle_type text not null,brand text,color text,electric boolean default false,active boolean default true,unique(organization_id,plate));
create table public.rate_schedules(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations on delete cascade,site_id uuid references public.sites on delete cascade,vehicle_type text not null,customer_type text default 'visitor',price_per_minute numeric(12,2) default 0,grace_minutes integer default 0,minimum_minutes integer default 0,daily_cap numeric(14,2),monthly_price numeric(14,2),valid_from timestamptz default now(),valid_to timestamptz,active boolean default true);
create table public.parking_tickets(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations,site_id uuid not null references public.sites,vehicle_id uuid references public.vehicles,customer_id uuid references public.customers,receipt_number bigint generated always as identity,plate text not null,vehicle_type text not null,customer_type text not null,key_locker text,bay text,received_by uuid references auth.users,delivered_by uuid references auth.users,entry_at timestamptz default now(),exit_at timestamptz,status text default 'open',minutes integer,subtotal numeric(14,2) default 0,tax numeric(14,2) default 0,discount numeric(14,2) default 0,total numeric(14,2) default 0,payment_method text,rate_snapshot jsonb default '{}',metadata jsonb default '{}',version integer default 1,updated_at timestamptz default now());
create unique index one_open_ticket_per_plate on public.parking_tickets(organization_id,plate) where status='open';
create table public.monthly_contracts(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations,site_id uuid references public.sites,customer_id uuid references public.customers,vehicle_id uuid references public.vehicles,starts_on date not null,ends_on date not null,amount_cop numeric(14,2) not null,status text default 'active',check(ends_on>=starts_on));
create table public.payments(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations,ticket_id uuid references public.parking_tickets,contract_id uuid references public.monthly_contracts,amount_cop numeric(14,2) not null,method text not null,status text default 'approved',external_reference text,received_by uuid references auth.users,paid_at timestamptz default now(),metadata jsonb default '{}');
create table public.audit_events(id bigint generated always as identity primary key,organization_id uuid not null references public.organizations,site_id uuid references public.sites,actor_id uuid references auth.users,action text not null,entity_type text not null,entity_id text,old_data jsonb,new_data jsonb,occurred_at timestamptz default now());

create or replace function public.is_member(org uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from memberships where organization_id=org and user_id=auth.uid() and active)$$;
create or replace function public.has_role(org uuid,roles public.app_role[]) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from memberships where organization_id=org and user_id=auth.uid() and active and role=any(roles))$$;

alter table public.organizations enable row level security; alter table public.sites enable row level security; alter table public.profiles enable row level security;
alter table public.memberships enable row level security; alter table public.site_access enable row level security; alter table public.plans enable row level security;
alter table public.subscriptions enable row level security; alter table public.customers enable row level security; alter table public.vehicles enable row level security;
alter table public.rate_schedules enable row level security; alter table public.parking_tickets enable row level security; alter table public.monthly_contracts enable row level security;
alter table public.payments enable row level security; alter table public.audit_events enable row level security;
create policy organizations_read on public.organizations for select using(public.is_member(id));
create policy profiles_self on public.profiles for select using(user_id=auth.uid());
create policy memberships_read on public.memberships for select using(public.is_member(organization_id));
create policy plans_public_read on public.plans for select using(true);
do $$declare t text; begin foreach t in array array['sites','subscriptions','customers','vehicles','rate_schedules','parking_tickets','monthly_contracts','payments','audit_events'] loop
execute format('create policy %I_read on public.%I for select using(public.is_member(organization_id))',t,t);
execute format('create policy %I_insert on public.%I for insert with check(public.has_role(organization_id,array[''platform_owner'',''tenant_admin'',''supervisor'',''operator'',''cashier'']::public.app_role[]))',t,t);
execute format('create policy %I_update on public.%I for update using(public.has_role(organization_id,array[''platform_owner'',''tenant_admin'',''supervisor'',''operator'',''cashier'']::public.app_role[]))',t,t);
end loop; end$$;
alter publication supabase_realtime add table public.parking_tickets,public.payments,public.monthly_contracts,public.audit_events;
