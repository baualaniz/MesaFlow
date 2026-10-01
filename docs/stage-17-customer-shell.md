# Etapa 17 — aplicación Flutter Web/PWA

## Motivo

El shell visual adelantado ya se consolidó como la base de la aplicación cliente.
Las Etapas 8–16 quedaron completadas y esta etapa incorpora ahora selección
segura de ambiente y la dependencia oficial `firebase_core`.

## Implementado

- Proyecto Flutter Web/PWA real en `apps/customer`.
- Paleta MesaFlow y base responsive para celular, tablet y escritorio.
- Menú demostrativo con búsqueda y filtros por categoría.
- Detalle de producto y carrito local con total en centavos.
- Fotografía original empaquetada, sin red, bucket ni tarjeta.
- Dos pruebas de widgets para render, carrito y búsqueda.
- Metadata PWA y título de navegador de MesaFlow.
- Selección de `emulator`, `dev` o `prod` mediante `MESAFLOW_ENV`.
- Destino predeterminado `demo-mesaflow`; un valor desconocido se rechaza.
- `firebase_core` fijado en el lockfile y build Web compatible.
- Tres pruebas unitarias adicionales para evitar cruces de proyecto.

El botón de confirmación todavía no crea pedidos y el catálogo aún no proviene de
Firestore; esas funciones corresponden a etapas posteriores. Las apps Web de
desarrollo y producción ya fueron registradas y Firebase Core selecciona sus
opciones únicamente a partir del ambiente de compilación.

## Ambientes

| `MESAFLOW_ENV` | Proyecto | Comportamiento |
|---|---|---|
| `emulator` o ausente | `demo-mesaflow` | Seguro para trabajo local |
| `dev` | `mesaflow-desarrollo` | Requiere opciones FlutterFire dev |
| `prod` | `mesaflow-produccion` | Requiere opciones FlutterFire prod |

La selección ocurre al compilar con `--dart-define`; no se usa el alias `default`
de Firebase CLI para decidir el backend de la aplicación.

## Ejecutar

```powershell
cd apps/customer
flutter.bat pub get
flutter.bat build web --dart-define=MESAFLOW_ENV=emulator
cd ../..
npm.cmd run preview:customer
```

La URL es `http://127.0.0.1:7357`; Ctrl+C detiene la vista previa.

## Verificar

```powershell
flutter.bat analyze
flutter.bat test
flutter.bat build web --dart-define=MESAFLOW_ENV=emulator
```

El resultado final es: análisis sin observaciones, 15 pruebas aprobadas y builds
Web release correctos para `emulator`, `dev` y `prod`.

## Registro de apps Web completado

La consulta inicial confirmó que no existían apps Web. El usuario ejecutó desde
`apps/customer` la configuración de desarrollo:

```powershell
flutterfire.bat configure --project=mesaflow-desarrollo --platforms=web --out=lib/src/firebase/firebase_options_dev.dart
```

Luego configuró producción:

```powershell
flutterfire.bat configure --project=mesaflow-produccion --platforms=web --out=lib/src/firebase/firebase_options_prod.dart
```

FlutterFire creó una app Web diferente en cada proyecto y generó opciones con
identificadores públicos. `firebase_bootstrap.dart` valida que el `projectId`
coincida antes de llamar a `Firebase.initializeApp`. La configuración anidada
`apps/customer/firebase.json` también se valida para exigir exactamente Web, dev
y prod, sin plataformas ni proyectos adicionales.

El build de Hosting local conserva una marca de ambiente y se rehace como
`emulator` si el último build manual fue `dev` o `prod`. De ese modo, la suite
local nunca sirve accidentalmente un bundle conectado a la nube.

## Criterio de aceptación

- [x] La aplicación web abre sin Firebase Storage.
- [x] La imagen forma parte del bundle.
- [x] Buscar, filtrar, abrir productos y sumar al pedido funcionan localmente.
- [x] `emulator` es el destino predeterminado seguro.
- [x] Los IDs dev/prod están separados y cubiertos por pruebas.
- [x] `firebase_core` está instalado y el build Web pasa.
- [x] Análisis y 15 pruebas Flutter aprobados.
- [x] Apps Web dev/prod registradas por el usuario.
- [x] Opciones generadas conectadas a `Firebase.initializeApp`.
- [x] Configuración FlutterFire cruzada o adicional rechazada.
- [x] Builds `emulator`, `dev` y `prod` validados.
- [x] Hosting local fuerza el build `emulator`.

## Fuentes oficiales

- [Configuración de Firebase para Flutter](https://firebase.google.com/docs/flutter/setup).
- [Uso de proyectos Firebase separados por ambiente](https://firebase.google.com/docs/projects/multiprojects).
