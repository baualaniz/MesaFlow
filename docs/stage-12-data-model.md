# Etapa 12 — modelo de datos y repositorios

## Resultado

La capa de acceso a Firestore ya conserva los contratos de la Etapa 11 y obliga
a trabajar dentro de un único establecimiento. Se implementaron converters para
`Product` y `Order`, junto con repositorios CRUD reutilizables y pruebas contra
el emulador real.

Esta etapa no abre Firestore a clientes. Las reglas continúan cerradas hasta que
la autorización por membresía y sesión se implemente y pruebe en la Etapa 14.
Los repositorios actuales utilizan el SDK administrativo desde Functions.

## Componentes

- `functions/src/data/firestore-converters.ts`: convierte los `Timestamp` nativos
  de Firestore a UTC RFC3339 para validarlos con los contratos, y realiza el
  camino inverso al escribir.
- `functions/src/data/tenant-repository.ts`: CRUD genérico anclado a
  `establishments/{establishmentId}/{collection}`.
- `ProductRepository` y `OrderRepository`: repositorios tipados para las dos
  entidades con invariantes más sensibles del MVP.
- `scripts/firestore-repository-emulator.mjs`: prueba integrada de creación,
  lectura, reemplazo, listado, eliminación y aislamiento lógico.

## Límite multiestablecimiento

Cada repositorio recibe un `establishmentId` válido al construirse. Todas sus
referencias nacen debajo de ese path; no acepta rutas libres. Antes de crear o
reemplazar un documento comprueba que el campo `establishmentId` del payload
coincida con el tenant del repositorio. Después de una lectura vuelve a comprobar
esa coherencia para detectar datos históricos mal ubicados.

Tener el mismo ID de producto en dos establecimientos no produce colisión: son
documentos bajo paths distintos. La prueba integrada crea un producto en el
tenant A, confirma que el repositorio B no puede resolverlo y rechaza intentar
escribir el payload de A desde B.

Esto es defensa en profundidad del backend. Las reglas de seguridad para SDKs de
cliente se incorporarán por separado en la Etapa 14.

## Conversión temporal

Firestore almacena `Timestamp`. El contrato de dominio usa el formato serializable
`YYYY-MM-DDTHH:mm:ss.sssZ`. Los converters aceptan exclusivamente `Timestamp`
nativo al leer y generan `Timestamp` al escribir; un string almacenado por error
se rechaza en vez de propagarse silenciosamente.

En pedidos también se convierten todos los valores de `statusTimestamps`. Los
validadores compartidos vuelven a verificar totales, líneas, estado actual y
campos exactos después de leer.

## Operaciones disponibles

El repositorio base expone:

- `create(id, value)`: falla si el documento ya existe.
- `get(id)`: devuelve el documento tipado o `null`.
- `replace(id, value)`: reemplaza el documento completo luego de validarlo.
- `list()`: lista únicamente la colección del tenant construido.
- `remove(id)`: elimina el documento indicado dentro de ese tenant.

Las consultas filtradas y sus índices compuestos se agregaron en la Etapa 13. Las
transacciones de negocio no se implementan en este CRUD: pedidos, pagos y cambios
de estado tendrán Functions específicas en etapas posteriores.

## Verificación

Pruebas rápidas, sin servicios externos:

```powershell
npm.cmd run functions:check
npm.cmd run check
```

Prueba CRUD real con Emulator Suite:

```powershell
npm.cmd run test:emulators
```

El último comando fija siempre `demo-mesaflow`, usa solo loopback, crea IDs
aleatorios y elimina exclusivamente sus propios fixtures. Nunca utiliza
`mesaflow-desarrollo` ni `mesaflow-produccion`.

Firebase CLI requiere JDK 21 o superior. El runner detecta un JDK compatible ya
instalado y lo prioriza solamente para el proceso de emuladores; no modifica el
`PATH`, `JAVA_HOME` ni las preferencias globales de Windows.

## Criterios de aceptación

- [x] Product y Order se leen/escriben mediante converters estrictos.
- [x] Firestore conserva `Timestamp` y el dominio conserva UTC normalizado.
- [x] CRUD tipado funciona contra el emulador.
- [x] Repositorios no aceptan payloads de otro tenant.
- [x] Un tenant no resuelve el documento creado bajo otro tenant.
- [x] La prueba integrada limpia los datos creados.
- [x] Las reglas permanecen cerradas hasta la Etapa 14.

No requiere acciones manuales, cambios en Firebase Console, credenciales ni
facturación.
