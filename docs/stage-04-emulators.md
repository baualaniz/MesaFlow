# Etapa 4 — Firebase CLI y emuladores

## Objetivo

Verificar la cuenta de Firebase y poder iniciar, inspeccionar y probar servicios
locales sin tocar datos de desarrollo o producción.

## Resultado

- El usuario inició sesión con Firebase CLI y confirmó que `projects:list`
  muestra `mesaflow-desarrollo` y `mesaflow-produccion`.
- CLI local fijada en `firebase-tools@15.28.2`, con lockfile reproducible.
- Authentication, Firestore y Emulator Suite UI configurados.
- Proyecto local fijo `demo-mesaflow`, sin recursos reales en Firebase.
- Reglas iniciales Firestore de denegación total para clientes.
- 14 pruebas de configuración y tres de compatibilidad de dependencias.
- Smoke test real de Auth y Firestore, con limpieza de sus propios fixtures.

## Dependencias y alcance

- Etapas 1–3 completas; Node 24 y Java 21 ya comprobados en este equipo.
- npm descarga la CLI en `node_modules`; la primera ejecución descarga el
  emulador Firestore y la UI a la caché del usuario.
- No se habilita facturación ni se despliegan reglas o recursos.
- Login es necesario para verificar acceso a tus proyectos, pero las pruebas
  con ID demo no necesitan datos, contraseñas ni tokens de la nube.

## Decisiones e incorporación incremental

1. Se anticipan `firestore.rules` y `firestore.indexes.json` como base cerrada
   necesaria para levantar Firestore sin reglas abiertas. No son todavía las
   reglas de negocio del MVP. En la Etapa 14 se ampliarán con permisos y tests.
2. Los índices están vacíos porque aún no hay consultas de negocio. Su catálogo
   se implementará en la Etapa 13.
3. Functions se incorpora en la Etapa 8 cuando exista backend compilable. Hosting
   se incorpora en la Etapa 10 cuando haya contenido para servir. Storage, en la
   Etapa 7. No se simula que estos emuladores estén funcionando hoy.
4. Se genera `firebase.json` directamente. **No ejecutes `firebase init`** sobre
   esta configuración: no hace falta y una selección equivocada puede reescribir
   archivos. Las siguientes etapas la ampliarán de forma explícita.
5. Las pruebas usan `demo-mesaflow`, no el alias `dev`. Un proyecto demo no tiene
   recursos reales. Los datos emulados no aparecen en Firebase Console.
6. Todos los servicios se limitan a `127.0.0.1`. La UI es una consola administrativa
   local sin autenticación: no exponer puertos en LAN, túneles ni Internet.

## Puertos

| Servicio | Dirección | Uso |
|---|---|---|
| Authentication | `127.0.0.1:9099` | Registro y login simulados |
| Firestore | `127.0.0.1:8080` | Base de datos y reglas locales |
| Emulator Suite UI | `http://127.0.0.1:4000` | Panel visual local |
| Hub | `127.0.0.1:4400` | Coordinación interna de emuladores |
| Logging | `127.0.0.1:4500` | Logs de la suite |
| Firestore WebSocket | `127.0.0.1:9150` | Actividad de Firestore en la UI |

## Archivos

```text
MesaFlow/
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── package.json
├── package-lock.json
├── scripts/
│   ├── check-environment.ps1
│   ├── check-repository.mjs
│   ├── run-emulators.mjs
│   ├── emulator-smoke.mjs
│   ├── emulator-config.test.mjs
│   ├── tooling-dependencies.test.mjs
│   └── lib/emulator-config.mjs
└── docs/
    ├── stage-04-emulators.md
    └── tooling-security.md
```

- `firebase.json`: declara las reglas, índices y servicios locales.
- `firestore.rules`: bloquea todos los accesos cliente, con o sin sesión.
- `firestore.indexes.json`: JSON válido, sin índices compuestos todavía.
- `run-emulators.mjs`: ejecuta la CLI local con ID demo fijo y no admite argumentos
  adicionales que puedan reemplazarlo por `prod`.
- `emulator-smoke.mjs`: solo usa HTTP loopback y comprueba el entorno antes de
  crear usuarios/documentos temporales. No realiza limpieza global de datos.
- Tests de configuración: verifican hosts, puertos, ID demo y rechazo de overrides.
- Tests de dependencias: verifican APIs afectadas por los parches de seguridad.

## ACCIÓN MANUAL — instalar las dependencias

**Objetivo:** reproducir en una terminal nueva la instalación de esta etapa.

**Dónde hacerlo:** PowerShell en la raíz MesaFlow.

**Pasos exactos:**

1. Ejecutá `npm.cmd ci --ignore-scripts`.
2. Esperá que termine la instalación.
3. Ejecutá `npm.cmd run check`.

**Qué opción seleccionar:** ninguna. `ci` usa el lockfile y `--ignore-scripts`
evita scripts de instalación de terceros que esta etapa no necesita. Revisaremos
ese flag al agregar herramientas de build que sí los requieran.

**Qué valor copiar/guardar:** solo los mensajes de error si la instalación falla.

**Dónde se utilizará después:** todos los comandos npm de Firebase usan la CLI
local; no es necesario reinstalar ni actualizar la CLI global.

**Cómo verificar:** 14 pruebas de configuración y tres de dependencias pasan.

## ACCIÓN MANUAL — iniciar sesión y comprobar proyectos

**Objetivo:** confirmar que la cuenta Google puede ver ambos proyectos reales.

**Dónde hacerlo:** PowerShell y el navegador que abra Firebase CLI.

**Pasos exactos:**

1. Ejecutá `npm.cmd run firebase:login`.
2. Si la CLI pregunta por funciones opcionales o telemetría, podés responder No;
   no son necesarias para MesaFlow.
3. En el navegador elegí la cuenta Google que creó los proyectos, revisá los
   permisos solicitados por Firebase CLI y autorizá solo si estás de acuerdo.
4. Volvé a PowerShell y ejecutá `npm.cmd run firebase:projects`.
5. Comprobá que aparecen exactamente los IDs `mesaflow-desarrollo` y
   `mesaflow-produccion`. Que aparezcan otros proyectos de tu cuenta no es un error.
6. Ejecutá `npm.cmd run firebase:use:dev` para dejar seleccionado desarrollo en
   esta copia local. Esto no despliega ni habilita servicios.

**Qué opción seleccionar:** tu cuenta propietaria o una con acceso autorizado a
ambos proyectos; alias activo `dev`.

**Qué valor copiar/guardar:** ninguno. No copiar tokens OAuth, contraseñas o
archivos de credenciales al repositorio ni al chat.

**Dónde se utilizará después:** configuración y despliegues de las etapas futuras.

**Cómo verificar:** ambos IDs aparecen en la lista y la CLI informa que usa
`dev (mesaflow-desarrollo)`.

El usuario ya confirmó login y listado con los comandos globales equivalentes
`firebase.cmd login` y `firebase.cmd projects:list`. No necesita repetir ese login
si la CLI local reconoce la misma sesión. La comprobación fue informada por el
usuario; Codex no inspeccionó sus credenciales ni recursos remotos.

## ACCIÓN MANUAL — abrir y detener los emuladores

**Objetivo:** comprobar la consola visual sin usar Firebase Console.

**Dónde hacerlo:** PowerShell en MesaFlow y navegador.

**Pasos exactos:**

1. Ejecutá `npm.cmd run emulators`.
2. En la primera ejecución permití que finalicen las descargas. El mensaje
   `Detected demo project ID` debe mencionar `demo-mesaflow`.
3. Esperá `All emulators ready`.
4. Abrí `http://127.0.0.1:4000` en el navegador.
5. Revisá que Authentication y Firestore figuren disponibles.
6. Para detener la suite, volvé a esa terminal y presioná Ctrl+C una vez. Esperá
   el cierre; si Windows pregunta si desea terminar el trabajo por lotes, aceptá.

**Qué opción seleccionar:** proyecto `demo-mesaflow` si la UI muestra un selector;
no usar un ID real ni agregar `--project` al comando npm.

**Qué valor copiar/guardar:** ninguno; los datos locales son temporales.

**Dónde se utilizará después:** pruebas de reglas, seeds, cliente y panel.

**Cómo verificar:** UI local responde y los procesos terminan después de Ctrl+C.

## ACCIÓN MANUAL — ejecutar el smoke test

**Objetivo:** verificar servicios reales del emulador, no solo archivos JSON.

**Dónde hacerlo:** PowerShell en MesaFlow, con los emuladores anteriores apagados.

**Pasos exactos:**

1. Ejecutá `npm.cmd run test:emulators`.
2. Esperá los mensajes de Authentication y Firestore.
3. Confirmá `Smoke test de emuladores aprobado.` y salida con código 0.
4. La suite se apaga sola al finalizar, incluso si el test falla.

**Qué opción seleccionar:** ninguna. El script fija el proyecto demo y los puertos.

**Qué valor copiar/guardar:** salida del error si hay una falla; nunca tokens.

**Dónde se utilizará después:** regresiones locales y futura CI.

**Cómo verificar:** alta anónima, alta/login email-password, lectura/escritura
administrativa, cuatro rechazos de acceso cliente y limpieza pasan.

El valor `Bearer owner` presente en el test es exclusivo del emulador y no es una
credencial de producción. Se usa solo contra direcciones loopback previamente
validadas para preparar y retirar fixtures. La UI también opera con privilegios
administrativos; por eso puede mostrar datos aunque las reglas denieguen clientes.

## Errores frecuentes y límites

- `npm.ps1`/`firebase.ps1` bloqueado: usar los comandos `npm.cmd` de esta guía.
- `MODULE_NOT_FOUND`: falta `npm.cmd ci --ignore-scripts` en este clon.
- `Port ... is already in use`: apagar la instancia anterior con Ctrl+C. No matar
  procesos desconocidos ni cambiar puertos sin actualizar configuración y pruebas.
- Primera descarga lenta: revisar red/proxy; los binarios se reutilizan desde la
  caché del usuario. No se deben subir a GitHub.
- Error Java: comprobar `java -version`; se usa Java 21 LTS.
- Firestore `PERMISSION_DENIED`: es intencional para clientes en esta etapa. No
  cambiar a `allow read, write: if true` para ocultarlo.
- Warning de acceso a servicios no emulados con proyecto demo: es la protección
  esperada. Functions, Storage y Hosting todavía no están habilitados localmente.
- Al finalizar un test puede aparecer que Java recibió SIGINT: es parte del
  apagado de la suite; si el test salió con código 0 no indica una falla del test.
- No hay persistencia automática al cerrar. Los seeds reproducibles llegan en
  Etapa 16; no uses exports de producción en los emuladores.
- El emulador no verifica todos los límites ni exige índices compuestos. Los
  índices se verificarán también contra desarrollo en su etapa, con consultas
  controladas. Que un test local pase no demuestra que producción esté configurada.

## Seguridad de herramientas

La instalación original de la CLI traía avisos moderados de dependencias. Se
aplicaron versiones corregidas mediante overrides limitados a Firebase CLI y se
verificaron con pruebas de compatibilidad y smoke test. Ver
`docs/tooling-security.md`; no ejecutar `npm audit fix --force` indiscriminadamente.

## Criterio de aceptación

- [x] Login y acceso a ambos proyectos confirmados por el usuario.
- [x] Los comandos locales fijan `demo-mesaflow` y rechazan overrides.
- [x] Configuración y compatibilidad de dependencias: 17 pruebas aprobadas.
- [x] Smoke test ejecutado con las dependencias corregidas: aprobado.
- [x] Auditoría npm posterior a las correcciones: 0 vulnerabilidades reportadas.
- [x] UI respondió HTTP 200; el Hub confirmó Auth, Firestore, UI y WebSocket en loopback.
- [x] Apagado con Ctrl+C probado y servicios detenidos.
- [x] No se desplegó ni modificó ningún recurso remoto.

## Commit sugerido

```text
chore(firebase): configure safe local emulators and smoke tests
```

## ACCIÓN MANUAL — guardar y publicar esta etapa

**Objetivo:** conservar en GitHub los cambios comprobados.

**Dónde hacerlo:** PowerShell en MesaFlow, después de detener los emuladores.

**Pasos exactos:**

1. Ejecutá `git status` y revisá que los cambios sean los de esta entrega.
2. Ejecutá:

   ```powershell
   git add .gitignore README.md package.json package-lock.json firebase.json firestore.rules firestore.indexes.json docs/architecture.md docs/master-plan.md docs/stage-04-emulators.md docs/tooling-security.md firebase/README.md scripts/check-environment.ps1 scripts/check-repository.mjs scripts/emulator-config.test.mjs scripts/emulator-smoke.mjs scripts/lib/emulator-config.mjs scripts/run-emulators.mjs scripts/tooling-dependencies.test.mjs
   git commit -m "chore(firebase): configure safe local emulators and smoke tests"
   git push
   git status
   ```

**Qué opción seleccionar:** la rama actual `main`; no agregar otra cuenta/remoto.

**Qué valor copiar/guardar:** ninguno.

**Dónde se utilizará después:** otros clones del proyecto y la futura CI.

**Cómo verificar:** `working tree clean` y sincronización con `origin/main`.

`node_modules` y los logs están excluidos por `.gitignore`. El lockfile grande es
esperado: contiene las versiones y hashes de las dependencias de Firebase CLI.

## Referencias oficiales

- [Instalar y configurar Emulator Suite](https://firebase.google.com/docs/emulator-suite/install_and_configure).
- [Proyecto demo y limitaciones de Firestore Emulator](https://firebase.google.com/docs/emulator-suite/connect_firestore).
- [Authentication Emulator](https://firebase.google.com/docs/emulator-suite/connect_auth).

## Próxima etapa

Etapa 5 — activar y configurar Firebase Authentication en los proyectos reales,
con proveedores Email/Password y Anonymous, dominios autorizados y plantillas.
Que funcione Authentication Emulator no significa que esos proveedores ya estén
habilitados en Firebase Console.
