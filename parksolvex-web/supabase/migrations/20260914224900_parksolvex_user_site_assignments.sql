create table if not exists public.usuario_sedes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  sede_id uuid not null references public.sedes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(cliente_id,sede_id,user_id)
);
create index if not exists usuario_sedes_cliente_idx on public.usuario_sedes(cliente_id);
create index if not exists usuario_sedes_sede_idx on public.usuario_sedes(sede_id);
create index if not exists usuario_sedes_user_idx on public.usuario_sedes(user_id);
alter table public.usuario_sedes enable row level security;
drop policy if exists usuario_sedes_read on public.usuario_sedes;
create policy usuario_sedes_read on public.usuario_sedes for select to authenticated using (authz.has_org_role(cliente_id,array['owner','admin','supervisor','auditor']) or user_id=(select auth.uid()));
drop policy if exists usuario_sedes_manage on public.usuario_sedes;
create policy usuario_sedes_manage on public.usuario_sedes for all to authenticated using (authz.has_org_role(cliente_id,array['owner','admin'])) with check (authz.has_org_role(cliente_id,array['owner','admin']));
create or replace function public.set_usuario_sedes_updated_at() returns trigger language plpgsql set search_path=public as $$ begin new.updated_at=now(); return new; end $$;
drop trigger if exists usuario_sedes_updated_at on public.usuario_sedes;
create trigger usuario_sedes_updated_at before update on public.usuario_sedes for each row execute function public.set_usuario_sedes_updated_at();
revoke all on function public.set_usuario_sedes_updated_at() from public,anon,authenticated;
