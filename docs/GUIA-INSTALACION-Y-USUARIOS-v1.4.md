# PARKOPS SOLVEX — Guía de instalación y generación de clientes/licencias

Versiones de esta entrega:

- **PARKOPS cliente Android:** v1.4.0 (`com.solvex.parkops`)
- **SOLVEX Owner License Manager:** v1.2.0 (`com.solvex.parkops.owner`)
- **Backend de licencias:** Supabase Edge Function `parkops-master`

## 1. Arquitectura

La solución utiliza dos aplicaciones Android diferentes:

1. **SOLVEX Owner License Manager**: aplicación privada del propietario/administrador. Permite iniciar sesión, recuperar la contraseña, registrar clientes, generar licencias, buscar licencias anteriores, reenviarlas por WhatsApp y cancelarlas.
2. **PARKOPS**: aplicación que se instala en el dispositivo del cliente. Al abrirse por primera vez muestra el `ANDROID_ID`; ese ID se usa para generar una licencia vinculada al dispositivo.

Los clientes y las licencias se almacenan en Supabase en las tablas `clientes` y `licencias`. El usuario final de PARKOPS no necesita una cuenta de Supabase ni contraseña propia: se activa mediante su licencia y su dispositivo.

## 2. Instalación del administrador

Instala `SOLVEX-OWNER-LICENSE-MANAGER-v1.2.0.apk` en el teléfono que administrará clientes y licencias.

Si Android bloquea el APK, habilita temporalmente **Instalar aplicaciones desconocidas** para la aplicación desde la que abriste el archivo (Chrome, Archivos, etc.). Después de instalar puedes volver a desactivar ese permiso.

La URL y la clave pública de Supabase ya están configuradas dentro de la APK. En la pantalla de acceso solamente debes introducir el correo del propietario y su contraseña.

### Recuperación de contraseña

Pulsa **RECUPERAR CONTRASEÑA**. La APK solicita a Supabase el envío del correo de recuperación. Revisa también Spam/Correo no deseado. La contraseña anterior nunca se muestra: el flujo crea una contraseña nueva mediante el enlace seguro de Supabase.

## 3. Instalación de PARKOPS en un cliente

Instala `PARKOPS-SOLVEX-LICENSED-v1.4.0.apk` en el teléfono Android del cliente.

Al abrir PARKOPS por primera vez aparecerá la pantalla **Activación PARKOPS**. Pulsa **Copiar ID del dispositivo** y envía ese ID al administrador.

## 4. Registrar un nuevo cliente

En SOLVEX Owner License Manager:

1. Pulsa **REGISTRAR NUEVO CLIENTE**.
2. Escribe nombre del propietario/cliente.
3. Escribe el celular con indicativo de país, por ejemplo `573001234567`.
4. El correo es opcional.
5. Pulsa **GUARDAR CLIENTE**.

Esto crea el registro en Supabase. No crea una contraseña ni una cuenta de Auth para el cliente; PARKOPS usa licencia por dispositivo.

## 5. Generar una licencia

1. En la APK del cliente copia el `ANDROID_ID`.
2. En Owner License Manager pulsa **GENERAR NUEVA LICENCIA** o entra al cliente y pulsa **NUEVA LICENCIA PARA ESTE CLIENTE**.
3. Pega el `ANDROID_ID` exactamente como fue entregado por PARKOPS.
4. Selecciona el plan:
   - `monthly`: 31 días.
   - `annual`: 366 días.
   - `lifetime`: vigencia operativa hasta 2099-12-31.
   - `custom`: indica el número de días.
5. Pulsa **GENERAR LICENCIA**.
6. Usa **ENVIAR POR WHATSAPP AL CLIENTE** o **COPIAR LICENCIA**.

La licencia utiliza un token aleatorio de alta entropía con prefijo `SVX2.` y queda registrada en Supabase junto al dispositivo, cliente, estado y vencimiento.

## 6. Activar PARKOPS

En el teléfono del cliente:

1. Pega la licencia recibida en la pantalla de activación.
2. Pulsa **Validar y activar**.
3. El teléfono debe tener Internet durante esta primera validación.
4. Supabase comprueba que la licencia existe, está activa, no está vencida y pertenece exactamente a ese `ANDROID_ID`.
5. Si todo coincide, se abre PARKOPS.

## 7. Reinstalación y recuperación de una licencia

En Owner License Manager entra a **CLIENTES Y LICENCIAS**. Puedes buscar por nombre, celular, ID del dispositivo, ID de licencia o clave.

Si el cliente reinstaló PARKOPS en el mismo dispositivo y conserva el mismo `ANDROID_ID`, pulsa **REENVIAR ESTA LICENCIA POR WHATSAPP**. No es necesario crear otra licencia.

Un restablecimiento de fábrica o determinados cambios del sistema Android pueden cambiar el `ANDROID_ID`. Si cambia, la licencia anterior no se activará en el nuevo ID y debe emitirse una nueva licencia conforme a la política comercial.

## 8. Cancelar una licencia

En **CLIENTES Y LICENCIAS**, pulsa **CANCELAR LICENCIA**. El backend cambia su estado a `cancelada`.

Una licencia cancelada no podrá activarse nuevamente ni utilizarse para una reinstalación. La versión v1.4.0 guarda localmente la fecha de vencimiento después de una activación correcta; por tanto, una cancelación administrativa no cierra de inmediato una instalación que ya estaba abierta/activada. Una versión futura puede añadir revalidación periódica en línea para revocación inmediata.

## 9. Seguridad implementada

- El `service_role` de Supabase no está dentro de ninguna APK ni en el repositorio público.
- Las tablas comerciales tienen RLS y están restringidas al propietario autorizado.
- Las acciones de administración de clientes/licencias requieren una sesión de Supabase Auth y pertenecer a `platform_owners`.
- El endpoint público solamente valida una clave de licencia de alta entropía junto con el ID exacto del dispositivo.
- La clave incluida en las APK es una **publishable key**, diseñada para uso en clientes; no concede privilegios administrativos por sí sola.

## 10. Estado de compilación

Las dos APK de esta entrega se compilan automáticamente con GitHub Actions y pasan verificaciones de integridad/seguridad del proyecto. Actualmente son APK **debug firmadas por GitHub Actions**, aptas para instalación y pruebas directas. Para distribución comercial estable o Play Store se debe configurar posteriormente un keystore de release persistente y protegido.
