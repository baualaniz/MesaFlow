# Cliente MesaFlow

Aplicación Flutter Web/PWA que se abre desde el QR de la mesa. El shell visual
permite recorrer el menú demo, buscar, filtrar, abrir un producto y armar un
pedido local. El canje QR ya crea la participación de sesión en Firebase; el
catálogo continúa empaquetado hasta la Etapa 21.

La ruta QR canónica es `/e/:slug/table/:tableId`. La navegación usa URLs limpias
y muestra una pantalla segura si falta el contexto de mesa o sus segmentos no son
válidos. La autorización real usa Firebase Auth anónima y dos callables: una
canjea el token y otra recupera la participación al recargar.

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

Para usar el flujo completo, desde la raíz abrí dos PowerShell. En la primera:

```powershell
npm.cmd run emulators
```

En la segunda:

```powershell
npm.cmd run firebase:seed:demo
```

Abrí `http://127.0.0.1:5100`. El ambiente local canjea el token demo, lo elimina
de la URL y permite recargar Mesa 1 con la identidad anónima de esa pestaña.
Detené los emuladores con Ctrl+C en la primera terminal.

Para comprobar el código y generar el build web:

```powershell
flutter.bat analyze
flutter.bat test
flutter.bat build web --dart-define=MESAFLOW_ENV=emulator
```

Desde la raíz, la comprobación con cobertura y límites automáticos es:

```powershell
npm.cmd run customer:coverage
```

Exige al menos 75% de líneas en la aplicación propia y 80% en lógica/widgets
críticos. Las opciones Firebase generadas no alteran estas métricas.

Para ejecutar directamente en Chrome:

```powershell
flutter.bat run -d chrome --dart-define=MESAFLOW_ENV=emulator
```

No cambies manualmente el ID de mesa: cada mesa requiere su propio token vigente.
El fixture conocido de Mesa 1 funciona únicamente contra `demo-mesaflow`.

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
