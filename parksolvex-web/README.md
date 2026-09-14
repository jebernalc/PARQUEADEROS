# PARKSOLVEX WEB

Proyecto web derivado del núcleo oficial PARKOPS v1.5.3, separado de la APK Android.

Objetivos principales:
- Mantener la interfaz y funciones reales de PARKOPS v1.5.3.
- Funcionar en Chrome, Edge, Safari y Firefox.
- Reutilizar el mismo generador de licencias y la misma lógica de activación.
- Soportar licencias Android y Web mediante el mismo backend.
- Añadir multiempresa, sedes, usuarios, roles y sincronización cloud/offline.
- Mantener la APK oficial sin modificaciones mientras evoluciona la web.

Roles previstos: owner, admin, supervisor, operador y auditor.

La web conservará localStorage como capa offline y sincronizará la operación con Supabase cuando exista conexión.

Este directorio es staging hasta que exista el repositorio independiente PARKSOLVEX-WEB. No modifica el build de la APK Android.
