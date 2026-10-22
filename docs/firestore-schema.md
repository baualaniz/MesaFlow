# Esquema de Cloud Firestore

Este documento es la entrada legible al modelo de datos de MesaFlow. La fuente
ejecutable es `firebase/schema/firestore-schema.json`; los contratos y detalles
de arquitectura están en `docs/architecture.md`.

## Principio multiestablecimiento

Toda información operativa vive bajo
`establishments/{establishmentId}`. El ID del establecimiento nunca se acepta
como autorización: las reglas comprueban membresías o participantes de sesión y
las Functions vuelven a validar identidad, rol y tenant.

Colecciones raíz:

| Ruta | Propósito |
|---|---|
| `users/{uid}` | Perfil global mínimo y establecimientos asociados |
| `establishmentSlugs/{slug}` | Resolución pública limitada de slug a tenant |
| `establishments/{establishmentId}` | Raíz y datos del establecimiento |
| `webhookEvents/{eventId}` | Idempotencia de eventos externos, solo backend |

Subcolecciones principales por establecimiento:

| Colección | Contenido |
|---|---|
| `members` | UID, rol, permisos derivados y activación |
| `tables` | Número, nombre, estado y hash/versionado del QR |
| `tableSessions` | Ocupación, consumo, pagos, saldo y estado |
| `tableSessions/{sessionId}/participants` | Identidades anónimas autorizadas |
| `categories` | Categorías, orden y publicación |
| `products` | Producto, precio entero, imagen empaquetada y disponibilidad |
| `orders` | Snapshot de líneas, totales y timestamps de estado |
| `assistanceRequests` | Llamados y pedidos de cuenta |
| `paymentPreferences` | Intentos de checkout creados por backend |
| `payments` | Resultado conciliado con el proveedor |
| `dailyMetrics` | Agregados diarios para el dashboard |
| `settings` | Configuración pública y privada separada |
| `qrExchanges` | Control antirreplay del canje QR |
| `auditLogs` | Trazabilidad inmutable de operaciones privilegiadas |

## Convenciones

- IDs: minúsculas ASCII, números y guiones cuando son visibles; UIDs externos se
  validan antes de formar rutas.
- Tiempo: `Timestamp` nativo en Firestore y UTC RFC 3339 en fixtures/contratos.
- Dinero: enteros en unidad menor (`priceMinor`, `totalMinor`, `paidMinor`) y
  moneda ISO del establecimiento.
- Borrado: desactivación o archivado para entidades con historial.
- Pedidos: `created → confirmed → preparing → ready → delivered → completed`,
  con `cancelled` solo desde estados y roles permitidos.
- Pagos: el cliente nunca escribe `approved`; el backend concilia la consulta
  autoritativa al proveedor.

## Consultas e índices

`firebase/query-plans.json` describe las consultas autorizadas y
`firestore.indexes.json` contiene sus índices compuestos. Incluyen catálogo
publicado, cola operativa, pedidos por sesión/mesa, asistencia pendiente, pagos
por sesión y miembros activos por rol.

Las consultas siempre se anclan al documento del establecimiento; no se usan
consultas globales para recuperar datos de múltiples tenants.

## Reglas y escritura privilegiada

`firestore.rules` deniega por defecto y separa:

- lectura pública mínima del catálogo activo después de validar la sesión;
- acceso de cliente limitado a su participación vigente;
- acceso del personal según membresía activa y rol;
- operaciones que solo pueden realizar Cloud Functions.

Los precios, totales, permisos, transiciones, métricas, pagos y auditoría se
calculan o validan del lado servidor.

## Datos de demostración

`firebase/seeds/demo-emulator.json` crea un tenant ficticio completo únicamente
en `demo-mesaflow`. Su ejecutor exige loopback y rechaza desarrollo y producción.
Los proyectos cloud no deben recibir este seed.

## Cambiar el esquema

1. Actualizar primero `firebase/schema/firestore-schema.json` y los contratos.
2. Ajustar converters, repositorios, Functions, reglas e índices.
3. Agregar o adaptar pruebas negativas de tenant y permisos.
4. Ejecutar `npm.cmd run check` y `npm.cmd run test:e2e`.
5. Desplegar mediante los scripts protegidos; nunca editar reglas productivas
   manualmente como solución permanente.

