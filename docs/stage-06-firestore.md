# Etapa 6 — Cloud Firestore

## Objetivo

Crear una base Firestore real y separada en cada ambiente, fijar su ubicación y
edición, formalizar el esquema raíz multiestablecimiento y validar una operación
temporal únicamente en desarrollo.

## Estado de esta entrega

La configuración, el manifiesto de colecciones, las rutas compartidas, el primer
converter estricto y ocho pruebas están implementados. La lectura remota confirmó
el 2026-09-14 que ambos proyectos tienen una base `(default)`, Standard, nativa y
en `southamerica-east1`.

La prueba integrada escribió y leyó un documento técnico con ID aleatorio en
desarrollo, y confirmó su eliminación. Una primera ejecución detectó un defecto
del script: la lectura reutilizaba las opciones mutadas por la escritura. El
documento de esa ejecución también fue eliminado; se corrigió el objeto compartido
y la repetición terminó correctamente. Producción no fue contactada por el smoke.

## Decisiones de infraestructura

| Ajuste | Valor | Motivo |
|---|---|---|
| Database ID | `(default)` | Es el destino predeterminado de los SDK Firebase |
| Edición | Standard | Suficiente para tiempo real, reglas y costos bajos del MVP |
| Modo | Firestore Native | Compatible con SDKs Firebase; no se usa Datastore/MongoDB |
| Región | `southamerica-east1` (São Paulo) | Cercanía con usuarios argentinos y Functions compatibles |
| Reglas iniciales | Modo producción / denegar todo | Evita una ventana pública antes de las reglas de la Etapa 14 |
| Datos de prueba | Solo desarrollo | Producción queda vacía hasta el deploy controlado |

La ubicación elegida no se debe improvisar: migrarla después exige crear otra base
y mover datos. Ambos proyectos usan la misma región para mantener coherencia.

## Esquema raíz

El manifiesto versionado está en `firebase/schema/firestore-schema.json`. Las
colecciones de negocio se anidan bajo `establishments/{establishmentId}`; cada
documento repite `establishmentId` para validar coherencia. Solo quedan globales:

- `users`: perfil mínimo por UID, sin rol global.
- `establishmentSlugs`: resolución pública mínima del slug.
- `establishments`: raíz de cada tenant.
- `webhookEvents`: idempotencia administrada exclusivamente por backend.

Las subcolecciones canónicas son `members`, `tables`, `tableSessions` y sus
`participants`, `categories`, `products`, `orders`, `assistanceRequests`,
`payments`, `dailyMetrics`, `settings`, `qrExchanges` y `auditLogs`.

Los ítems de pedido permanecen embebidos como snapshots inmutables y limitados;
siempre se leen con el pedido y así no generan lecturas adicionales. Los clientes
de una mesa se modelan como documentos `participants/{uid}` para evitar arrays sin
límite y permitir verificaciones directas en reglas.

El detalle de campos, relaciones, dinero, timestamps, estados e índices previstos
está en `docs/architecture.md`. Los contratos completos TS/Dart se implementan en
la Etapa 11 y los repositorios/consultas en la Etapa 12.

## Archivos creados o modificados

```text
firebase/
├── firestore-policy.json
└── schema/firestore-schema.json
packages/contracts/
├── package.json
└── src/firestore.mjs
scripts/
├── check-firestore-config.mjs
├── firestore-cloud-smoke.mjs
├── firestore-config.test.mjs
└── lib/firestore-config.mjs
docs/
├── architecture.md
├── master-plan.md
├── stage-05-authentication.md
└── stage-06-firestore.md
```

- La política fija base, edición, modo y región esperados.
- El manifiesto evita divergencias de nombres y rutas.
- El paquete compartido valida IDs, construye rutas sin cruces de tenant y aporta
  el converter inicial de `Establishment`.
- `firestore:check` consulta metadatos con GET; no crea ni modifica recursos.
- `firestore:smoke:dev` acepta solamente `dev`, escribe un documento con UUID,
  comprueba su lectura y lo elimina. Rechaza explícitamente producción y overrides.

## ACCIÓN MANUAL 1 — crear Firestore en desarrollo

**Objetivo:** habilitar la base real que usaremos para pruebas integradas.

**Dónde hacerlo:** [Firebase Console](https://console.firebase.google.com/),
proyecto `mesaflow-desarrollo`.

**Pasos exactos:**

1. Confirmá arriba que el proyecto sea `mesaflow-desarrollo`.
2. Abrí **Firestore Database**; según la interfaz puede estar bajo **Build** o
   **Databases & Storage**.
3. Elegí **Crear base de datos / Create database**.
4. Seleccioná **Standard edition**. No elijas Enterprise ni compatibilidad MongoDB.
5. Usá el identificador **`(default)`**. Si la consola no muestra un campo de ID,
   crear la primera base desde esta pantalla genera la base predeterminada.
6. Seleccioná **`southamerica-east1` — São Paulo**.
7. En reglas iniciales elegí **Modo producción / Production mode**. No elijas modo
   de prueba: sus reglas temporales permiten accesos innecesarios.
8. Revisá el resumen y creá la base. Esperá a que aparezca la pestaña de datos.
9. Si aparece una solicitud de facturación, cambio de plan o términos inesperados,
   no la aceptes para continuar: copiá solamente el texto del aviso.

**Qué opción seleccionar:** `(default)`, Standard, Firestore Native,
`southamerica-east1`, reglas en modo producción.

**Qué valor copiar/guardar:** ninguno; no descargues credenciales ni claves JSON.

**Dónde se utilizará después:** pruebas integradas, apps dev y despliegues de reglas.

**Cómo verificar:** Firestore muestra una base vacía y su ubicación es
`southamerica-east1`.

## ACCIÓN MANUAL 2 — crear Firestore en producción

**Objetivo:** reservar la misma arquitectura regional sin cargar datos de prueba.

**Dónde hacerlo:** Firebase Console, proyecto `mesaflow-produccion`.

**Pasos exactos:**

1. Cambiá de proyecto y confirmá explícitamente `mesaflow-produccion`.
2. Repetí los pasos de la acción anterior con los mismos valores: `(default)`,
   Standard, modo nativo, `southamerica-east1` y reglas en modo producción.
3. No crees documentos manuales y no importes datos desde desarrollo.

**Qué opción seleccionar:** exactamente la misma base y región que en desarrollo.

**Qué valor copiar/guardar:** ninguno.

**Dónde se utilizará después:** despliegue productivo de reglas, índices y datos
reales en las etapas finales.

**Cómo verificar:** la base existe, está vacía y muestra `southamerica-east1`.

## Comandos y pruebas

Suite local completa, sin contacto con Firebase:

```powershell
npm.cmd run check
```

Lectura remota de metadatos después de crear ambas bases:

```powershell
npm.cmd run firestore:check -- all
```

La prueba integrada real se ejecutará solo después de que el chequeo anterior
pase y con autorización explícita:

```powershell
npm.cmd run firestore:smoke:dev
```

Esa prueba crea un único documento temporal en `mesaFlowStageChecks`, lo lee y lo
elimina. No usa datos personales, no contacta producción y no vacía colecciones.
Si una interrupción impide limpiar, el mensaje indica la colección exacta para
revisar; nunca ejecuta un borrado recursivo.

## Errores frecuentes

- **La API figura deshabilitada:** es normal antes de crear la primera base.
- **No aparece `(default)`:** no crees una base con nombre inventado; volvé a la
  pantalla principal de Firestore del proyecto.
- **No puedo cambiar la región:** algún recurso puede haber fijado previamente la
  ubicación. No elijas otra sin revisar el valor mostrado.
- **Modo prueba parece más simple:** no lo uses. Los emuladores ya cubren pruebas
  abiertas y las reglas del repositorio parten de denegación total.
- **El smoke remoto recibe permiso denegado:** la cuenta de Firebase CLI puede
  listar proyectos pero carecer del permiso de datos necesario. No descargues una
  cuenta de servicio ni otorgues roles amplios sin revisar primero.

## Criterio de aceptación

- [x] Política de base, edición, modo y región versionada.
- [x] Esquema raíz multiestablecimiento y estrategia de IDs documentados.
- [x] Constructor de rutas y primer converter estricto implementados.
- [x] Ocho pruebas nuevas sin red implementadas.
- [x] Base `(default)` Standard nativa creada en dev y prod.
- [x] Región `southamerica-east1` confirmada remotamente en ambos proyectos.
- [x] Escritura, lectura y limpieza temporal verificadas en desarrollo real.
- [x] Producción no recibió datos de prueba.

## Commit sugerido

`feat(firestore): define database policy and tenant schema`

## Fuentes oficiales consultadas

- [Administrar y crear bases Firestore](https://firebase.google.com/docs/firestore/manage-databases).
- [Ubicaciones de Cloud Firestore](https://firebase.google.com/docs/firestore/locations).
- [Buenas prácticas de Firestore](https://firebase.google.com/docs/firestore/best-practices).
