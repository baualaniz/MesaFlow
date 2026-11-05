# Etapa 54 — Entrega académica conectada a producción

Estado: **completa, publicada y verificada en `mesaflow-produccion`**.

Esta etapa migra la entrega para la presentación desde desarrollo al proyecto
Firebase de producción. Cliente Web/PWA, panel administrativo y Android usan
Authentication y Firestore de `mesaflow-produccion`. El proyecto
`mesaflow-desarrollo` queda como ambiente de pruebas y ya no es el entregable.

## Sitios definitivos

- Cliente y PWA para iPhone: `https://mesaflow-produccion.web.app`
- Panel: `https://mesaflow-produccion-admin.web.app`
- Landing: `https://mesaflow-produccion-landing.web.app`
- Mesas: `https://mesaflow-produccion-admin.web.app/operacion/mesas`
- Pedidos: `https://mesaflow-produccion-admin.web.app/operacion/pedidos`

El acceso del panel y los enlaces que contienen tokens QR no se guardan en Git:

- `dist/academic-firebase-production/acceso-panel.txt`
- `dist/academic-firebase-production/usuarios-panel.txt`
- `dist/academic-firebase-production/enlaces-qr.txt`
- `dist/academic-firebase-production/mesa-01.png` a `mesa-03.png`

Se deben usar únicamente estos QR de producción. Los archivos de
`dist/academic-firebase` pertenecen a desarrollo.

## Usuarios por rol

Producción incluye cuentas académicas independientes para los roles `owner`,
`manager`, `staff` y `kitchen`. Sus contraseñas no se versionan: la hoja local
completa se genera en `dist/academic-firebase-production/usuarios-panel.txt`.
El alta idempotente se repite, si fuera necesario, definiendo temporalmente
`MESAFLOW_ACADEMIC_PASSWORD` y ejecutando:

```powershell
npm.cmd run firebase:users:academic:prod
```

El script exige el selector productivo, crea los perfiles y membresías en
Firestore y verifica que cada identidad pueda leer únicamente su acceso.

## Android

El APK definitivo está en:

`dist/MesaFlow-Produccion-Android.apk`

SHA-256:

`646279D8EBF23E48F3836C53BEBCE9A53F6E92DF94A076CBB32172F4B4FAE38B`

La compilación usa:

- proyecto: `mesaflow-produccion`;
- app Firebase Android: `1:619377674437:android:9a59bdffe51ea7b2a288ac`;
- paquete Android: `com.mesaflow.demo`;
- App Link: `mesaflow-produccion.web.app`.

## iPhone y iPad

iOS no usa archivos APK. La entrega elegida para iPhone es la PWA: abrir el
cliente productivo en Safari, tocar **Compartir** y luego **Agregar a inicio**.
Los QR de producción abren esa misma aplicación. Una IPA nativa requeriría macOS,
Xcode, firma de Apple y otro proceso de distribución.

## Alcance del pago

La aplicación está conectada a Firebase producción, pero Checkout Pro permanece
en Mercado Pago sandbox. Esto permite demostrar la redirección y el flujo sin
cobrar dinero real ni requerir credenciales productivas de pago.

## Evidencia ejecutada

1. Se cargaron usuario, establecimiento, catálogo, tres mesas, sesiones y QR en
   Firestore producción.
2. Se publicaron las reglas Firestore y los tres sitios Hosting productivos.
3. Se rotó Mesa 1: el QR anterior y su participación perdieron acceso de forma
   inmediata.
4. El QR nuevo abrió Mesa 1, creó un pedido persistente y el panel productivo lo
   mostró.
5. `assetlinks.json` confirmó el paquete Android asociado al dominio productivo.
6. Flutter aprobó análisis y 90 pruebas; el panel aprobó 77 pruebas.

Controles repetibles:

```powershell
npm.cmd run academic:smoke:revocation:prod
npm.cmd run academic:smoke:hosting:prod
npm.cmd run academic:smoke:users:prod
```

El primer control rota Mesa 1 y reemplaza su PNG/enlace productivo. Después de
ejecutarlo, no se debe volver a usar una copia anterior de ese QR.
