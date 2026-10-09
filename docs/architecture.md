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

Los emuladores usan exclusivamente `demo-mesaflow` y loopback. Auth, Firestore,
Storage, Functions y los tres destinos Hosting están implementados.
Las reglas de la Etapa 14 autorizan catálogo público, membresías activas y
participantes de sesión con mínimo privilegio. Todavía no se desplegaron en los
proyectos cloud; su validación actual se realiza con Emulator Suite.

Firebase CLI queda fijada como dependencia local en 15.32.1 con correcciones
transitivas documentadas en `tooling-security.md`. No cambia el stack del MVP.

Nota incremental de Etapa 10: Firebase Hosting expone localmente `customer`,
`admin` y `landing` como sitios independientes. Cliente y panel tienen fallback
SPA; la landing conserva 404. Los sitios reales y sus targets no existen todavía:
se crearán al desplegar desarrollo en la Etapa 47. La política canónica vive en
`firebase/hosting-policy.json`.

## Panel administrativo — Etapas 31 y 32

El panel es una SPA React + TypeScript compilada por Vite. TanStack Router separa
las rutas públicas de un layout autenticado y TanStack Query queda como límite de
cache para los datos operativos de etapas posteriores. Firebase Auth conserva la
sesión del personal en el navegador; los guards esperan primero la resolución del
estado real para evitar mostrar contenido privado durante la carga.

Las configuraciones Firebase Web son públicas y están separadas por modo de build.
El modo local conecta Auth y Firestore a loopback y exige el proyecto fijo
`demo-mesaflow`. Autenticación no implica autorización: el panel lee del perfil
propio una lista no autoritativa de establecimientos y valida después cada
membresía directa, activa y vinculada al UID. También valida el contrato del
establecimiento antes de permitir el shell privado.

El tenant activo se conserva por usuario en almacenamiento local, pero siempre
se vuelve a contrastar con las membresías vigentes. Una matriz de rol más permiso
granular filtra la navegación y protege rutas operativas. Es una capa de
experiencia y defensa en profundidad: Firestore Rules y las Functions son la
autoridad final aunque se manipule el cliente.

## Operación de pedidos — Etapa 33

El panel escucha la colección `orders` dentro del tenant activo usando el índice
`status, createdAt`. Cocina limita la consulta a estados de preparación; los demás
roles operativos reciben el recorrido activo completo. Cada documento pasa por
el mismo contrato estricto usado por Functions antes de representarse.

Las transiciones se definen una sola vez en `@mesaflow/contracts`. La interfaz
usa esa matriz para ofrecer acciones y `updateOrderStatus` vuelve a aplicarla con
la membresía leída desde Firestore. Una transacción comprueba estado esperado,
actualiza el pedido y crea un registro de auditoría. El `requestId` hace el
reintento idempotente y un estado obsoleto nunca sobrescribe un cambio concurrente.

## Mesas, sesiones y rotación QR — Etapa 34

El panel consulta `tables` y las sesiones operativas bajo el tenant activo. Toda
mutación cruza la callable `manageTable`; las reglas continúan negando escrituras
directas sobre mesas, sesiones y auditoría. Propietario y encargado administran,
mientras salón mantiene una vista realtime de solo lectura.

El ciclo de sesión impide abrir dos sesiones para una mesa y solo permite cerrar
con saldo cero y sin pedidos activos. La eliminación física queda limitada a
mesas sin historial; el resto se desactiva para preservar referencias.

Los tokens QR nacen de 32 bytes aleatorios en el dispositivo administrador. La
Function valida la entropía, guarda SHA-256 y aumenta `qrVersion` dentro de la
misma transacción. El texto plano se usa una sola vez para renderizar la hoja
imprimible; Firestore y auditoría reciben únicamente versiones y hashes.

## Administración del catálogo — Etapa 35

El panel combina listeners ordenados de `categories` y `products` dentro del
tenant activo. Los documentos se validan con contratos estrictos y las mutaciones
directas usan transacciones que comparan `updatedAt`, preservan `createdAt` y
rechazan una edición basada en datos obsoletos.

Owner y manager administran estructura, contenido, orden y publicación. Staff
recibe `menu.view` para la operación diaria, pero Firestore limita su escritura a
`available` y `updatedAt`. Las consultas públicas existentes solo entregan
categorías activas y productos activos/disponibles, por lo que el cliente refleja
el cambio sin una ruta privilegiada ni un segundo modelo de datos.

El catálogo visual reutiliza un atlas PNG versionado en la app Flutter. `imagePath`
es una clave lógica estable y tanto React como Flutter resuelven el recorte local.
Así el MVP no requiere Storage, URLs externas ni facturación para administrar
imágenes; una carga dinámica puede agregarse después sin migrar los productos.

## Equipo e invitaciones — Etapa 36

`manageTeam` es la única frontera de escritura para membresías. El navegador no
envía permisos: solo correo, nombre y rol; el backend deriva la matriz canónica,
relee al actor y aplica la operación con control de concurrencia y auditoría. La
regla Firestore para `members` permanece de solo lectura para clientes.

Firebase Authentication conserva una identidad global por correo. Al invitar,
la Function reutiliza o crea esa identidad y vincula el UID al tenant. El perfil
global enumera establecimientos para orientar la carga, mientras cada membresía
continúa siendo la autoridad. Firebase entrega el correo de restablecimiento y
la contraseña temporal aleatoria nunca sale del backend.

La autorización distingue administración total de owner y alcance operativo de
manager. Este último solo administra staff/kitchen; no puede tocar owner/manager,
elevarse ni usar otro tenant. Una consulta transaccional exige conservar al menos
un owner activo para evitar dejar el establecimiento sin administración.

## Asistencia operativa — Etapa 37

El panel escucha `assistanceRequests` del tenant activo con estados `pending` y
`acknowledged`, usando el índice `status, createdAt`. Las tarjetas priorizan la
antigüedad y distinguen visualmente llamados, cuenta y otras consultas.

`updateAssistanceStatus` vuelve a leer la membresía y limita el recorrido a
`pending → acknowledged → resolved`. La transacción compara el estado esperado,
atribuye `acknowledgedBy`/`resolvedBy` al UID autenticado y crea una auditoría
idempotente. Firestore Rules mantiene las escrituras directas cerradas; el
listener ya existente del cliente observa el mismo documento y refleja el cambio
sin un canal paralelo.

## Ventas y métricas — Etapa 38

Los límites transaccionales existentes mantienen un documento diario por tenant
y fecha local. Crear pedidos agrega actividad y cantidades; cancelar o completar
ajusta esos contadores. La conciliación de pagos agrega o revierte ventas cuando
el estado entra o sale de `approved`. Cada operación actualiza detalle, sesión y
métrica en una única transacción idempotente.

El dashboard administrativo escucha únicamente los últimos siete documentos
`dailyMetrics`, nunca colecciones globales de pedidos o pagos. La UI resume ventas,
pagos, pedidos y productos; Firestore Rules reserva la lectura a owner/manager y
mantiene todas las escrituras en el backend.

## Configuración del establecimiento — Etapa 39

El panel trata `settings/public` y `settings/private` como un único formulario,
pero conserva límites de lectura distintos. El primero contiene marca, contacto,
horarios semanales y disponibilidad de pedidos/asistencia; el segundo contiene
flags internos de integraciones. Un batch atómico evita que una mitad quede
actualizada y la otra no.

El navegador valida y normaliza el borrador antes de escribir. Firestore Rules
repite la validación con campos exactos, horarios completos, tenant inmutable y
timestamp de servidor. Solo owner/manager puede mutar; el documento público sigue
disponible para el recorrido del cliente y el privado no sale del ámbito
administrativo.

La configuración no es decorativa: el repositorio QR toma `brandName` para la
sesión visible y el repositorio transaccional de pedidos exige
`orderingEnabled == true`. Asistencia ya aplica `assistanceEnabled`. Los flags
de proveedores no contienen credenciales y nunca sustituyen Secret Manager.

## Alertas WhatsApp de asistencia — Etapa 40

Un trigger de Firestore observa las versiones nuevas de solicitudes `pending`.
La capa de dominio genera una identidad SHA-256 determinista, reclama el evento
en una transacción y delega el envío a un proveedor intercambiable. En el
emulador se usa un mock sin red; en cloud queda preparada WhatsApp Cloud API con
plantilla, versión e identificador de número configurables y token secreto.

`settings/private` contiene el flag, la confirmación explícita de opt-in y el
destinatario por tenant. El estado de frecuencia vive en
`notificationStates/whatsapp-assistance`, una ruta solo backend. El límite de 60
segundos se actualiza junto con el log inicial, evitando carreras entre eventos.
Cada evento produce un `auditLogs` determinista y guarda solo el hash del
destinatario. Un fallo externo se registra, pero nunca revierte ni bloquea la
solicitud original que sigue disponible en la cola administrativa.

## Landing comercial — Etapa 41

`apps/landing` es una aplicación Astro que produce HTML estático en su propio
destino Firebase Hosting. No comparte runtime con la aplicación Flutter ni con el
panel React: solo enlaza sus URLs públicas configurables. La página organiza una
narrativa comercial completa —propuesta, funcionamiento, producto, beneficios,
planes, preguntas y CTA— y usa exclusivamente tipografías e imagen gastronómica
versionadas en el repositorio.

La landing no usa fallback SPA: mantiene URLs limpias y un `404.html` real. El
build forma parte de `hosting:build`, y sus nueve pruebas estructurales forman
parte de `npm run check`. El JavaScript del cliente se limita al menú responsive;
la navegación por secciones y el contenido principal son HTML semántico.

## SEO y accesibilidad de landing — Etapa 42

El layout deriva URLs absolutas de `PUBLIC_LANDING_URL` y centraliza canonical,
Open Graph, Twitter Card, robots y datos estructurados. Endpoints estáticos generan
`robots.txt`, `sitemap.xml` y `site.webmanifest`; el 404 queda marcado para no ser
indexado. La fotografía WebP de 101 KiB y una sola variante tipográfica mantienen
la transferencia inicial acotada.

La interacción móvil sincroniza nombre y estado ARIA, responde a `Escape`, devuelve
el foco y se cierra al abandonar el breakpoint. Los estilos incorporan foco visible,
movimiento reducido y contraste validado. Un script local controla Lighthouse con
umbrales versionados y sin guardar informes temporales ni iniciar servicios cloud.

## Calidad unitaria y de componentes — Etapa 43

El panel usa Vitest, Testing Library, JSDOM y cobertura V8. Los modelos, permisos,
guards y componentes críticos se ejecutan sin Firebase real. Las páginas de
autenticación reciben un contexto falso y la navegación simulada; `AdminShell`
recibe identidades y membresías controladas para verificar RBAC, selección de
establecimiento, sesión y menú móvil sobre el DOM real. Los mínimos globales del
alcance crítico son 85% en sentencias, funciones y líneas, y 80% en ramas.

Flutter ejecuta sus 78 pruebas con `--coverage`. Un script común localiza el SDK
de forma portable, genera LCOV y aplica dos límites de líneas: 75% para la
aplicación propia sin opciones Firebase generadas y 80% para lógica/widgets sin
adaptadores `firebase_*`. Los repositorios Firestore permanecen dentro de la
medición crítica; los límites de red/plataforma se completan con emuladores en la
etapa siguiente.

`npm run test:critical` reúne ambos controles. `npm run check` también los
incluye, de modo que una regresión funcional o de cobertura bloquea el cierre
local antes de llegar a integración, CI o despliegue.

## Integración y E2E local — Etapa 44

`npm run test:e2e` construye los tres frontends y Functions, inicia Auth,
Firestore, Functions, Storage, Hosting y Emulator Hub bajo el proyecto fijo
`demo-mesaflow`, carga el seed idempotente y ejecuta los recorridos integrados.
Ningún adaptador puede seleccionar un proyecto cloud desde este camino.

Playwright Core reutiliza Chrome instalado y descubre los puertos Hosting a
través del Hub. Comprueba la landing y su CTA, el login del panel contra Firebase
Auth más su tenant activo, y el cliente Flutter en viewport móvil desde un QR
hasta el menú Firestore. La espera de autenticación del panel está dirigida por
el estado del contexto y no por la resolución anticipada de `signIn`, evitando
una carrera con el guard de rutas.

El escenario backend conserva una identidad anónima y una misma orden durante
todo el recorrido: canje QR, creación idempotente, estados de salón/cocina,
cierre, preferencia simulada, webhook firmado, conciliación, saldo cero y
métricas. Roles y auditoría se validan en cada transición. Las pruebas de reglas
completan los límites de cliente directo con 16 casos Firestore y nueve de
Storage; los fixtures dinámicos se eliminan al finalizar.

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

Nota incremental de Etapa 8: el backend es un workspace TypeScript ESM con Cloud
Functions 2nd gen, región `southamerica-east1` y runtime desplegable Node 22. El
emulador compila antes de iniciar y solo opera con `demo-mesaflow`. Las opciones
globales limitan memoria, timeout, concurrencia e instancias; cada función futura
agregará límites específicos cuando su riesgo lo requiera. No existen archivos de
cuenta de servicio en el repositorio.

Nota incremental de Etapa 9: la configuración frontend usa exclusivamente claves
`PUBLIC_*`; parámetros backend no secretos se declaran con `defineString` y tokens
con `defineSecret`. Los secretos se vinculan por función siguiendo mínimo privilegio
y nunca se leen durante la inicialización. Para el emulador, `.secret.local` puede
reemplazar valores cloud y permanece fuera de Git. La política canónica vive en
`firebase/secrets-policy.json`.

Decisión de Etapa 7: el MVP usa imágenes versionadas y empaquetadas con las
aplicaciones. Firestore guarda una clave lógica del catálogo, no datos binarios ni
URLs externas obligatorias. Esto elimina la dependencia del plan Blaze y permite
una demo reproducible sin tarjeta. Las reglas y rutas de Storage quedan probadas
como extensión futura: `establishments/{establishmentId}/products/{productId}` y
`establishments/{establishmentId}/branding`, con escritura exclusiva para owner o
manager activo del mismo tenant, JPEG/PNG/WebP de hasta 5 MiB y metadata obligatoria.
La Etapa 15 endurece esa extensión opcional: el tipo MIME debe coincidir con la
extensión en minúsculas, solo se admiten los dos campos de metadata previstos y
el identificador de producto debe ser un segmento seguro. Las mismas condiciones
se aplican al crear y reemplazar archivos.

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
| `paymentIntents/{intentId}` | tenant, sesión, importe, moneda, proveedor, estado | Resolución global server-only de referencias de pago |
| `.../members/{uid}` | `role`, `permissions`, `active`, timestamps | Autorización del personal |
| `.../tables/{tableId}` | `number`, `name`, `qrTokenHash`, `qrVersion`, `active`, `currentSessionId` | Mesa y credencial QR rotatoria |
| `.../tableSessions/{sessionId}` | `tableId`, `status`, `openedAt`, `closedAt`, `totals` | Ocupación y cuenta aislada |
| `.../tableSessions/{sessionId}/participants/{uid}` | `establishmentId`, `sessionId`, `uid`, `active`, timestamps | Acceso acotado de clientes anónimos a la sesión |
| `.../categories/{categoryId}` | `name`, `description`, `sortOrder`, `active`, timestamps | Organización del menú |
| `.../products/{productId}` | `categoryId`, `name`, `description`, `priceMinor`, `currency`, `imagePath`, `available`, `active`, timestamps | Producto vendible |
| `.../orders/{orderId}` | `sessionId`, `tableId`, `customerUid`, `status`, `items`, `totals`, `statusTimestamps`, timestamps | Snapshot inmutable de líneas y total |
| `.../assistanceRequests/{sessionId}` | `sessionId`, `tableId`, `type`, `status`, `customerUid`, timestamps | Llamado actual de la mesa con límite antiabuso |
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
| PaymentPreference | `establishmentId: string`, `sessionId: string`, `tableId: string`, `customerUid: string`, `provider: 'mercado_pago'`, `status: creating|ready|failed`, `preferenceId: string|null`, `checkoutUrl: string|null`, `amountMinor: number`, `currency: string`, lease y timestamps |
| DailyMetric | `establishmentId: string`, `date: string`, `salesMinor: number`, `approvedPayments: number`, `completedOrders: number`, `activeOrders: number`, `productQuantities: map<string, number>`, `updatedAt: Timestamp` |

Las referencias se almacenan como IDs y no como `DocumentReference` para facilitar
fixtures, contratos compartidos y migraciones. La existencia y pertenencia de
cada ID relacionado se valida transaccionalmente en backend.

La lista preliminar `guestUids` de `tableSessions` se reemplaza en la Etapa 6 por
la subcolección `participants`. La modificación evita un array creciente y permite
que las reglas comprueben un UID mediante una lectura de documento predecible.

## Checkout Pro — Etapa 29

`createPaymentPreference` recibe solo el contexto autenticado de mesa. El saldo,
la moneda, el título y las URLs de retorno se construyen en backend. Cada sesión
usa un `intentId` SHA-256 determinista y un lease Firestore de corta duración.
Antes de crear una preferencia, el proveedor busca por `external_reference`; así
un reintento posterior a una caída recupera el recurso remoto ya existente.
La misma transacción cambia la sesión de `open` a `payment_pending`, impidiendo
que nuevos pedidos invaliden el saldo del checkout. Un fallo de proveedor revierte
esa transición solo si fue realizada por el intento fallido.

La app abre únicamente una URL HTTPS bajo `mercadopago.com`. Las rutas
`/payment/success|pending|failure` nunca actualizan pagos y tratan todos los
parámetros del navegador como no confiables. `paymentPreferences` permanece
cerrada por reglas; `payments` solo será actualizado por la conciliación del
webhook verificado en la Etapa 30.

## Webhook y conciliación — Etapa 30

`mercadoPagoWebhook` es un endpoint público porque Mercado Pago debe invocarlo,
pero ninguna notificación se considera auténtica hasta validar `x-signature`
con la clave secreta de la aplicación. Después de la firma, la Function consulta
el pago por ID en la API del proveedor y compara la respuesta con el intento
server-only creado antes de abrir Checkout Pro: referencia externa, importe,
moneda y ambiente deben coincidir.

La conciliación se ejecuta en una única transacción Firestore. Un documento
determinista en `payments` representa el pago remoto, `webhookEvents` deduplica
la entrega y la sesión recompone `paidMinor`, `balanceMinor` y su estado. La
operación también es idempotente entre eventos distintos del mismo pago: solo la
transición efectiva modifica los totales. Reembolsos y contracargos retiran la
contribución aprobada; eventos tardíos no degradan un estado más definitivo.

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

`firestore.indexes.json` contiene desde la Etapa 13 los ocho índices compuestos
de esta tabla. Todos usan scope `COLLECTION` sobre una subcolección concreta del
tenant. El emulador comprueba filtros, orden y límites, pero no exige índices;
por eso el cierre de la etapa requiere comprobar estados `READY` y ejecutar los
planes en el proyecto de desarrollo real.

## Matriz resumida de permisos

| Capacidad | Owner | Manager | Staff | Kitchen | Cliente de sesión |
|---|---:|---:|---:|---:|---:|
| Configuración/miembros | Total | Lectura y gestión no-owner | No | No | No |
| Menú y disponibilidad | Total | Total | Disponibilidad | Lectura | Lectura pública activa |
| Pedidos | Total | Total | Confirmar/entregar/cancelar permitido | Preparar/listo | Crear y leer los propios/de sesión |
| Asistencia | Total | Total | Atender/resolver | Lectura opcional | Crear y leer la de su sesión |
| Pagos/ventas/métricas | Total | Lectura | Sin importes agregados | No | Pago/lectura de su sesión |
| Mesas/QR | Total | Total | Abrir/cerrar sesión | No | Canjear QR válido |

Las transiciones no se autorizan con escrituras directas del cliente: pasan por
Functions y se verifican también mediante reglas que deniegan campos protegidos.

## Contratos ejecutables — Etapa 11

La forma compartida del dominio se divide en una especificación JSON y dos
implementaciones estrictas. TypeScript cubre Functions, panel y herramientas;
Dart cubre Flutter. Ambos ejecutan `packages/contracts/fixtures` para impedir que
enums, límites, dinero o timestamps diverjan silenciosamente.

Los adaptadores Firestore futuros convertirán `Timestamp` a la representación
del lenguaje dentro de cada aplicación. Solo los límites JSON/API utilizan el
texto RFC3339 canónico. Los importes nunca cruzan el sistema como flotantes: se
transportan como enteros `*Minor` junto con `currency`.

## Repositorios multiestablecimiento — Etapa 12

La capa administrativa de datos reside en `functions/src/data`. Un repositorio se
construye con un `establishmentId` y genera internamente todas sus referencias
bajo `establishments/{establishmentId}`; no recibe paths arbitrarios. También
verifica que el campo redundante `establishmentId` coincida antes y después de
persistir.

Los converters de Product y Order son el límite entre los `Timestamp` nativos de
Firestore y los contratos serializables de la Etapa 11. Toda lectura se valida de
nuevo, de modo que un documento histórico corrupto no llega como entidad válida
a la lógica de negocio. Los SDKs cliente siguen bloqueados por reglas hasta la
Etapa 14.

## Consultas e índices — Etapa 13

Los planes canónicos viven en `firebase/query-plans.json` y deben corresponder
exactamente a `firestore.indexes.json`. El verificador rechaza índices ausentes,
adicionales, duplicados o que incorporen `establishmentId`, evitando normalizar
consultas globales entre tenants. Los repositorios de Product y Order construyen
las consultas desde su `CollectionReference` ya acotada al establecimiento.

## Autorización Firestore — Etapa 14

Las reglas distinguen miembros del panel y participantes anónimos de mesa. Los
miembros se validan por UID, estado activo, rol y coherencia de tenant. Los
participantes se validan por UID, sesión activa y coherencia de establecimiento.

El catálogo admite lectura pública solo para categorías activas y productos
activos/disponibles. Owner/manager administran catálogo y staff solo alterna
disponibilidad. Pedidos, sesiones, asistencia, pagos, membresías, QR y webhooks
reservan sus escrituras a Functions/Admin SDK. Las reglas separan `get` de `list`
para exigir en consultas filtros que Firestore pueda demostrar.

## Autorización Storage opcional — Etapa 15

Las lecturas de imágenes de producto y marca son públicas porque forman parte del
menú, pero toda creación, actualización o eliminación exige un owner o manager
activo del mismo establecimiento. No se admiten rutas privadas improvisadas ni
escrituras cruzadas entre tenants.

Las cargas aceptadas son JPEG (`.jpg`/`.jpeg`), PNG (`.png`) o WebP (`.webp`), de
1 byte a 5 MiB. El nombre y el `productId` deben ser segmentos seguros de hasta
128 caracteres. La metadata personalizada debe contener exclusivamente
`establishmentId` y `uploadedByUid`, ambos coherentes con la ruta y la identidad.
Estas reglas están verificadas en emuladores y no fueron desplegadas: el MVP sigue
usando imágenes empaquetadas y no necesita bucket, plan Blaze ni tarjeta.

## Dataset demo seguro — Etapa 16

El dataset canónico reside en `firebase/seeds/demo-emulator.json` y declara como
único destino `demo-mesaflow`. Su ejecutor fija Firestore Emulator en
`127.0.0.1:8080`, rechaza credenciales cloud, otros proyectos y argumentos, y
nunca contiene contraseñas ni tokens QR utilizables.

Los 61 documentos representan owner, manager, staff y kitchen; 10 mesas; 18
productos; tres sesiones; cuatro pedidos; asistencia, pagos, métricas,
configuración y auditoría. Los timestamps y IDs son deterministas. La carga hace
`set` solamente sobre sus rutas conocidas, verifica el resultado completo y una
segunda aplicación debe producir cero cambios. El seed de presentación anterior
permanece separado como excepción histórica para desarrollo real.

## Bootstrap Flutter — Etapa 17

El cliente Web selecciona `emulator`, `dev` o `prod` mediante
`MESAFLOW_ENV` en tiempo de compilación. La ausencia del valor elige
`demo-mesaflow`; un valor desconocido falla y nunca cae en producción. Desarrollo
y producción tienen apps Web Firebase distintas y archivos FlutterFire separados.

Antes de inicializar Firebase Core se comprueba que el `projectId` de las opciones
coincida con el ambiente elegido. El manifiesto generado por FlutterFire se valida
también desde la suite raíz. Los identificadores Web se versionan por ser
configuración pública; la autorización sigue dependiendo de Auth, Rules y backend.
Hosting local solo acepta un build marcado como `emulator`, evitando servir un
bundle cloud dejado por una compilación manual anterior.

## Sistema visual — Etapa 18

El cliente usa Poppins para títulos e Inter para texto y controles. Ambas fuentes
se distribuyen dentro del bundle junto con sus licencias OFL; no dependen de una
petición a Google Fonts. La paleta MesaFlow agrega superficies y colores
semánticos para éxito, advertencia, información y error.

Los tokens de espaciado y radio, más los temas de campos, botones, chips,
tarjetas, snackbars, bottom sheets, tooltips y progreso, forman la base común.
`MesaFlowStatusBadge` y `MesaFlowFeedbackPanel` representan estados sin depender
solo del color. Las pruebas de widgets cubren 320, 390 y 1280 px, y el bundle se
verificó visualmente en navegador sin errores de consola.

## Navegación cliente — Etapa 19

El cliente usa `go_router` sobre la API Router de Flutter y estrategia Web de
paths, sin fragmentos `#`. La ruta pública canónica
`/e/:slug/table/:tableId` conserva establecimiento y mesa en recargas y enlaces
compartidos. Firebase Hosting reescribe cualquier ruta del cliente a
`index.html`, mientras el router decide la pantalla dentro de la aplicación.

`CustomerTableRoute` es el único objeto que transporta ese contexto hacia el
menú. `CustomerSessionRouteGuard` valida presencia, forma y longitud antes de
montar la pantalla. Una ruta sintácticamente válida no concede acceso a sesión:
el token, la identidad anónima, la vigencia y el antirreplay pertenecen al canje
backend de la Etapa 20.

La raíz del emulador redirige a `mesa-flow-demo/mesa-01` para desarrollo. En
desarrollo cloud y producción, la raíz no inventa contexto y solicita escanear el
QR. Las rutas desconocidas y los segmentos inválidos terminan en una pantalla de
recuperación que no refleja valores de la URL.

## Canje QR y sesión cliente — Etapa 20

El query parameter `token` es una credencial transitoria. El cliente crea o
recupera un usuario anónimo con persistencia de pestaña y llama
`exchangeQrSession`; el SDK callable adjunta el ID token de Auth. Tras un canje
correcto, el router reemplaza la URL por la misma ruta sin query parameter.

La callable resuelve slug, establecimiento, mesa y sesión dentro de una
transacción. Compara en tiempo constante SHA-256 del token con `qrTokenHash`,
exige mesa activa, versión positiva y sesión `open`, y crea atómicamente el
participant y un `qrExchange`. El ID antirreplay deriva de UID más hash del token:
el mismo QR admite distintas identidades de comensales, pero el mismo UID no puede
repetirlo.

`restoreQrSession` no recibe credenciales QR. Resuelve la sesión actual desde la
ruta y solo devuelve contexto si existe un participant activo con el UID
autenticado. Esto permite recargar durante `open` o `payment_pending` sin guardar
tokens en almacenamiento de aplicación. El fixture local es conocido y solo
coincide con `demo-mesaflow`; producción deberá generar 128 bits aleatorios por
versión. App Check queda como requisito previo al despliegue cloud de las
callables.

## Menú dinámico cliente — Etapa 21

`FirestoreMenuRepository` es el límite de lectura del catálogo en Flutter. Se
construye con la instancia Firebase del ambiente y recibe exclusivamente el
`establishmentId` que devolvió el canje o la restauración de sesión; nunca toma
el tenant directamente de la URL para consultar datos.

Primero consulta categorías activas ordenadas por `sortOrder`. Luego consulta
productos por cada categoría con `active == true`, `available == true` y el mismo
orden canónico. Esta forma coincide con las reglas públicas y los índices ya
desplegados en desarrollo, y evita scans o consultas globales entre tenants.

Los adaptadores convierten `Timestamp` nativo a contratos Dart y vuelven a
validar campos exactos, IDs, dinero, moneda, tenant y flags de publicación. La UI
recibe un `MenuCatalog` inmutable y diferencia carga, éxito, catálogo vacío y
error recuperable. La dependencia se inyecta desde `main.dart`; las pruebas de
widgets usan un repositorio en memoria sin sustituir el camino productivo.

`imagePath` solo selecciona una presentación del asset empaquetado. El cliente no
depende de Firebase Storage, por lo que el MVP conserva el funcionamiento sin
bucket de pago.

## Selección de producto — Etapa 22

`ProductDetailSheet` presenta la información del catálogo y devuelve una
`ProductSelection`; no escribe Firestore ni conoce el futuro formato del carrito
persistente. La selección se construye mediante `OrderItemContract`, reutilizando
los mismos límites que el backend aplicará al confirmar un pedido.

Cantidad y dinero se validan juntos. El máximo es el menor entre 99 y la cantidad
que mantiene `priceMinor × quantity` dentro de `maxMinorAmount`. Las notas se
normalizan con `trim`, una cadena vacía se transforma en `null` y el máximo de 300
caracteres pertenece al fixture de contratos compartido por Dart y TypeScript.

`ProductSelection` también es la entrada validada del carrito de la Etapa 23.
Producto y nota iguales se combinan; notas diferentes forman líneas separadas.
Cada línea guarda su subtotal validado, y el total visible solo suma enteros.

## Carrito persistente por sesión — Etapa 23

`CartController` concentra restauración, combinación de líneas, edición,
eliminación, vaciado y totales. Antes de publicar un cambio en memoria, espera que
`CartStore` lo persista; si el guardado falla, la interfaz conserva el último
estado confirmado y permite reintentar.

La implementación Web usa `SharedPreferencesAsync`, cuyo respaldo en navegador
es almacenamiento local. La clave incluye versión de esquema,
`establishmentId` y `sessionId`, por lo que dos sesiones de mesa no comparten el
mismo documento. El valor solo contiene `productId`, cantidad y nota: no guarda
tokens, identidad, precio ni totales.

Al restaurar, el cliente vuelve a resolver cada ID contra el catálogo publicado
actual. Los productos ausentes se descartan y precio, moneda, nombre y subtotal
se reconstruyen desde ese catálogo. Un documento corrupto, con campos extra o de
otra sesión se elimina de forma segura. Este almacenamiento mejora continuidad,
pero nunca es una fuente confiable: la Function de creación de pedido de la
Etapa 24 volverá a validar sesión, catálogo, disponibilidad y precios en servidor.

## Creación transaccional del pedido — Etapa 24

`createOrder` es una callable autenticada. El cliente envía contexto de la sesión,
un `requestId` aleatorio y líneas limitadas a `productId`, cantidad y nota. El
contrato rechaza campos adicionales: precio, nombre, moneda, subtotal y total no
pueden cruzar ese límite desde Flutter.

El ID definitivo deriva de SHA-256 sobre UID y `requestId`. La Function lo busca
antes de procesar la operación; un reintento devuelve el mismo snapshot y no
vuelve a incrementar el consumo. Si aún no existe, una transacción comprueba:

- establecimiento, mesa y sesión activa `open`;
- participante autenticado y vigente;
- productos y categorías activos, disponibles y del tenant correcto;
- moneda coherente y límites enteros del contrato.

Después toma nombre, moneda y precio directamente de Firestore, calcula líneas y
total, crea un `OrderContract` en estado `created` y actualiza `subtotalMinor` y
`balanceMinor` de la sesión en la misma transacción. Una falla no deja escrituras
parciales. Las reglas siguen negando escrituras directas del cliente; solo Admin
SDK dentro de Functions realiza la operación.

Flutter llama la Function mediante `OrderGateway`. El carrito se limpia después
de una respuesta exitosa y presenta referencia y total confirmados por servidor.
Ante una falla conserva sus líneas y reutiliza el mismo `requestId`; si el usuario
modifica el contenido, genera uno nuevo. El despliegue cloud continúa diferido:
todo este recorrido está verificado con Auth, Firestore y Functions Emulator.

## Seguimiento de pedidos — Etapa 25

`FirestoreOrderTrackingRepository` escucha `orders` dentro del establecimiento
validado y exige `sessionId == sesión activa`, con orden por `createdAt`. No existe
una consulta global ni se toma el tenant directamente de la URL. Esta forma
coincide con las reglas de participante y con el índice compuesto ya versionado.

Cada snapshot atraviesa nuevamente `OrderContract`. El adaptador exige
`Timestamp` de Firestore, normaliza su precisión a milisegundos UTC y comprueba
que establecimiento, sesión e ID pertenezcan al contexto esperado. Un documento
mal formado no se presenta como un pedido válido.

`OrderTrackingController` mantiene una sola suscripción para el contexto activo,
descarta respuestas tardías de suscripciones reemplazadas y expone carga, datos y
error recuperable. Al reconstruir la aplicación se crea una suscripción nueva y
Firestore vuelve a entregar los pedidos de la sesión, sin depender de una copia
local ni del carrito ya vaciado.

La hoja **Tus pedidos** muestra primero el más reciente, el snapshot de líneas y
total, y un timeline desde recibido hasta completado. Los pedidos cancelados usan
un cierre específico. Si la conexión cae, se conserva la última información; si
todavía no había datos se ofrece reintentar. Las transiciones operativas siguen
reservadas para el panel y la Function de la Etapa 33: el cliente solo observa.

## Asistencia desde la mesa — Etapa 26

`createAssistanceRequest` y `cancelAssistanceRequest` reciben únicamente el
contexto de sesión y, al crear, uno de los tipos canónicos. El backend valida
Auth, establecimiento, mesa, sesión, participante y `settings/public` antes de
escribir. Las reglas no habilitan escrituras directas desde Flutter.

Cada sesión usa `assistanceRequests/{sessionId}`. La identidad estable convierte
los reintentos y pestañas paralelas en una sola solicitud activa; una transacción
impide carreras y aplica 60 segundos de espera luego de `resolved` o
`cancelled`. Flutter escucha ese documento exacto, vuelve a validar el contrato
y muestra `pending`, `acknowledged`, `resolved` o `cancelled` sin recargar.

## Consumo y cuenta — Etapa 27

`getSessionConsumption` es una callable autenticada y de solo lectura. Recibe
únicamente `establishmentId`, `sessionId` y `tableId`; la identidad proviene de
Firebase Auth. Antes de calcular vuelve a validar establecimiento, mesa, sesión,
participante y pertenencia de todos los documentos al mismo tenant.

Dentro de una transacción de lectura obtiene la sesión, sus pedidos y sus pagos.
El consumo incluye todos los pedidos excepto `cancelled`; el importe pagado solo
incluye pagos `approved`. Los estados pendientes, rechazados, cancelados,
reembolsados o con contracargo no reducen el saldo. Todos los importes siguen
siendo enteros minor y cada documento debe usar la moneda del establecimiento.

El resultado reconstruido se compara con `subtotalMinor`, `paidMinor` y
`balanceMinor` almacenados en `tableSessions`. Una diferencia produce
`consumption-inconsistent`: nunca se corrige silenciosamente ni se muestra al
cliente un total ambiguo. El cálculo no requiere un índice compuesto nuevo,
porque ambas lecturas filtran solo por `sessionId`.

Flutter abre **Tu cuenta** desde el encabezado y carga el resumen mediante un
gateway inyectado. La hoja muestra consumo, pagado, saldo, cantidad de pedidos y
productos; permite reintentar y actualizar. **Pedir la cuenta** reutiliza la
solicitud `bill` de la Etapa 26, por lo que conserva autenticación, deduplicación,
cooldown y estado en tiempo real sin crear un segundo canal operativo.

## Mercado Pago de prueba — Etapa 28

La integración elegida para el MVP es Checkout Pro vía Preferences API en
Argentina. La aplicación externa **MesaFlow Desarrollo** usa credenciales de
prueba y un único vendedor demo; producción queda explícitamente deshabilitada en
`firebase/mercado-pago-policy.json`.

`MERCADO_PAGO_ACCESS_TOKEN` existe únicamente en
`functions/.secret.local`, protegido por `.gitignore`. El archivo versionado
contiene solo placeholders y la Function de la Etapa 29 será la única consumidora
del secreto mediante un binding explícito. Public Key, Client Secret y
credenciales productivas no forman parte del flujo actual.

`mercado-pago:check` confirma que el archivo está ignorado y realiza una lectura
de identidad con el Access Token sin imprimir token, ID, correo ni datos del
titular. La respuesta debe corresponder al sitio argentino y contener la marca de
usuario de prueba.

El vendedor único es deliberadamente un alcance de demostración. Antes de operar
como SaaS real donde cada restaurante recibe su dinero, el modelo deberá migrar a
OAuth por establecimiento y almacenamiento individual cifrado; un token global
no se reutilizará para cobrar por múltiples comercios reales.
