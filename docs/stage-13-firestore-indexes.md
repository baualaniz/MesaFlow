# Etapa 13 — consultas e índices Firestore

## Estado

Implementación local completa y probada en Emulator Suite. La activación de los
ocho índices y la comprobación final de consultas en `mesaflow-desarrollo` quedan
pendientes de una acción manual explícita. Producción no forma parte de esta
etapa.

## Planes canónicos

`firebase/query-plans.json` documenta las consultas y
`firestore.indexes.json` contiene exactamente su índice correspondiente.

| Plan | Colección del tenant | Filtros | Orden |
|---|---|---|---|
| Menú por categoría | `products` | `categoryId`, `active`, `available` | `sortOrder asc` |
| Categorías publicadas | `categories` | `active` | `sortOrder asc` |
| Cola operativa | `orders` | `status in` | `createdAt asc` |
| Pedidos de sesión | `orders` | `sessionId` | `createdAt asc` |
| Pedidos recientes de mesa | `orders` | `tableId` | `createdAt desc` |
| Asistencia pendiente | `assistanceRequests` | `status` | `createdAt asc` |
| Pagos de sesión | `payments` | `sessionId` | `createdAt desc` |
| Miembros activos por rol | `members` | `active`, `role` | `createdAt desc` |

Todos usan `queryScope: COLLECTION`: se ejecutan desde
`establishments/{establishmentId}/{collection}`. Ningún índice incluye
`establishmentId` ni habilita un barrido global de tenants.

## Repositorios implementados

`ProductRepository.listPublishedByCategory` aplica disponibilidad/publicación y
orden del menú. `OrderRepository` incorpora:

- `listOperational(statuses)` para la cola por estados válidos.
- `listBySession(sessionId)` para el historial cronológico.
- `listRecentByTable(tableId, limit)` para la vista reciente, con límite entre
  1 y 100.

El emulador crea productos y pedidos temporales, comprueba filtros y orden, y
elimina todos los fixtures. El emulador acepta consultas sin exigir índices; por
eso la etapa incluye verificadores cloud separados.

## Validación local

```powershell
npm.cmd run test:firestore-indexes
npm.cmd run test:emulators
npm.cmd run check
```

El validador exige correspondencia exacta entre los ocho planes y los ocho
índices, rechaza duplicados, omisiones, campos inválidos e intentos de índice
global por `establishmentId`.

## Acción manual pendiente en desarrollo

Estos pasos crean índices únicamente en desarrollo. No ejecutarlos con `prod` ni
reemplazar el ID del proyecto.

1. Desde la raíz, comprobar la sesión:

   ```powershell
   firebase.cmd projects:list
   ```

2. Crear/actualizar solamente índices en desarrollo:

   ```powershell
   firebase.cmd deploy --only firestore:indexes --project mesaflow-desarrollo
   ```

3. Esperar a que Firebase Console muestre todos los índices como habilitados.
   Puede tardar varios minutos.

4. Comprobar por API, en modo solo lectura:

   ```powershell
   npm.cmd run firestore:indexes:check:dev
   ```

5. Ejecutar los ocho planes reales contra `mesa-flow-demo`, también en solo
   lectura:

   ```powershell
   npm.cmd run firestore:queries:check:dev
   ```

El primer verificador informa `FALTA`, `CREANDO` u `OK`. El segundo exige que el
dataset de presentación siga cargado y no crea, modifica ni elimina documentos.

## Criterios de aceptación

- [x] Ocho planes de consulta versionados.
- [x] Ocho índices compuestos exactos y sin scope global.
- [x] Consultas de Product/Order implementadas y tipadas.
- [x] Filtros, orden y límites probados con emulador.
- [x] Validadores locales y verificadores cloud de solo lectura.
- [ ] Índices desplegados y `READY` en `mesaflow-desarrollo`.
- [ ] Ocho consultas reales aprobadas en `mesaflow-desarrollo`.

No requiere Blaze ni tarjeta. La creación de índices puede consumir almacenamiento
y escrituras internas del servicio cuando existan datos, por eso se limita a
desarrollo y se realiza con confirmación manual.
