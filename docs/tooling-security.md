# Seguridad de herramientas — Etapa 4

## Alcance

Firebase CLI 15.28.2 se incorpora como dependencia **de desarrollo**, fijada en el
lockfile. No forma parte del frontend ni del futuro paquete desplegado de
Functions. La CLI global del usuario no se modifica con estos overrides.

## Correcciones aplicadas

La auditoría inicial reportó ocho entradas moderadas derivadas de tres paquetes.
Se comprobaron los usos concretos antes de fijar versiones compatibles:

| Dependencia bajo Firebase CLI | Versión corregida | Verificación |
|---|---|---|
| `qs` | `6.16.0` | Parsing usado por Express, más Auth/Firestore locales |
| `gaxios@6.7.1 → uuid` | `11.1.1` | Importación CommonJS y API `v4` usada por gaxios |
| `@google-cloud/pubsub → @opentelemetry/core` | `2.8.0` | Importación PubSub y roundtrip W3CTraceContextPropagator |
| `csv-parse` | `7.0.2` | API `parse` usada por importación Auth de Firebase CLI |

Los overrides están limitados al árbol de `firebase-tools`; no fuerzan versiones
para futuros paquetes de aplicación. Los saltos de major de uuid/core se validan
en las APIs usadas por los consumidores examinados, no se asume compatibilidad
universal. El smoke test de la suite pasó después de aplicar las correcciones.

## Reproducibilidad

```powershell
npm.cmd ci --ignore-scripts
npm.cmd run check
npm.cmd run test:emulators
npm.cmd audit
```

Esta etapa no necesita scripts de instalación de dependencias. Antes de agregar
builds con herramientas nativas se revisará el uso de `--ignore-scripts`.

Avisos examinados en el informe npm: [qs (isBuffer)](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g),
[qs (array-limit)](https://github.com/advisories/GHSA-x5fp-wj9c-mxmx),
[uuid](https://github.com/advisories/GHSA-w5hq-g745-h8pq) y
[OpenTelemetry Core](https://github.com/advisories/GHSA-8988-4f7v-96qf).

Una auditoría posterior en la Etapa 7 detectó un aviso moderado de denegación de
servicio local en `stream-json`, dependencia de desarrollo de Firebase CLI. La
versión corregida disponible cambia a ESM y rompe las rutas CommonJS que usa la
CLI fijada; la prueba de compatibilidad detectó esa rotura. `npm audit fix --force`
propone degradar Firebase CLI a 10.1.1, lo que tampoco es aceptable.

El riesgo queda acotado a la herramienta local y a procesar JSON profundamente
anidado no confiable en comandos de importación/framework que MesaFlow no usa. No
forma parte de las aplicaciones ni de Functions. Hasta que Firebase CLI actualice
su dependencia, no se deben importar archivos RTDB/Auth/Next de origen no confiable.
La auditoría actual reporta dos entradas moderadas vinculadas al mismo hallazgo,
sin vulnerabilidades altas o críticas. El aviso es
[stream-json](https://github.com/advisories/GHSA-528h-pc64-c93x).

La auditoría se repitió en la Etapa 8 después de incorporar Firebase Admin,
Firebase Functions, TypeScript y ESLint. No aparecieron avisos nuevos: las dos
entradas moderadas siguen correspondiendo únicamente al mismo árbol local de
Firebase CLI descrito arriba.

## Revisión futura

Al actualizar Firebase CLI, comprobar si el proveedor ya incorpora estas
correcciones. Retirar cada override únicamente después de una nueva auditoría,
tests de compatibilidad y emuladores. Para producción se auditarán por separado
las dependencias del backend y aplicaciones.
