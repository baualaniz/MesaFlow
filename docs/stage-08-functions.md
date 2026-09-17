# Etapa 8 — Cloud Functions local

## Objetivo

Crear el backend TypeScript de Cloud Functions 2nd gen, fijar su runtime y región,
incorporarlo al Emulator Suite y probar una función HTTP real sin activar Blaze,
crear recursos cloud ni descargar credenciales.

## Resultado

- Workspace ESM `@mesaflow/functions` con TypeScript estricto y ESLint.
- Runtime de despliegue fijado en Node 22 mediante `firebase.json`.
- Región global `southamerica-east1`, 256 MiB, timeout de 10 segundos, cero
  instancias mínimas, máximo tres y concurrencia 20.
- Función pública `health` limitada a GET/HEAD, sin caché ni información sensible.
- Tres pruebas unitarias para payload, HEAD y rechazo de métodos mutables.
- Smoke test HTTP contra Functions Emulator junto con Auth, Firestore y Storage.
- Compilación automática antes de iniciar o probar los emuladores.

La instalación local usa Node 24, por lo que Functions Emulator informa que usa la
versión del host. El artefacto apunta a ES2022 y compila para el runtime configurado
Node 22. Antes de un despliegue se hará una prueba adicional con Node 22 para lograr
paridad exacta.

## Contrato de salud

```http
GET /demo-mesaflow/southamerica-east1/health
```

Respuesta 200:

```json
{"status":"ok","service":"mesaflow-functions","version":1}
```

`HEAD` devuelve 200 sin cuerpo. POST, PUT, PATCH y DELETE devuelven 405 con
`Allow: GET, HEAD`. No expone proyecto, región, variables, versiones de paquetes,
tokens ni estado de Firestore.

## Archivos principales

```text
functions/
├── eslint.config.mjs
├── package.json
├── tsconfig.json
├── src/
│   ├── health.ts
│   └── index.ts
└── test/
    └── health.test.mjs
scripts/
├── functions-emulator-smoke.mjs
├── run-emulators.mjs
└── lib/emulator-config.mjs
```

`functions/lib` es salida generada y está excluida de Git.

## Comprobar

```powershell
npm.cmd run functions:check
npm.cmd run test:emulators
```

El primer comando ejecuta lint, build y tres unit tests. El segundo compila otra
vez, inicia todos los servicios en loopback, llama a `health`, ejecuta las pruebas
anteriores de Auth/Firestore/Storage y apaga la suite automáticamente.

## Facturación e identidad

No hay acción manual en esta etapa. Ejecutar Functions Emulator es gratuito y el
ID `demo-mesaflow` no tiene recursos cloud. No se ejecutó `firebase deploy`.

El despliegue de Cloud Functions requerirá Blaze y una autorización explícita en
la Etapa 47. Firebase/Google Cloud proporcionará la identidad administrada del
runtime; MesaFlow no necesita descargar ni versionar claves JSON de cuentas de
servicio. Si una integración externa requiere secretos, se configurarán con
Secret Manager desde la Etapa 9.

## Criterio de aceptación

- [x] TypeScript estricto compila sin errores.
- [x] ESLint termina sin advertencias.
- [x] Tres pruebas unitarias pasan.
- [x] Functions Emulator usa loopback y `demo-mesaflow`.
- [x] GET/HEAD de `health` pasan y POST se rechaza.
- [x] La suite integrada completa termina con código 0 y apaga servicios.
- [x] No se creó una cuenta de servicio ni se agregó una clave.
- [x] No se activó facturación ni se modificó dev/prod.

## Commit sugerido

`feat(functions): add typed local backend and health checks`

## Referencias oficiales

- [Administrar runtime de Functions](https://firebase.google.com/docs/functions/manage-functions).
- [Usar TypeScript](https://firebase.google.com/docs/functions/typescript).
- [Conectar Functions Emulator](https://firebase.google.com/docs/emulator-suite/connect_functions).
