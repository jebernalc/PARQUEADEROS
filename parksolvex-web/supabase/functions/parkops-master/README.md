# parkops-master v3

Edge Function central para PARKOPS Android y PARKSOLVEX Web.

Compatibilidad mantenida con el generador de licencias existente:

- `claim_owner_account`
- `owner_bootstrap`
- `owner_dashboard`
- `create_owner_customer`
- `issue_license`
- `revoke_license`
- `activate_license`

Nuevas acciones PARKSOLVEX:

- `device_bootstrap`: devuelve organización, sede, configuración, tarifas y medios de pago de una licencia válida.
- `sync_push`: sincroniza `pqe_cfg`, `pqe_tarifas`, `pqe_clientes`, `pqe_ingresos` y `pqe_mens` desde el almacenamiento local.
- `sync_pull`: obtiene cambios cloud para reconstruir/sincronizar el estado local.
- `tenant_bootstrap`: obtiene organizaciones y roles del usuario autenticado.
- `tenant_dashboard`: datos operativos y configuración de una organización/sede.
- `tenant_list_users`: lista usuarios de la organización.
- `tenant_invite_user`: invita por correo y asigna rol.
- `tenant_set_user`: cambia rol/estado/datos del usuario.

## Licencias

`issue_license` sigue aceptando `organization_id`, `device_id` y `plan_code` como antes. El backend detecta automáticamente si un `device_id` comienza por `WEB-` y marca la licencia como web. Para Android mantiene el comportamiento histórico.

## Seguridad

La función mantiene `verify_jwt=false` únicamente porque `activate_license`, `device_bootstrap`, `sync_push` y `sync_pull` usan autenticación propia de licencia + device_id. Las acciones administrativas exigen Bearer JWT de Supabase Auth y validan `platform_owners` o el rol de la organización.
