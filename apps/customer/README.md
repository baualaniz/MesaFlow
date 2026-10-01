# Cliente MesaFlow

Aplicación Flutter Web/PWA que se abre desde el QR de la mesa. El shell visual
permite recorrer el menú demo, buscar, filtrar, abrir un producto y armar un
pedido local. Todavía no escribe en Firebase.

La ruta QR canónica es `/e/:slug/table/:tableId`. La navegación usa URLs limpias
y muestra una pantalla segura si falta el contexto de mesa o sus segmentos no son
válidos. La autorización real del token se incorpora en la Etapa 20.

`MESAFLOW_ENV` selecciona el destino en tiempo de compilación. Si se omite, usa
`emulator` y nunca cae implícitamente en un proyecto cloud:

| Valor | Proyecto esperado |
|---|---|
| `emulator` | `demo-mesaflow` |
| `dev` | `mesaflow-desarrollo` |
| `prod` | `mesaflow-produccion` |

Las fotografías están empaquetadas en `assets/images`: la aplicación puede verse
sin Cloud Storage, tarjeta de crédito ni conexión a un CDN.
Poppins e Inter también están empaquetadas en `assets/fonts` con sus licencias
OFL, por lo que la identidad visual no descarga tipografías en tiempo de ejecución.

## Ejecutar

Desde esta carpeta, en PowerShell:

```powershell
flutter.bat pub get
flutter.bat build web --dart-define=MESAFLOW_ENV=emulator
cd ../..
npm.cmd run preview:customer
```

Abrí `http://127.0.0.1:7357/e/mesa-flow-demo/table/mesa-01` y detené el servidor
con Ctrl+C. Recargar esa dirección conserva Mesa 1. En ambiente local, la raíz
también redirige automáticamente a esta mesa demo.

Para comprobar el código y generar el build web:

```powershell
flutter.bat analyze
flutter.bat test
flutter.bat build web --dart-define=MESAFLOW_ENV=emulator
```

Para ejecutar directamente en Chrome:

```powershell
flutter.bat run -d chrome --dart-define=MESAFLOW_ENV=emulator
```

Si Chrome abre la raíz, la aplicación redirige a la mesa demo. Para probar otra
mesa, cambiá solo el último segmento, por ejemplo
`/e/mesa-flow-demo/table/mesa-02`.

La configuración cloud está separada para `dev` y `prod` según
`docs/stage-17-customer-shell.md`. Firebase Core se inicializa con el proyecto
seleccionado, pero el catálogo continúa local hasta la Etapa 21.

Builds cloud explícitos:

```powershell
flutter.bat build web --release --dart-define=MESAFLOW_ENV=dev
flutter.bat build web --release --dart-define=MESAFLOW_ENV=prod
```

El build usado por los emuladores/Hosting local siempre se regenera con
`MESAFLOW_ENV=emulator`, aunque el último build manual haya sido cloud.
