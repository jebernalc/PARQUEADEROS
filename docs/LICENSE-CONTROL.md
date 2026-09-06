# PARKOPS SOLVEX · Control de licencias v1.1.0

Baseline recuperada desde la APK entregada el 2026-09-06.

SHA-256 de la APK base: `a08d376b3798ad689bf5e4e83df98d2b6351ec3bab6a3a7efdcbe332965cc3d9`.

Esta versión elimina el QR, elimina la captura de celular del cliente y elimina el número Nequi fijo. Los datos generales del establecimiento permanecen configurables para cada usuario.

La activación Android usa una licencia firmada RSA vinculada a `usuario + ANDROID_ID + plan + vencimiento`. La APK contiene únicamente la clave pública. La clave privada del creador NO debe almacenarse en GitHub, Actions, la APK ni repositorios públicos.

Planes soportados por `tools/license_generator.py`: `monthly`, `annual` y `lifetime`.

Ejemplo de emisión desde el equipo seguro del creador:

```bash
python tools/license_generator.py --user CLIENTE-001 --device ANDROID_ID --plan annual --private-key /ruta/segura/solvex_license_private.pem
```

El workflow `.github/workflows/build-apk.yml` valida que la baseline licenciada no contenga los campos/valores retirados y genera el artefacto `PARKOPS-SOLVEX-LICENSED-v1.1.0`.
