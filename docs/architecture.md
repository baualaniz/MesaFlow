# Arquitectura del MVP

## Ambientes confirmados — Etapa 3

Desarrollo usa `mesaflow-desarrollo` y producción usa `mesaflow-produccion`.
`.firebaserc` define `dev`, `prod` y `default` (desarrollo). La configuración de
alias no es un control de autorización ni selecciona automáticamente el backend
de los SDK frontend. Las cuentas, datos y secretos se separan por proyecto.

Se versiona `.firebaserc` con IDs públicos porque este es el repositorio de una
aplicación concreta. Sustituye al archivo de ejemplo previsto inicialmente; no
cambia la arquitectura. Más detalles en `stage-03-firebase-environments.md`.

## Entorno local — Etapa 4

Los emuladores usan exclusivamente `demo-mesaflow` y loopback. Auth y Firestore
están implementados; Functions, Storage y Hosting se incorporan al existir sus
módulos. Las reglas iniciales deniegan todos los accesos cliente y se ampliarán
en la Etapa 14. No se han desplegado estas reglas en ninguno de los proyectos.

Firebase CLI queda fijada como dependencia local en 15.28.2 con correcciones
transitivas documentadas en `tooling-security.md`. No cambia el stack del MVP.

## Stack elegido

Nota incremental de Etapa 5: Firebase Auth identifica al personal por
Email/Password y al consumidor de mesa por Anonymous Auth. Ninguna identidad
concede permisos sin membresía/sesión autorizada. No se usarán tenants de Identity
Platform por restaurante. La política de contraseñas mínima propuesta es 12
caracteres con privacidad de correos activa; el detalle y su verificación están en
`stage-05-authentication.md`. La lectura de configuración no equivale a probar el
login de las aplicaciones, que se integrará en sus etapas.

Nota incremental de Etapa 6: Firestore usa la base `(default)`, edición Standard,
modo nativo y región regional `southamerica-east1` (São Paulo) en ambos ambientes.
El proyecto real de desarrollo permitirá pruebas integradas; el emulador seguirá
siendo obligatorio para pruebas destructivas y repetibles. Producción no recibe
datos de prueba. La configuración canónica está en `firebase/firestore-policy.json`
y el manifiesto de rutas en `firebase/schema/firestore-schema.json`.

| Componente | Tecnología | Función | Motivo |
|---|---|---|---|
| Cliente | Flutter 3 / Dart, Flutter Web PWA | Menú, carrito, pedidos, cuenta y pago desde QR | Requisito obligatorio y una base compatible con web/móvil |
| Estado/rutas cliente | Riverpod + go_router | Estado testeable y rutas profundas `/e/:slug/table/:tableId` | Soluciones maduras con bajo acoplamiento |
| Panel | React, TypeScript, Vite, TanStack Query/Router | Operación y administración web | Buen soporte para datos, formularios y tiempo real |
| Landing | Astro + TypeScript/CSS | Sitio comercial estático | SEO y rendimiento con mínima complejidad |
| Identidad | Firebase Authentication | Usuarios del panel y clientes anónimos | Integración directa con reglas y emuladores |
| Base de datos | Cloud Firestore | Datos operativos y listeners en tiempo real | Requisito obligatorio y adecuado al flujo |
| Archivos | Firebase Storage | Fotos de productos y QR exportables | Reglas por tenant y entrega CDN |
| Backend | Cloud Functions 2nd gen, Node.js LTS, TypeScript | Sesiones QR, transiciones, pagos, webhooks y agregados | Límite de confianza central y escalado administrado |
| Pago | Mercado Pago Checkout Pro | Pago sandbox/producción | Flujo alojado y webhook autoritativo |
| Mensajería | WhatsApp Cloud API | Alertas opt-in de asistencia | Integración oficial con alcance acotado |
| Hosting | Firebase Hosting, tres sitios | Cliente, panel y landing | Despliegue y dominios consistentes |
| Pruebas | Flutter Test, Vitest, Playwright, Firebase Rules Unit Testing | Lógica, UI, E2E y autorización | Cubre los límites de mayor riesgo |
| CI | GitHub Actions | Lint, test, build y deploy controlado | Familiar, económico y reproducible |

## Monorepo

```text
MesaFlow/
├── apps/
│   ├── customer/
│   ├── admin/
│   └── landing/
├── functions/
├── packages/contracts/
├── firebase/
│   ├── seeds/
│   └── tests/
├── docs/
├── scripts/
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── storage.rules
└── .firebaserc
```

Los clientes nunca se comunican con Mercado Pago o WhatsApp usando credenciales.
Las operaciones sensibles entran por Functions, verifican identidad, pertenencia,
rol, estado actual, entrada e idempotencia, y luego escriben Firestore.

## Modelo conceptual de Firestore

La jerarquía canónica es `establishments/{establishmentId}/...`. Toda entidad de
negocio vive bajo su establecimiento; esto simplifica las reglas y evita consultas
globales accidentales. Los documentos globales solo resuelven identidad o slugs.

| Ruta | Campos principales | Propósito |
|---|---|---|
| `users/{uid}` | `displayName`, `email`, `createdAt`, `updatedAt` | Perfil global mínimo; no otorga permisos |
| `establishmentSlugs/{slug}` | `establishmentId`, `active` | Resolución pública controlada del QR |
| `establishments/{eid}` | `name`, `slug`, `timezone`, `currency`, `active`, timestamps | Tenant raíz |
| `.../members/{uid}` | `role`, `permissions`, `active`, timestamps | Autorización del personal |
| `.../tables/{tableId}` | `number`, `name`, `qrTokenHash`, `qrVersion`, `active`, `currentSessionId` | Mesa y credencial QR rotatoria |
| `.../tableSessions/{sessionId}` | `tableId`, `status`, `openedAt`, `closedAt`, `totals` | Ocupación y cuenta aislada |
| `.../tableSessions/{sessionId}/participants/{uid}` | `establishmentId`, `sessionId`, `uid`, `active`, timestamps | Acceso acotado de clientes anónimos a la sesión |
| `.../categories/{categoryId}` | `name`, `description`, `sortOrder`, `active`, timestamps | Organización del menú |
| `.../products/{productId}` | `categoryId`, `name`, `description`, `priceMinor`, `currency`, `imagePath`, `available`, `active`, timestamps | Producto vendible |
| `.../orders/{orderId}` | `sessionId`, `tableId`, `customerUid`, `status`, `items`, `totals`, `statusTimestamps`, timestamps | Snapshot inmutable de líneas y total |
| `.../assistanceRequests/{requestId}` | `sessionId`, `tableId`, `type`, `status`, `customerUid`, timestamps | Llamado de mesa |
| `.../payments/{paymentId}` | `sessionId`, `provider`, `externalId`, `idempotencyKey`, `status`, `amountMinor`, timestamps | Resultado conciliable del proveedor |
| `.../dailyMetrics/{yyyy-MM-dd}` | importes, conteos, `productQuantities`, `updatedAt` | Dashboard económico y barato |
| `.../settings/public` | marca, horarios, contacto, flags públicos | Configuración legible por cliente |
| `.../settings/private` | IDs no secretos y opciones operativas | Configuración solo administrativa/backend |
| `.../auditLogs/{logId}` | actor, acción, entidad, antes/después, timestamp | Trazabilidad privilegiada |
| `qrExchanges/{exchangeId}` | hash, uid, expiración, usado | Antirreplay efímero administrado por backend |
| `webhookEvents/{providerEventId}` | tipo, estado, timestamps | Idempotencia global de webhooks |

Los pedidos guardan sus líneas como array de snapshots porque pertenecen a un solo
pedido, se leen juntas y no se editan tras confirmar. Esto evita una subcolección
`orderItems` y reduce lecturas. El backend limita tamaño y cantidad.

## Campos y tipos canónicos

Todos los documentos de tenant incluyen `establishmentId: string` aun cuando el
ID ya aparece en la ruta. Esta duplicación deliberada permite validar coherencia,
crear registros de auditoría autocontenidos y rechazar payloads movidos entre
tenants. `createdAt` y `updatedAt` son `Timestamp` de servidor.

| Entidad | Campos requeridos y tipos |
|---|---|
| Establishment | `name: string`, `slug: string`, `timezone: string`, `currency: string`, `active: boolean`, `createdAt: Timestamp`, `updatedAt: Timestamp` |
| Member | `establishmentId: string`, `uid: string`, `role: Role`, `permissions: string[]`, `active: boolean`, `createdAt: Timestamp`, `updatedAt: Timestamp` |
| Table | `establishmentId: string`, `number: number`, `name: string`, `qrTokenHash: string`, `qrVersion: number`, `active: boolean`, `currentSessionId: string|null`, timestamps |
| TableSession | `establishmentId: string`, `tableId: string`, `status: TableSessionStatus`, `subtotalMinor: number`, `paidMinor: number`, `balanceMinor: number`, `openedAt: Timestamp`, `closedAt: Timestamp|null`, `updatedAt: Timestamp` |
| TableSessionParticipant | `establishmentId: string`, `sessionId: string`, `uid: string`, `active: boolean`, `joinedAt: Timestamp`, `revokedAt: Timestamp|null` |
| Category | `establishmentId: string`, `name: string`, `description: string`, `sortOrder: number`, `active: boolean`, timestamps |
| Product | `establishmentId: string`, `categoryId: string`, `name: string`, `description: string`, `priceMinor: number`, `currency: string`, `imagePath: string|null`, `available: boolean`, `active: boolean`, `sortOrder: number`, timestamps |
| Order | `establishmentId: string`, `sessionId: string`, `tableId: string`, `customerUid: string`, `status: OrderStatus`, `items: OrderItemSnapshot[]`, `subtotalMinor: number`, `totalMinor: number`, `currency: string`, `notes: string|null`, `statusTimestamps: map<string, Timestamp>`, timestamps |
| OrderItemSnapshot | `productId: string`, `name: string`, `unitPriceMinor: number`, `quantity: number`, `lineTotalMinor: number`, `notes: string|null` |
| AssistanceRequest | `establishmentId: string`, `sessionId: string`, `tableId: string`, `customerUid: string`, `type: AssistanceType`, `status: AssistanceStatus`, `acknowledgedBy: string|null`, `resolvedBy: string|null`, timestamps |
| Payment | `establishmentId: string`, `sessionId: string`, `provider: 'mercado_pago'`, `externalId: string|null`, `idempotencyKey: string`, `status: PaymentStatus`, `amountMinor: number`, `currency: string`, `providerStatus: string|null`, timestamps |
| DailyMetric | `establishmentId: string`, `date: string`, `salesMinor: number`, `approvedPayments: number`, `completedOrders: number`, `activeOrders: number`, `productQuantities: map<string, number>`, `updatedAt: Timestamp` |

Las referencias se almacenan como IDs y no como `DocumentReference` para facilitar
fixtures, contratos compartidos y migraciones. La existencia y pertenencia de
cada ID relacionado se valida transaccionalmente en backend.

La lista preliminar `guestUids` de `tableSessions` se reemplaza en la Etapa 6 por
la subcolección `participants`. La modificación evita un array creciente y permite
que las reglas comprueben un UID mediante una lectura de documento predecible.

## Identificadores, tiempo y estados

- IDs internos: IDs automáticos de Firestore; `uid` para membresías.
- Slug: legible y único, pero no secreto.
- Token QR: 128 bits aleatorios en la URL; solo se guarda un hash y una versión.
- Tiempo: `serverTimestamp`; fecha de métricas calculada en zona del establecimiento.
- Dinero: enteros `priceMinor`, `subtotalMinor`, `totalMinor`; moneda ISO 4217.
- Pedido: `created → confirmed → preparing → ready → delivered → completed`, o
  `created|confirmed → cancelled`.
- Sesión: `open → payment_pending → paid → closed`, o `cancelled`.
- Pago: `pending → approved|rejected|cancelled|refunded|charged_back`.
- Asistencia: `pending → acknowledged → resolved`, o `cancelled`.

## Máquina de estados de pedidos

| Desde | Hacia | Actor permitido | Efecto visible |
|---|---|---|---|
| `created` | `confirmed` | owner, manager, staff | Cliente ve “Confirmado”; cocina recibe el pedido |
| `created` | `cancelled` | owner, manager, staff o cliente autor antes de confirmar | Cliente ve motivo y el pedido sale de producción |
| `confirmed` | `preparing` | owner, manager, kitchen | Cliente ve “En preparación” |
| `confirmed` | `cancelled` | owner o manager; staff solo con permiso explícito | Registra motivo y actor en auditoría |
| `preparing` | `ready` | owner, manager, kitchen | Salón recibe indicador de retiro/entrega |
| `ready` | `delivered` | owner, manager, staff | Cliente ve “Entregado” |
| `delivered` | `completed` | backend al cerrar/conciliar, owner o manager | Se incorpora definitivamente a métricas |

Cualquier otro salto se rechaza. Cocina ve `confirmed`, `preparing` y `ready`;
salón y administración ven todos; el cliente ve una etiqueta amigable sin datos
internos de actores. Cada transición usa transacción, comprueba el estado leído,
escribe `statusTimestamps.<nuevoEstado>` y genera un `auditLog`.

## Relaciones e índices iniciales

No se permiten consultas de colección raíz para datos operativos desde clientes.
Las consultas siempre parten de `establishments/{eid}` y el `eid` se obtiene de
una membresía o sesión validada.

| Consulta | Colección | Orden/filtros | Índice compuesto previsto |
|---|---|---|---|
| Menú activo por categoría | `products` | `categoryId ==`, `active ==`, `available ==`, `sortOrder asc` | `categoryId, active, available, sortOrder` |
| Categorías publicadas | `categories` | `active ==`, `sortOrder asc` | `active, sortOrder` |
| Cola operativa | `orders` | `status in [...]`, `createdAt asc` | `status, createdAt` |
| Pedidos de sesión | `orders` | `sessionId ==`, `createdAt asc` | `sessionId, createdAt` |
| Pedidos por mesa recientes | `orders` | `tableId ==`, `createdAt desc` | `tableId, createdAt` |
| Asistencia pendiente | `assistanceRequests` | `status ==`, `createdAt asc` | `status, createdAt` |
| Pagos de sesión | `payments` | `sessionId ==`, `createdAt desc` | `sessionId, createdAt` |
| Miembros por rol | `members` | `active ==`, `role ==`, `createdAt desc` | `active, role, createdAt` |

`firestore.indexes.json` tiene inicialmente listas vacías para configurar el
emulador; se completará en la Etapa 13 al existir consultas reales. Corrección de
verificación: el emulador no exige índices compuestos. Las consultas deberán
verificarse también en el proyecto de desarrollo real antes de cerrar esa etapa.

## Matriz resumida de permisos

| Capacidad | Owner | Manager | Staff | Kitchen | Cliente de sesión |
|---|---:|---:|---:|---:|---:|
| Configuración/miembros | Total | Lectura y gestión no-owner | No | No | No |
| Menú y disponibilidad | Total | Total | Disponibilidad | Lectura | Lectura pública activa |
| Pedidos | Total | Total | Confirmar/entregar/cancelar permitido | Preparar/listo | Crear y leer los propios/de sesión |
| Asistencia | Total | Total | Atender/resolver | Lectura opcional | Crear y leer la propia |
| Pagos/ventas/métricas | Total | Lectura | Sin importes agregados | No | Pago/lectura de su sesión |
| Mesas/QR | Total | Total | Abrir/cerrar sesión | No | Canjear QR válido |

Las transiciones no se autorizan con escrituras directas del cliente: pasan por
Functions y se verifican también mediante reglas que deniegan campos protegidos.
