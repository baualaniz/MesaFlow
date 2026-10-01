# Etapa 20 — canje seguro del QR y sesión anónima

## Resultado

El cliente ya convierte un QR vigente en una participación autenticada dentro de
la sesión de mesa. El recorrido local completo usa Firebase Authentication,
callables 2nd gen y una transacción Firestore, sin desplegar ni escribir en los
proyectos cloud.

```text
URL QR con token
  → Auth anónima
  → exchangeQrSession
  → SHA-256 + validación de versión/mesa/sesión
  → participant + qrExchange atómicos
  → URL sin token
  → restoreQrSession en las recargas
```

## Contrato del enlace

La ruta visible continúa siendo `/e/:slug/table/:tableId`. El QR inicial agrega
un query parameter temporal:

```text
/e/mesa-flow-demo/table/mesa-01?token=<credencial-qr>
```

Cuando el canje termina correctamente, el router reemplaza la URL por:

```text
/e/mesa-flow-demo/table/mesa-01
```

El token no se devuelve desde Functions, no se guarda manualmente en localStorage
y no queda en la entrada actual del historial. Firebase Auth conserva solamente
la identidad anónima con persistencia de pestaña (`SESSION`). Al recargar, la app
envía slug y mesa a `restoreQrSession`; el backend vuelve a comprobar que el UID
sea un participante activo de la sesión vigente.

## Validaciones backend

`exchangeQrSession` exige:

- Firebase Auth presente;
- payload exacto, sin campos adicionales;
- slug e ID de mesa con segmentos seguros;
- token de al menos 128 bits codificados;
- slug y establecimiento activos;
- mesa activa y sesión actual abierta;
- SHA-256 del token igual al hash almacenado;
- versión QR positiva;
- ausencia de un canje previo para la misma combinación UID/token.

La comparación del hash usa tiempo constante. La transacción crea juntos:

- `tableSessions/{sessionId}/participants/{uid}`;
- `qrExchanges/{hash(uid + tokenHash)}`.

El registro antirreplay conserva hash, versión, UID, mesa, sesión, uso y
expiración de retención. Nunca conserva el token original. Distintos clientes
anónimos pueden canjear el mismo QR vigente, pero un mismo UID no puede repetir
el canje.

Un token rotado deja de coincidir con `tables.qrTokenHash`, aunque la URL conserve
el mismo slug y mesa. Nuevos participantes dejan de admitirse si la sesión ya no
está `open`; participantes existentes todavía pueden restaurar durante
`payment_pending`.

## Límite del fixture local

El token incluido para `mesa-flow-demo/mesa-01` es deliberadamente conocido y
solo corresponde al proyecto ficticio `demo-mesaflow`. No es un secreto ni debe
copiarse a desarrollo o producción. Los QR reales de la futura gestión de mesas
deben usar 128 bits aleatorios criptográficamente seguros y hashes distintos por
rotación.

App Check permanece sin enforcement porque no existe despliegue cloud en esta
etapa. Debe configurarse antes de publicar estas callables. La autorización no
depende de App Check: Auth, token de alta entropía, transacción y reglas siguen
siendo obligatorios.

## Ejecutar el flujo local

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

La raíz local agrega automáticamente el token fixture, lo canjea y limpia la URL.
La barra del navegador debe terminar en:

```text
http://127.0.0.1:5100/e/mesa-flow-demo/table/mesa-01
```

Al recargar, la misma pestaña recupera la sesión sin volver a utilizar el token.
Cerrar la pestaña termina la persistencia local elegida para el cliente.

## Verificación

```powershell
cd apps/customer
flutter.bat analyze
flutter.bat test
cd ../..
npm.cmd run functions:check
npm.cmd run test:emulators
npm.cmd run check
```

Resultados de cierre:

- análisis Flutter sin observaciones;
- 31 pruebas Flutter aprobadas;
- 12 pruebas Functions aprobadas;
- build Web release correcto;
- callable en `southamerica-east1` comprobada;
- QR válido y restauración aprobados;
- replay, alteración y token rotado rechazados;
- participantes, intercambios y usuarios de prueba eliminados;
- 14 pruebas Firestore y 9 pruebas Storage conservadas.

## Criterios de aceptación

- [x] El cliente crea o recupera identidad anónima.
- [x] El token solo cruza una vez hacia la callable y se hashea en backend.
- [x] Un token vigente abre la sesión correcta.
- [x] La URL se limpia después del canje.
- [x] Una recarga restaura mediante UID/participant, sin token local propio.
- [x] Replay del mismo UID, token alterado y token rotado fallan.
- [x] El alta de participante y el antirreplay son atómicos.
- [x] La suite local no toca desarrollo ni producción.

## Próximo paso

La Etapa 21 reemplazará el catálogo empaquetado por categorías y productos activos
leídos desde Firestore dentro del establecimiento validado.

## Fuentes oficiales

- [Autenticación anónima con Flutter](https://firebase.google.com/docs/auth/flutter/anonymous-auth).
- [Callables de Cloud Functions](https://firebase.google.com/docs/functions/callable).
- [Conexión al emulador de Functions](https://firebase.google.com/docs/emulator-suite/connect_functions).
