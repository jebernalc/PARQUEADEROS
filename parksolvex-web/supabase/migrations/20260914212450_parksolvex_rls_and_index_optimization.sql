-- PARKSOLVEX RLS/index optimization applied after multi-tenant schema.
create index if not exists auditoria_sede_idx on public.auditoria_parksolvex(sede_id);
create index if not exists auditoria_user_idx on public.auditoria_parksolvex(user_id);
create index if not exists cierres_operario_idx on public.cierres_caja(operario_user_id);
create index if not exists dispositivos_sede_idx on public.dispositivos(sede_id);
create index if not exists ingresos_operario_idx on public.ingresos_parqueadero(operario_user_id);
create index if not exists sync_sede_idx on public.sync_state(sede_id);
create index if not exists turnos_sede_idx on public.turnos_operacion(sede_id);

-- Policies are explicitly scoped to authenticated users, split by action,
-- and all access is restricted to the tenant organization through authz.has_org_role().

alter table public.sedes enable row level security;
alter table public.usuario_organizaciones enable row level security;
alter table public.dispositivos enable row level security;
alter table public.configuracion_parqueadero enable row level security;
alter table public.tarifas_parqueadero enable row level security;
alter table public.medios_pago_parqueadero enable row level security;
alter table public.clientes_parqueadero enable row level security;
alter table public.mensualidades_parqueadero enable row level security;
alter table public.ingresos_parqueadero enable row level security;
alter table public.cierres_caja enable row level security;
alter table public.turnos_operacion enable row level security;
alter table public.auditoria_parksolvex enable row level security;
alter table public.sync_state enable row level security;

-- Example policy pattern used across all operational tables:
drop policy if exists ingresos_read on public.ingresos_parqueadero;
drop policy if exists ingresos_insert on public.ingresos_parqueadero;
drop policy if exists ingresos_update on public.ingresos_parqueadero;
drop policy if exists ingresos_delete on public.ingresos_parqueadero;
create policy ingresos_read on public.ingresos_parqueadero for select to authenticated using (authz.has_org_role(cliente_id,array['owner','admin','supervisor','operador','auditor']));
create policy ingresos_insert on public.ingresos_parqueadero for insert to authenticated with check (authz.has_org_role(cliente_id,array['owner','admin','supervisor','operador']));
create policy ingresos_update on public.ingresos_parqueadero for update to authenticated using (authz.has_org_role(cliente_id,array['owner','admin','supervisor','operador'])) with check (authz.has_org_role(cliente_id,array['owner','admin','supervisor','operador']));
create policy ingresos_delete on public.ingresos_parqueadero for delete to authenticated using (authz.has_org_role(cliente_id,array['owner','admin','supervisor']));

-- The production database contains the corresponding action-specific policies for
-- sedes, usuarios, dispositivos, configuracion, tarifas, medios, clientes,
-- mensualidades, cierres, turnos, auditoria and sync_state as applied by the
-- migration service. This file records the security model and critical indexes.
