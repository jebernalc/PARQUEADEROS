-- PARKSOLVEX WEB multi-tenant core
-- Applied to the existing PARKOPS commercial Supabase project.
-- Preserves clientes/licencias/pagos/platform_owners so the existing license generator remains compatible.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;

alter table public.clientes
  add column if not exists slug text,
  add column if not exists estado text not null default 'activo',
  add column if not exists timezone text not null default 'America/Bogota',
  add column if not exists moneda text not null default 'COP',
  add column if not exists settings jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();
create unique index if not exists clientes_slug_uidx on public.clientes(slug) where slug is not null;
create index if not exists clientes_estado_idx on public.clientes(estado);

drop trigger if exists trg_clientes_updated_at on public.clientes;
create trigger trg_clientes_updated_at before update on public.clientes for each row execute function public.set_updated_at();

alter table public.licencias
  add column if not exists app_target text not null default 'android',
  add column if not exists max_usuarios integer not null default 10,
  add column if not exists max_sedes integer not null default 1,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.sedes(
 id uuid primary key default gen_random_uuid(), cliente_id uuid not null references public.clientes(id) on delete cascade,
 nombre text not null,codigo text,direccion text,telefono text,nit text,activa boolean not null default true,
 timezone text not null default 'America/Bogota',created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(cliente_id,codigo));
create index if not exists sedes_cliente_idx on public.sedes(cliente_id);
drop trigger if exists trg_sedes_updated_at on public.sedes;
create trigger trg_sedes_updated_at before update on public.sedes for each row execute function public.set_updated_at();

create table if not exists public.usuario_organizaciones(
 id uuid primary key default gen_random_uuid(),cliente_id uuid not null references public.clientes(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 rol text not null check(rol in('owner','admin','supervisor','operador','auditor')),nombre text,celular text,activo boolean not null default true,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(cliente_id,user_id));
create index if not exists usuario_org_user_idx on public.usuario_organizaciones(user_id);
create index if not exists usuario_org_cliente_idx on public.usuario_organizaciones(cliente_id);
drop trigger if exists trg_usuario_org_updated_at on public.usuario_organizaciones;
create trigger trg_usuario_org_updated_at before update on public.usuario_organizaciones for each row execute function public.set_updated_at();

create table if not exists public.dispositivos(
 id uuid primary key default gen_random_uuid(),cliente_id uuid not null references public.clientes(id) on delete cascade,
 sede_id uuid references public.sedes(id) on delete set null,licencia_id uuid references public.licencias(id) on delete set null,
 device_id text not null,tipo text not null default 'android' check(tipo in('android','web','ios','browser','other')),
 nombre text,estado text not null default 'activo' check(estado in('activo','suspendido','revocado')),last_seen_at timestamptz,
 app_version text,metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(cliente_id,device_id));
create index if not exists dispositivos_cliente_idx on public.dispositivos(cliente_id);
create index if not exists dispositivos_licencia_idx on public.dispositivos(licencia_id);
drop trigger if exists trg_dispositivos_updated_at on public.dispositivos;
create trigger trg_dispositivos_updated_at before update on public.dispositivos for each row execute function public.set_updated_at();

create table if not exists public.configuracion_parqueadero(
 id uuid primary key default gen_random_uuid(),cliente_id uuid not null references public.clientes(id) on delete cascade,
 sede_id uuid not null references public.sedes(id) on delete cascade,nombre text not null default 'Parqueadero',nit text,direccion text,telefono text,
 prefijo text not null default 'PQ-',consecutivo bigint not null default 1001,gracia_min integer not null default 0,redondeo numeric not null default 50,
 sello_oro boolean not null default false,recarga jsonb not null default '{"modo":"kwh","valor":1300,"conexion":0,"mes":60000}'::jsonb,
 plantilla_ingreso text,plantilla_pago text,raw_cfg jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(sede_id));
create index if not exists configuracion_cliente_idx on public.configuracion_parqueadero(cliente_id);
drop trigger if exists trg_config_updated_at on public.configuracion_parqueadero;
create trigger trg_config_updated_at before update on public.configuracion_parqueadero for each row execute function public.set_updated_at();

create table if not exists public.tarifas_parqueadero(
 id uuid primary key default gen_random_uuid(),cliente_id uuid not null references public.clientes(id) on delete cascade,sede_id uuid not null references public.sedes(id) on delete cascade,
 tipo_vehiculo text not null check(tipo_vehiculo in('carro','moto','bicicleta','patineta')),valor_minuto numeric not null default 0,tope_dia numeric not null default 0,
 mensualidad numeric not null default 0,activa boolean not null default true,raw_tarifa jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(sede_id,tipo_vehiculo));
create index if not exists tarifas_cliente_idx on public.tarifas_parqueadero(cliente_id);
drop trigger if exists trg_tarifas_updated_at on public.tarifas_parqueadero;
create trigger trg_tarifas_updated_at before update on public.tarifas_parqueadero for each row execute function public.set_updated_at();

create table if not exists public.medios_pago_parqueadero(
 id uuid primary key default gen_random_uuid(),cliente_id uuid not null references public.clientes(id) on delete cascade,sede_id uuid not null references public.sedes(id) on delete cascade,
 codigo text not null,nombre text not null,activo boolean not null default true,dato text,enlace text,app_package text,key_type text,holder text,orden integer not null default 0,
 metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(sede_id,codigo));
create index if not exists medios_pago_cliente_idx on public.medios_pago_parqueadero(cliente_id);
drop trigger if exists trg_medios_pago_updated_at on public.medios_pago_parqueadero;
create trigger trg_medios_pago_updated_at before update on public.medios_pago_parqueadero for each row execute function public.set_updated_at();

create table if not exists public.clientes_parqueadero(
 id uuid primary key default gen_random_uuid(),cliente_id uuid not null references public.clientes(id) on delete cascade,sede_id uuid not null references public.sedes(id) on delete cascade,
 placa text not null,nombre text,celular text,tipo_vehiculo text check(tipo_vehiculo in('carro','moto','bicicleta','patineta')),metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(sede_id,placa));
create index if not exists clientes_parqueadero_cliente_idx on public.clientes_parqueadero(cliente_id);
create index if not exists clientes_parqueadero_placa_idx on public.clientes_parqueadero(placa);
drop trigger if exists trg_clientes_parqueadero_updated_at on public.clientes_parqueadero;
create trigger trg_clientes_parqueadero_updated_at before update on public.clientes_parqueadero for each row execute function public.set_updated_at();

create table if not exists public.mensualidades_parqueadero(
 id uuid primary key default gen_random_uuid(),cliente_id uuid not null references public.clientes(id) on delete cascade,sede_id uuid not null references public.sedes(id) on delete cascade,
 placa text not null,desde date not null,hasta date not null,valor numeric not null default 0,incluye_recarga boolean not null default false,tipo_vehiculo text,nombre text,celular text,
 estado text not null default 'activa' check(estado in('activa','vencida','cancelada')),metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists mensualidades_cliente_idx on public.mensualidades_parqueadero(cliente_id);
create index if not exists mensualidades_placa_idx on public.mensualidades_parqueadero(sede_id,placa,hasta);
drop trigger if exists trg_mensualidades_updated_at on public.mensualidades_parqueadero;
create trigger trg_mensualidades_updated_at before update on public.mensualidades_parqueadero for each row execute function public.set_updated_at();

create table if not exists public.ingresos_parqueadero(
 id uuid primary key default gen_random_uuid(),cliente_id uuid not null references public.clientes(id) on delete cascade,sede_id uuid not null references public.sedes(id) on delete cascade,
 local_id text,recibo text not null,placa text not null,tipo_vehiculo text not null check(tipo_vehiculo in('carro','moto','bicicleta','patineta')),electrico boolean not null default false,
 kwh numeric not null default 0,nombre text,celular text,observaciones text,entrada_at timestamptz not null,salida_at timestamptz,valor_total numeric,valor_parqueo numeric,
 valor_recarga numeric,medio_pago text,operario text,operario_user_id uuid references auth.users(id) on delete set null,
 estado text not null default 'en_patio' check(estado in('en_patio','pagado','salida','anulado')),sync_source text not null default 'web',device_id text,
 raw_record jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(sede_id,recibo));
create index if not exists ingresos_cliente_idx on public.ingresos_parqueadero(cliente_id);
create index if not exists ingresos_sede_estado_idx on public.ingresos_parqueadero(sede_id,estado);
create index if not exists ingresos_placa_idx on public.ingresos_parqueadero(sede_id,placa);
create index if not exists ingresos_entrada_idx on public.ingresos_parqueadero(sede_id,entrada_at desc);
drop trigger if exists trg_ingresos_updated_at on public.ingresos_parqueadero;
create trigger trg_ingresos_updated_at before update on public.ingresos_parqueadero for each row execute function public.set_updated_at();

create table if not exists public.cierres_caja(
 id uuid primary key default gen_random_uuid(),cliente_id uuid not null references public.clientes(id) on delete cascade,sede_id uuid not null references public.sedes(id) on delete cascade,
 fecha_desde timestamptz not null,fecha_hasta timestamptz not null,total numeric not null default 0,total_parqueo numeric not null default 0,total_recarga numeric not null default 0,
 total_mensualidades numeric not null default 0,detalle_medios jsonb not null default '{}'::jsonb,operario_user_id uuid references auth.users(id) on delete set null,
 operario text,metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now());
create index if not exists cierres_cliente_idx on public.cierres_caja(cliente_id);
create index if not exists cierres_sede_fecha_idx on public.cierres_caja(sede_id,fecha_hasta desc);

create table if not exists public.turnos_operacion(
 id uuid primary key default gen_random_uuid(),cliente_id uuid not null references public.clientes(id) on delete cascade,sede_id uuid not null references public.sedes(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,inicio_at timestamptz not null default now(),fin_at timestamptz,
 estado text not null default 'abierto' check(estado in('abierto','cerrado','anulado')),apertura_caja numeric not null default 0,cierre_caja numeric,notas text,created_at timestamptz not null default now());
create index if not exists turnos_cliente_idx on public.turnos_operacion(cliente_id);
create index if not exists turnos_user_idx on public.turnos_operacion(user_id,inicio_at desc);

create table if not exists public.auditoria_parksolvex(
 id bigint generated always as identity primary key,cliente_id uuid references public.clientes(id) on delete cascade,sede_id uuid references public.sedes(id) on delete set null,
 user_id uuid references auth.users(id) on delete set null,device_id text,accion text not null,entidad text,entidad_id text,payload jsonb not null default '{}'::jsonb,created_at timestamptz not null default now());
create index if not exists auditoria_cliente_idx on public.auditoria_parksolvex(cliente_id,created_at desc);

create table if not exists public.sync_state(
 id uuid primary key default gen_random_uuid(),cliente_id uuid not null references public.clientes(id) on delete cascade,sede_id uuid references public.sedes(id) on delete cascade,
 device_id text not null,last_push_at timestamptz,last_pull_at timestamptz,cursor_at timestamptz,app_version text,metadata jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now(),unique(cliente_id,device_id));

-- RLS and helper authorization functions are finalized in subsequent migrations.
