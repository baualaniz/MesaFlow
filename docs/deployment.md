# Despliegue y rollback

MesaFlow separa emulador, desarrollo y producción. Desarrollo sigue siendo el
alias predeterminado; todos los comandos que escriben cloud exigen el proyecto
explícito y guardas adicionales.

## Estado actual

| Recurso | Desarrollo | Producción |
|---|---|---|
| Authentication/Firestore | Configurados | Configurados |
| Rules e índices | Publicados | Publicados |
| Cliente/panel/landing | Publicados | Publicados |
| App Check | Registrado | Registrado |
| Functions/webhooks | No desplegados | No desplegados |

El alcance cloud actual no requiere Blaze. QR, pedidos, asistencia, Mercado Pago
y WhatsApp se ejecutan de punta a punta en Emulator Suite hasta que exista una
autorización separada para facturación y secretos.

## Builds

```powershell
npm.cmd run hosting:build:dev
npm.cmd run hosting:build:prod
```

Los builds productivos exigen la clave pública App Check solo en la sesión del
proceso. Nunca se guarda en un archivo versionado.

## Preflight y despliegue protegido

```powershell
npm.cmd run deploy:check:dev
npm.cmd run deploy:check:prod
```

Los scripts de publicación verifican árbol Git reproducible, proyecto, targets,
App Check y frases de confirmación. Los comandos exactos y las decisiones de cada
ambiente están en `docs/stage-47-development-deployment.md` y
`docs/stage-48-production-domain.md`.

No usar `firebase deploy` sin filtros: podría ampliar el alcance e incluir
Functions accidentalmente.

## Smoke posterior

```powershell
npm.cmd run deploy:smoke:dev
npm.cmd run deploy:smoke:prod
```

Además se comprueba visualmente:

- cliente y su ruta `/e/{slug}/table/{tableId}`;
- panel y su ruta `/login`;
- landing, enlaces y 404;
- ausencia de errores críticos en consola.

## Rollback

Para Hosting, abrir Firebase Console → Hosting → sitio → historial de versiones,
seleccionar la última versión estable y ejecutar **Rollback**. Repetir por cada
sitio afectado y luego correr el smoke correspondiente.

Las Rules no tienen rollback automático desde Hosting. Se recupera la versión
anterior desde Git, se revisa en un checkout limpio y se vuelve a desplegar con
el script protegido. Los índices se tratan como cambios compatibles y no se
eliminan durante una incidencia sin analizar las consultas activas.

## URLs

- Desarrollo: `mesaflow-desarrollo.web.app`,
  `mesaflow-desarrollo-admin.web.app`,
  `mesaflow-desarrollo-landing.web.app`.
- Producción: `mesaflow-produccion.web.app`,
  `mesaflow-produccion-admin.web.app`,
  `mesaflow-produccion-landing.web.app`.

