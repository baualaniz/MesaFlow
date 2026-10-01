# Etapa 21 — menú dinámico desde Firestore

## Resultado

El cliente dejó de depender del catálogo fijo para su ejecución real. Después de
validar el QR, carga desde Firestore únicamente las categorías activas y los
productos activos y disponibles del establecimiento devuelto por la sesión.

```text
QR validado
  → establishmentId confiable de la sesión
  → categorías active == true, ordenadas por sortOrder
  → productos por categoría, active == true y available == true
  → validación estricta de tenant, campos, tipos y timestamps
  → búsqueda, filtros y carrito visual
```

Las imágenes siguen incluidas en la aplicación. `imagePath` selecciona el recorte
del asset local y no realiza lecturas de Storage, por lo que esta etapa no agrega
facturación ni requiere tarjeta.

## Consultas y aislamiento

`FirestoreMenuRepository` recibe solo un `establishmentId` validado y construye
todas las rutas bajo:

```text
establishments/{establishmentId}/categories
establishments/{establishmentId}/products
```

Las consultas coinciden con los índices de la Etapa 13:

- categorías: `active == true`, `sortOrder asc`;
- productos: `categoryId ==`, `active == true`, `available == true`,
  `sortOrder asc`.

No existe una consulta global ni se acepta un path proporcionado por la URL. Cada
documento se valida nuevamente al leerlo: campos exactos, IDs seguros, importes
enteros, moneda ISO, `Timestamp` nativo, tenant correcto y estado publicable. Un
documento corrupto o cruzado produce un error recuperable en vez de mostrarse.

## Estados visibles

La pantalla distingue cuatro situaciones:

- carga del catálogo;
- menú publicado;
- catálogo sin categorías o productos publicables;
- error de conexión o datos, con botón **Reintentar**.

La búsqueda continúa funcionando por nombre y descripción. Los chips usan el ID
de categoría internamente y su nombre solo como etiqueta, evitando depender de
nombres repetidos o editables.

## Ejecutar el recorrido local

Terminal 1, desde la raíz:

```powershell
npm.cmd run emulators
```

Terminal 2:

```powershell
npm.cmd run firebase:seed:demo
```

Después abrir:

```text
http://127.0.0.1:5100
```

El cliente local conecta Auth a `127.0.0.1:9099`, Firestore a
`127.0.0.1:8080` y Functions a `127.0.0.1:5001`. Debe mostrar 17 productos:
el seed contiene 18, pero **Salmón al limón** tiene `available: false` y no debe
aparecer.

## Verificación

```powershell
cd apps/customer
flutter.bat analyze
flutter.bat test
flutter.bat build web --release --dart-define=MESAFLOW_ENV=emulator
cd ../..
npm.cmd run test:emulators
npm.cmd run check
```

La suite cubre adaptadores Firestore válidos e inválidos, aislamiento de tenant,
producto inactivo/no disponible, timestamps nativos, carga, catálogo vacío,
error con reintento, búsqueda, carrito y responsive. El repositorio simulado se
usa solo en widgets aislados; `main.dart` siempre inyecta el repositorio real.

Resultados de cierre:

- análisis Flutter sin observaciones;
- 38 pruebas Flutter aprobadas;
- build Web release para `demo-mesaflow` correcto;
- suite rápida del monorepo y 12 pruebas de Functions aprobadas;
- smoke integrado, 14 pruebas de reglas Firestore y 9 de Storage aprobados;
- seed de 61 documentos cargado dos veces de forma idempotente;
- desarrollo y producción no fueron contactados.

## Criterios de aceptación

- [x] El menú real lee Firestore después de validar la sesión QR.
- [x] Las rutas quedan ancladas al establecimiento confiable de la sesión.
- [x] Solo se consultan categorías activas.
- [x] Solo se consultan productos activos y disponibles.
- [x] Categorías y productos respetan `sortOrder` e índices existentes.
- [x] Búsqueda y filtro por categoría operan sobre el resultado publicado.
- [x] Carga, vacío y error con reintento tienen estados distintos.
- [x] Las imágenes permanecen empaquetadas y no requieren Storage ni Blaze.
- [x] La configuración local usa Firestore Emulator y no toca cloud.

## Próximo paso

La Etapa 22 ampliará el detalle de producto con cantidad, notas y validaciones.
El carrito seguirá siendo visual hasta que la Etapa 23 incorpore estado
persistente por sesión.

## Fuentes oficiales

- [Inicio de Cloud Firestore para Flutter](https://firebase.google.com/docs/firestore/quickstart).
- [Consultas simples y compuestas](https://firebase.google.com/docs/firestore/query-data/queries).
- [Paquete oficial cloud_firestore](https://pub.dev/packages/cloud_firestore).
