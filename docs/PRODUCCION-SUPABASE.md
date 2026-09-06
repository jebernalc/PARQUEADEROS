# PARKOPS Enterprise — salida a producción

La web y la APK deben consumir el mismo proyecto Supabase. Ambas usan solamente la clave pública anon; la clave service_role nunca se publica en GitHub ni se incluye en el APK.

## Activación

1. Crear el proyecto Supabase.
2. Ejecutar supabase/migrations/202609060001_parkops_core.sql en SQL Editor.
3. Copiar .env.example a .env.local y completar URL y clave pública.
4. Crear en GitHub Actions los secretos VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.
5. Crear el primer administrador en Authentication y asignarlo a memberships.
6. Activar MFA, SMTP propio, copias de seguridad y protección contra contraseñas filtradas.

## Roles

| Rol | Alcance |
|---|---|
| platform_owner | Administración comercial global |
| tenant_admin | Empresa, sedes, usuarios, planes y tarifas |
| auditor | Lectura completa y exportaciones |
| supervisor | Operación y cierres |
| operator | Ingresos, patio y llaves |
| cashier | Liquidación, pago y salida |
| viewer | Tableros de solo lectura |

## Planes

El esquema incluye prueba de 15 días, mensual, anual y vitalicio. Los precios se administran en plans y cada cliente tiene su vigencia en subscriptions.

## Controles previos a producción

- Dominio HTTPS y política de privacidad.
- Invitaciones mediante función segura; nunca guardar contraseñas.
- Webhooks firmados e idempotentes para pagos.
- Firma release del APK protegida como secreto.
- Pruebas de roles, concurrencia, doble cobro, pérdida de red y restauración.
- Auditoría inmutable y copias de seguridad verificadas.
