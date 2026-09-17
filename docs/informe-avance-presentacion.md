# Informe breve de avance — MesaFlow

**Fecha:** 17 de septiembre de 2026  
**Repositorio público:** <https://github.com/baualaniz/MesaFlow>  
**Rama principal:** `main`  
**Último commit verificado:** `120f889` — configuración de tres sitios Hosting locales

## 1. Descripción del proyecto

MesaFlow es un sistema para digitalizar la atención de mesas gastronómicas. El
cliente accede desde un código QR, consulta el menú, arma su pedido y podrá seguir
su estado, pedir asistencia y pagar. El personal contará con un panel separado
para administrar mesas, productos, pedidos, usuarios y métricas.

La solución se diseña como SaaS multiestablecimiento: los datos operativos de cada
restaurante quedan aislados bajo su propio identificador.

## 2. Qué funciona actualmente

- Repositorio público y monorepo organizados para cliente, panel, landing,
  backend, contratos, Firebase, pruebas y documentación.
- Proyectos Firebase separados para desarrollo (`mesaflow-desarrollo`) y
  producción (`mesaflow-produccion`).
- Bases Cloud Firestore `(default)` creadas en ambos proyectos, edición Standard,
  modo nativo y región `southamerica-east1` (São Paulo).
- Dataset académico de 23 documentos ficticios cargado y verificado únicamente
  en desarrollo; producción permanece sin datos de demostración.
- Authentication configurado con Email/Password para el personal y acceso
  anónimo previsto para clientes que ingresen desde una mesa.
- Aplicación Flutter Web ejecutable con una primera experiencia visual: catálogo
  de productos, imágenes locales, búsqueda, filtros, detalle y carrito
  demostrativo.
- Backend TypeScript para Cloud Functions 2nd gen con endpoint local de salud.
- Tres destinos de Firebase Hosting probados localmente: cliente, panel y landing.
- Emuladores integrados para Authentication, Firestore, Storage, Functions y
  Hosting, sin utilizar datos reales ni producción.
- Configuración pública, parámetros privados y secretos separados para evitar
  credenciales dentro del repositorio.
- Suite actual de 61 pruebas estáticas y unitarias, más pruebas integradas de
  emuladores, rutas web y reglas de Storage.

## 3. Estructura prevista en Firestore

Las colecciones raíz principales son:

- `users`: perfil global mínimo del usuario.
- `establishmentSlugs`: resolución del establecimiento desde una URL o QR.
- `establishments`: raíz de cada restaurante o tenant.
- `webhookEvents`: idempotencia de notificaciones externas administradas por el
  backend.

Dentro de `establishments/{establishmentId}` se prevén las subcolecciones:

- `members`, `tables`, `tableSessions` y `participants`;
- `categories`, `products` y `orders`;
- `assistanceRequests`, `payments` y `dailyMetrics`;
- `settings`, `qrExchanges` y `auditLogs`.

El esquema completo, las rutas y la estrategia de identificadores están
versionados en `firebase/schema/firestore-schema.json` y `docs/architecture.md`.

## 4. APIs y servicios seleccionados

| Servicio | Uso previsto | Estado |
|---|---|---|
| Firebase Authentication | Personal con Email/Password y clientes anónimos | Configurado; integración UI pendiente |
| Cloud Firestore | Menú, mesas, sesiones, pedidos, asistencia, pagos y métricas | Bases creadas y esquema definido |
| Cloud Functions 2nd gen | Lógica privilegiada, pedidos, QR, pagos y webhooks | Base TypeScript y health local listos |
| Firebase Hosting | Cliente Flutter, panel React y landing Astro | Tres destinos locales listos |
| Firebase Storage | Extensión futura para imágenes dinámicas | Reglas probadas; el MVP usa imágenes empaquetadas |
| Mercado Pago Checkout Pro | Pago alojado y confirmación por webhook | Seleccionado; sandbox pendiente |
| WhatsApp Cloud API | Aviso opcional de solicitudes de asistencia | Seleccionado; integración posterior y no bloqueante |

## 5. Pendientes y bloqueos

No existe un bloqueo técnico para continuar el desarrollo local. Los pendientes
principales son conectar el cliente Flutter con Firebase, implementar contratos y
repositorios, completar las reglas Firestore, crear el dataset demostrativo y
construir el panel administrativo.

El despliegue de Cloud Functions y Secret Manager requerirá habilitar el plan
Blaze más adelante. Para evitar costos y el uso de tarjeta en esta instancia, el
MVP actual funciona localmente con emuladores e imágenes empaquetadas. Mercado
Pago y WhatsApp todavía no poseen credenciales cargadas ni llamadas reales.

Para esta entrega se cargó un dataset acotado de demostración, sin datos
personales y solo en `mesaflow-desarrollo`. Incluye un establecimiento, categorías,
productos, mesas, una sesión, un pedido y estados operativos claramente ficticios.
La carga es atómica, auditable y rechaza producción. `mesaflow-produccion`
continúa sin datos de demostración.

## 6. Próximos pasos

1. Implementar contratos compartidos y validaciones de datos.
2. Crear repositorios y consultas multiestablecimiento.
3. Completar reglas Firestore y sus pruebas de aislamiento.
4. Cargar un seed idempotente de demostración en desarrollo.
5. Conectar el flujo Flutter de QR, menú, carrito y pedidos.
6. Construir el panel React y luego integrar pagos sandbox.

## 7. Ejecución de la demostración local

Desde la raíz del repositorio:

```powershell
npm.cmd run emulators
```

Después de `All emulators ready`, se pueden abrir:

- cliente: <http://127.0.0.1:5100>;
- panel provisional: <http://127.0.0.1:5105>;
- landing provisional: <http://127.0.0.1:5106>;
- consola local Firebase: <http://127.0.0.1:4000>.

Los servicios se detienen con `Ctrl+C`.
