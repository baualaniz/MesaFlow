# Etapa 7 — Imágenes del MVP y Storage opcional

## Objetivo

Permitir imágenes en el MVP sin tarjeta ni servicio externo, y conservar una ruta
segura y probada para incorporar Cloud Storage más adelante si el producto lo
necesita.

## Estado de esta entrega

La etapa está completa sin activar facturación. El usuario eligió que el MVP use
imágenes empaquetadas dentro de la aplicación. El primer recurso vive en
`apps/customer/assets/images/mesa-demo.png` y funciona offline o desde Hosting.

Además, pasan ocho pruebas estáticas de política y rutas, más seis pruebas reales
contra los emuladores de Firestore y Storage. Este código no activa un bucket y se
conserva como extensión futura, sin bloquear ninguna función acordada del MVP.

## Estrategia activa del MVP

- Las aplicaciones distribuyen un catálogo finito de imágenes optimizadas.
- Los productos guardarán una clave lógica, por ejemplo `menu.burger-casa`, no el
  archivo ni una cadena Base64 en Firestore.
- El panel permitirá elegir una imagen del catálogo en la Etapa 35.
- Agregar o reemplazar imágenes implica una nueva versión del frontend.
- La carga arbitraria de archivos por el administrador queda fuera del MVP actual.

Esta limitación es deliberada: mantiene el recorrido completo demostrable, evita
facturación y elimina credenciales o presets de carga públicos.

## Rutas y permisos

| Ruta | Lectura | Escritura/eliminación |
|---|---|---|
| `establishments/{eid}/products/{productId}/{asset}` | Pública | Owner o manager activo del mismo `eid` |
| `establishments/{eid}/branding/{asset}` | Pública | Owner o manager activo del mismo `eid` |
| Cualquier otra ruta | Denegada | Denegada |

Las imágenes de producto y marca son contenido público del menú, no contienen
secretos ni datos personales. Conocer una ruta no permite subir, reemplazar ni
eliminar archivos. Las escrituras consultan la membresía del mismo tenant en
Firestore y exigen coincidencia de UID, rol y estado activo.

Cada carga debe cumplir simultáneamente:

- JPEG, PNG o WebP; SVG/GIF y otros tipos se rechazan.
- Tamaño entre 1 byte y 5 MiB.
- Nombre seguro de hasta 128 caracteres.
- Metadata `establishmentId` igual al tenant de la ruta.
- Metadata `uploadedByUid` igual al UID autenticado.

## Archivos

```text
storage.rules
firebase/storage-policy.json
firebase/tests/storage.rules.test.mjs
packages/contracts/src/storage.mjs
scripts/check-storage-config.mjs
scripts/storage-config.test.mjs
scripts/lib/storage-config.mjs
firebase.json
package.json
package-lock.json
```

`firebase.json` incorpora Storage Emulator en `127.0.0.1:9199`. El ejecutor sigue
fijado a `demo-mesaflow`; un servicio omitido no puede caer accidentalmente en la
nube. Las dependencias oficiales `firebase` y `@firebase/rules-unit-testing` están
fijadas para reproducir las pruebas.

## Cómo probar

Pruebas estáticas sin servicios:

```powershell
npm.cmd run check
```

Pruebas integradas locales:

```powershell
npm.cmd run test:emulators
```

El segundo comando inicia Auth, Firestore y Storage, prueba accesos positivos y
negativos, limpia datos/archivos y apaga los emuladores. No usa dev ni prod.

## Extensión futura — Cloud Storage

No hay acción manual pendiente. Si más adelante el usuario decide permitir cargas
dinámicas y autoriza Blaze expresamente, los valores previstos son:

- Bucket predeterminado: `mesaflow-desarrollo.firebasestorage.app`.
- Región: `southamerica-east1` / São Paulo.
- Clase: Standard.
- Reglas iniciales: restringidas; después se desplegará `storage.rules` de manera
  explícita y se aceptará únicamente el permiso cruzado necesario con Firestore.

No se debe crear el bucket solo para completar el MVP. La elección de región afecta
latencia, residencia y costos y deberá revisarse en el momento de activarlo.

## Verificación remota preparada

Solo después de una futura activación, este comando consultará nombre, región y
clase sin crear objetos ni desplegar reglas:

```powershell
npm.cmd run storage:check -- dev
```

Producción se comprueba reemplazando `dev` por `prod` solo cuando exista su bucket.

## Seguridad de dependencias

Las nuevas dependencias son exclusivamente de desarrollo. Se corrigió
`csv-parse` a 7.0.2. La auditoría conserva dos entradas moderadas que representan
un único aviso de DoS local en `stream-json`, transitivo de Firebase CLI. Forzar la
versión corregida rompió imports usados por la CLI y fue rechazado por pruebas.
MesaFlow no usa los comandos vulnerables con entradas no confiables; el análisis y
la mitigación están en `docs/tooling-security.md`.

## Criterio de aceptación

- [x] Rutas de imágenes por tenant definidas y compartidas.
- [x] Solo owner/manager activo del mismo tenant puede escribir o eliminar.
- [x] Tipo, tamaño, nombre y metadata validados por reglas.
- [x] Otras rutas y accesos cruzados denegados.
- [x] Storage Emulator incorporado al proyecto demo.
- [x] Ocho pruebas estáticas y seis pruebas de reglas aprobadas.
- [x] Estrategia sin tarjeta elegida y documentada.
- [x] Primer recurso empaquetado dentro de Flutter.
- [x] Bucket real y despliegue de reglas excluidos del MVP actual.
- [x] Producción permanece sin datos ni cambios de facturación.

## Commit sugerido

`feat(storage): add tenant image rules and emulator tests`

## Fuentes oficiales consultadas

- [Inicio de Cloud Storage para Firebase](https://firebase.google.com/docs/storage/web/start).
- [Cambios de bucket y facturación](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024).
- [Reglas Storage y consultas a Firestore](https://firebase.google.com/docs/reference/security/storage).
- [Conexión al Storage Emulator](https://firebase.google.com/docs/emulator-suite/connect_storage).
