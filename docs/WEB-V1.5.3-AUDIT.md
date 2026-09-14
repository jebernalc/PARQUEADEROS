# PARKOPS Web v1.5.3 — auditoría de paridad con APK

Esta publicación web se construye desde el mismo núcleo HTML/JavaScript usado por la APK PARKOPS v1.5.3 aprobada.

## Regla de paridad

El workflow reconstruye primero el `assets/index.html` de la APK y valida sus hashes antes de añadir cualquier adaptación exclusiva del navegador.

- Base autoritativa sin extensión: `ca465ce85dcdd084aee889972e931716366ae8402ac48e1f562a05e709d26407`
- Capa funcional v1.5.3: `web/parkops-v1.5.1.js`, SHA-256 `d4b513841ff88e6f958c431fffc72825777fda4db89e90c3f1cfff77e0950818`
- Núcleo final equivalente a `assets/index.html` de APK v1.5.3: `2ae5261f8ceae9af99a3cf4cec7cea2d1c1254cb8a3a2323c667a0335589627e`

La APK no se modifica para construir la versión web. Las adaptaciones de navegador se agregan únicamente después de validar el núcleo exacto.

## Funciones verificadas

Se validan automáticamente: ingreso con/sin WhatsApp, liquidación y salida, patio, caja, CSV, cierre por WhatsApp, carro/moto/bicicleta/patineta, recarga eléctrica, mensualidades, tarifas, reglas, datos del parqueadero, plantillas de recibo, medios de pago, Bre-B, respaldo/restauración, borrado de datos, indicador ONLINE/OFFLINE y contingencia.

## Diferencias inevitables entre APK y navegador

La APK usa un `ANDROID_ID` para licenciamiento; la web usa un ID persistente generado por navegador (`WEB-...`). La web también agrega un Service Worker para poder abrir la aplicación después de una primera carga y una capa de compatibilidad para descarga de archivos. Estas capas no cambian la lógica operativa del PARKOPS original.

Los datos operativos siguen usando `localStorage`, exactamente como el núcleo actual. Por lo tanto, los registros de un navegador no aparecen automáticamente en otro dispositivo. La sincronización multi-dispositivo con Supabase es una evolución posterior y no forma parte de esta conversión de paridad.
