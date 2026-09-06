# PARKOPS Web SaaS · Producción

## Consolas
- `/admin/`: administrador de cada parqueadero. Gestiona usuarios, sedes y dispositivos de su organización.
- `/owner/`: consola maestra SOLVEX. Crea clientes, asigna plan, invita administrador inicial y emite licencias RSA por ANDROID_ID.

## Seguridad
La clave privada RSA nunca se publica en GitHub Pages ni en el APK. Debe existir únicamente como secreto `SOLVEX_LICENSE_PRIVATE_KEY` de la Edge Function `parkops-master`. La función usa `SUPABASE_SERVICE_ROLE_KEY` solo del lado servidor.

## Base de datos
Aplicar en orden las migraciones de `supabase/migrations/`. La migración `202609060002_saas_license_control.sql` agrega propietarios de plataforma, instalaciones y licencias.

Después de crear el usuario propietario en Supabase Auth, habilitarlo una sola vez:
```sql
insert into public.platform_owners(user_id)
select id from auth.users where email='CORREO_PROPIETARIO'
on conflict(user_id) do update set active=true;
```

## Edge Function
Desplegar `supabase/functions/parkops-master/index.ts` y configurar secretos:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SOLVEX_LICENSE_PRIVATE_KEY` (PKCS#8 PEM; nunca exponer al navegador)

## GitHub Pages
En Settings > Secrets and variables > Actions > Variables configurar:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

El workflow `.github/workflows/pages.yml` publica las dos consolas. La ANON key es pública por diseño y la seguridad real depende de RLS + autenticación; la SERVICE ROLE y la clave RSA jamás deben estar en variables públicas.

## Flujo comercial
1. SOLVEX entra a `/owner/`.
2. Crea el cliente/organización y selecciona prueba, mensual, anual o vitalicio.
3. El sistema invita al primer `tenant_admin`.
4. El administrador entra a `/admin/` y crea supervisores, operadores, caja y consulta.
5. La APK muestra su `ANDROID_ID`; SOLVEX lo registra en `/owner/` y genera una licencia firmada.
6. La licencia queda auditada en `license_issuances` y asociada a `app_installations`.

## Antes de producción comercial
Configurar precios reales en `plans.price_cop`, dominio personalizado si aplica, correo SMTP de Supabase para invitaciones y política de copias de seguridad. Para revocación en línea inmediata de APKs se recomienda una siguiente versión Android que consulte periódicamente `license_issuances`; la v1.1.0 actual valida firma, dispositivo y vencimiento de forma local.
