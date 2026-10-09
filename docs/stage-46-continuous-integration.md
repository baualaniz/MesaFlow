# Etapa 46 — Integración continua

Estado: **implementada y validada localmente**. GitHub Actions ejecuta los mismos
controles que una persona debe aprobar antes de integrar cambios. No despliega,
no escribe en Firebase y no requiere secretos.

## Workflow

`.github/workflows/ci.yml` se activa en:

- cada pull request;
- cada actualización de `main`;
- una ejecución manual desde la pestaña Actions.

Usa permisos globales `contents: read`, cancela ejecuciones anteriores de la
misma rama y fija `ubuntu-24.04`. No se usa `pull_request_target`, por lo que el
código propuesto no recibe un token privilegiado ni secretos del repositorio.

### Calidad, seguridad y builds

El job `quality` instala exclusivamente desde `package-lock.json` y ejecuta:

1. `npm ci --ignore-scripts`;
2. `npm run check` para estructura, lint, pruebas, coberturas y builds;
3. `npm run security:audit` para exigir cero vulnerabilidades de producción y
   conservar acotado el único aviso dev aceptado.

### Emuladores y recorrido E2E

El job `e2e` comienza solo si `quality` fue exitoso. Prepara Java 21 y Chrome,
levanta Firebase Emulator Suite con `demo-mesaflow` y ejecuta
`npm run test:e2e`. El recorrido cubre las tres interfaces, Auth, Firestore,
Functions, Storage, Hosting, reglas y el flujo QR hasta el pago simulado.

## Herramientas reproducibles

- Node `24.19.0` en `.nvmrc`;
- npm `11.17.0` mediante `packageManager` y una instalación explícita;
- Java `21` en `.java-version`;
- Flutter `3.41.5` en `apps/customer/pubspec.yaml`.

Las cuatro acciones externas están ancladas a SHA completos, con la versión
humana anotada al lado. Así, mover una etiqueta remota no cambia el código que
ejecuta CI. Ocho pruebas estáticas fallan si desaparece un trigger, se amplían
permisos, se agrega un secreto o deploy, se usa una etiqueta mutable o se omite
alguno de los controles obligatorios.

## Protección recomendada de `main`

Después de observar una ejecución verde en GitHub, se recomienda crear una regla
de protección o ruleset para `main` que:

- exija pull request antes de integrar trabajo colaborativo;
- exija los checks `Calidad, seguridad y builds` y
  `Emuladores y recorrido E2E`;
- exija que la rama esté actualizada;
- bloquee force-push y eliminación.

Esta configuración se realiza en GitHub y no se automatiza desde el repositorio,
porque cambia permisos y reglas de colaboración de la cuenta.

## Verificación local

```powershell
npm.cmd run test:ci
npm.cmd run check
npm.cmd run test:e2e
```

## Criterio de cierre

- workflow versionado con triggers de PR, `main` y manual;
- permisos mínimos y ninguna referencia a secretos;
- toolchain y acciones reproducibles;
- lint, pruebas, coberturas, builds y auditoría en `quality`;
- flujo completo de Emulator Suite en `e2e`;
- ningún comando de despliegue o acceso a dev/prod.

La Etapa 47 continuará con el despliegue controlado a desarrollo. Antes de subir
Functions deberá completarse el alta de App Check documentada en la Etapa 45.
