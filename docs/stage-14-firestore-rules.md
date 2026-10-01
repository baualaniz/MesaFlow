# Etapa 14 — reglas de seguridad Firestore

## Resultado

Firestore dispone de una política local de mínimo privilegio para identidades del
panel y clientes anónimos ligados a una mesa. La suite del emulador cubre accesos
permitidos, denegaciones, consultas, aislamiento entre establecimientos y campos
inmutables.

Las reglas no se desplegaron a desarrollo ni producción. El despliegue cloud de
reglas permanece diferido hasta la Etapa 47; los índices de la Etapa 13 son el
único recurso Firestore desplegado por el momento.

## Principios

### Aislamiento por tenant

Todas las operaciones se ejecutan bajo
`establishments/{establishmentId}`. Una membresía es válida únicamente cuando:

- existe en el mismo establecimiento;
- está activa;
- su `uid` coincide con `request.auth.uid`;
- su `establishmentId` coincide con la ruta.

Una membresía del restaurante B no concede acceso al restaurante A. Para
escrituras de catálogo se valida además el campo redundante `establishmentId`.

### Clientes de mesa

Una identidad anónima solo obtiene acceso operativo cuando existe
`tableSessions/{sessionId}/participants/{uid}` activo y coherente. Puede leer la
sesión, pedidos, asistencia y pagos vinculados. En listados debe filtrar por su
`sessionId`; consultar toda la colección se deniega.

Pedidos, asistencia, pagos, participantes y sesiones no aceptan escrituras
directas desde clientes. Esas operaciones pasarán por Functions para aplicar
transacciones, precios autoritativos y máquinas de estado.

### Catálogo

- Visitantes sin sesión pueden leer establecimiento, slug, categorías activas y
  productos activos/disponibles.
- Las consultas públicas deben incluir los filtros de publicación.
- Miembros activos pueden leer el catálogo completo de su tenant.
- Owner y manager pueden crear, actualizar y eliminar categorías/productos.
- Staff solamente puede cambiar `available` y `updatedAt` de un producto.
- Kitchen no modifica catálogo.

Las escrituras validan campos exactos, tipos, moneda, importes, longitudes y
timestamps. `establishmentId` y `createdAt` son inmutables.

### Información sensible

Solo owner/manager leen métricas, configuración privada y auditoría. Las rutas
`qrExchanges`, `webhookEvents` y la administración de membresías permanecen
exclusivas del backend. La configuración pública es legible sin autenticación.

## Consultas versus lecturas individuales

Firestore evalúa consultas según lo que sus filtros pueden demostrar, no leyendo
primero todos los documentos. Por eso las reglas separan `get` y `list`:

- `get` comprueba también el `establishmentId` redundante del documento;
- `list` confía en el path de la subcolección para el tenant y exige rol o filtros
  de publicación/sesión demostrables.

Las escrituras conservan todas las comprobaciones estrictas.

## Verificación

```powershell
npm.cmd run test:emulators
npm.cmd run check
```

La suite Firestore ejecuta 14 escenarios y la suite Storage mantiene nueve:

- catálogo público y consultas filtradas;
- lectura operativa de miembros activos;
- permisos owner/manager/staff;
- inmutabilidad y esquema cerrado;
- membresías propias y listados administrativos;
- acceso y consultas de participante por sesión;
- métricas, configuración y auditoría;
- miembros inactivos, extraños y tenants cruzados;
- colecciones exclusivas del backend.

Los mensajes `PERMISSION_DENIED` durante las pruebas negativas son esperados.

## Criterios de aceptación

- [x] Membresías activas y roles aplicados por establecimiento.
- [x] Participantes limitados a su sesión.
- [x] Catálogo público limitado a contenido publicable.
- [x] Escrituras sensibles reservadas al backend.
- [x] `establishmentId` y `createdAt` protegidos.
- [x] Consultas sin filtros seguros rechazadas.
- [x] Cruces de tenant y miembros inactivos rechazados.
- [x] 14 pruebas Firestore y nueve pruebas Storage aprobadas tras la Etapa 15.

No requiere ninguna acción en Firebase Console ni facturación.
