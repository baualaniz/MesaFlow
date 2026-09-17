# MesaFlow

MesaFlow es un MVP SaaS multiestablecimiento para digitalizar la atención de
mesas: menú web por QR, pedidos y seguimiento para clientes, operación en tiempo
real para el personal, pagos y métricas para administración.

Repositorio público: [github.com/baualaniz/MesaFlow](https://github.com/baualaniz/MesaFlow).

Que el código sea visible públicamente no convierte las credenciales en públicas:
tokens, cuentas de servicio y archivos `.env` reales permanecen fuera de Git.

## Estado

Las **Etapas 1 a 10** están terminadas en su alcance local. Los dos proyectos
Firebase existen, Authentication y Firestore fueron preparados, y Auth,
Firestore, Storage, Functions y tres sitios Hosting se prueban con emuladores.
No hay despliegues cloud. El primer shell Flutter del cliente adelanta la Etapa 17.
La especificación consolidada, las decisiones y el plan completo se
encuentran en:

- `docs/product-spec.md`
- `docs/architecture.md`
- `docs/master-plan.md`
- `docs/stage-01-environment.md`
- `docs/stage-02-repository.md`
- `docs/stage-03-firebase-environments.md`
- `docs/stage-04-emulators.md`
- `docs/stage-05-authentication.md`
- `docs/stage-06-firestore.md`
- `docs/stage-07-storage.md`
- `docs/stage-08-functions.md`
- `docs/stage-09-secrets.md`
- `docs/stage-10-hosting.md`
- `docs/tooling-security.md`
- `SECURITY.md`

## Estructura prevista

```text
apps/
  customer/       Flutter Web/PWA, compatible con Android/iOS
  admin/          Panel web React + TypeScript
  landing/        Landing estática Astro
functions/        Backend seguro Firebase Cloud Functions
packages/
  contracts/      Contratos, enums y validaciones compartidos en TypeScript
firebase/         Seeds y pruebas de reglas
docs/             Arquitectura, operación, seguridad y guías
scripts/          Automatización local segura
```

## Validación rápida

```powershell
npm.cmd ci --ignore-scripts
npm.cmd run check
```

En macOS/Linux se usa `npm run check`. En Windows, `npm.cmd` evita el bloqueo de
`npm.ps1` por la política de PowerShell sin modificarla.

La validación confirma la estructura canónica, los workspaces, los alias Firebase
y la ausencia de archivos o valores con forma de secreto. Además, ejecuta 56
pruebas (14 de configuración, cuatro de herramientas, nueve de Authentication,
ocho de Firestore, ocho de Storage, cuatro de secretos, seis de Hosting y tres de Functions), más
el lint y build TypeScript. Este comando no consulta servicios remotos.

## Configuración Authentication en la nube

Después de configurar proveedores, privacidad, contraseñas y dominios según la
guía de la Etapa 5:

```powershell
npm.cmd run auth:check -- all
```

El comando usa la sesión Firebase CLI existente y consulta solo la configuración
de `dev` y `prod`. No escribe recursos ni obtiene usuarios; las plantillas se
revisan manualmente. La política esperada vive en `firebase/auth-policy.json` y
no se aplica automáticamente a la nube.

## Configuración Firestore en la nube

La Etapa 6 fija Firestore Standard nativo en `southamerica-east1`. Después de
crear manualmente las bases `(default)` según `docs/stage-06-firestore.md`:

```powershell
npm.cmd run firestore:check -- all
npm.cmd run firestore:smoke:dev
```

El primer comando es de solo lectura. El segundo solo acepta desarrollo, crea un
documento técnico con ID aleatorio, verifica su lectura y lo elimina; nunca escribe
en producción.

## Emuladores locales

```powershell
npm.cmd run emulators
```

Abrí `http://127.0.0.1:4000` después de que indique que está listo. Incluye Auth,
Firestore, Storage, Functions y Hosting con proyecto local fijo `demo-mesaflow`. No se
necesita crear ese proyecto en Firebase. La primera ejecución descarga binarios.
Detenelo con Ctrl+C antes de ejecutar el smoke test:

```powershell
npm.cmd run test:emulators
```

El smoke valida los tres sitios Hosting, el endpoint Functions `health`,
Auth/Firestore y seis casos de reglas Storage: roles, membresía activa,
aislamiento entre tenants, tipos, tamaños, metadata y rutas.

Los destinos web locales son cliente en `http://127.0.0.1:5100`, panel en
`http://127.0.0.1:5105` y landing en `http://127.0.0.1:5106`. Firebase informa
las direcciones definitivas al iniciar. La guía completa está en
`docs/stage-10-hosting.md`.

## Cloud Functions local

La base TypeScript usa Functions 2nd gen y runtime desplegable Node 22. El build,
lint y las pruebas unitarias se ejecutan sin facturación:

```powershell
npm.cmd run functions:check
```

`npm.cmd run test:emulators` comprueba además la función HTTP real en
`http://127.0.0.1:5001/demo-mesaflow/southamerica-east1/health`. No se despliega
nada; Blaze solo se reconsiderará en la etapa de publicación del backend.

## Imágenes sin tarjeta

El MVP usa fotografías empaquetadas dentro de las aplicaciones y no requiere un
bucket real, Blaze ni una tarjeta. Las rutas y reglas de Cloud Storage permanecen
probadas como extensión opcional. Si se activa en el futuro, el bucket se comprueba
sin escribir con:

```powershell
npm.cmd run storage:check -- dev
```

El primer shell visual está en `apps/customer`. Se ejecuta con:

```powershell
cd apps/customer
flutter.bat pub get
flutter.bat build web
cd ../..
npm.cmd run preview:customer
```

Después abrí `http://127.0.0.1:7357`. La vista previa se detiene con Ctrl+C.

El test inicia/apaga los servicios y elimina solo los usuarios/documentos que
creó. Nunca usa desarrollo ni producción. No exponer la UI fuera de esta máquina.

La CLI local se invoca también con `npm.cmd run firebase:login`,
`npm.cmd run firebase:projects` y `npm.cmd run firebase:use:dev`. Son comandos de
autenticación/listado/selección, no de despliegue.

## Ambientes Firebase

- `dev` → `mesaflow-desarrollo`.
- `prod` → `mesaflow-produccion`.
- `default` → desarrollo.

Los alias están en `.firebaserc` y no son credenciales. Una selección activa de
Firebase CLI puede prevalecer sobre `default`; los futuros comandos operativos
especificarán siempre `--project`. No ejecutar despliegues en esta etapa.

## Comprobar el entorno en Windows

Desde PowerShell, en la raíz del repositorio:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\check-environment.ps1
```

El script no instala ni modifica herramientas; informa qué está listo y qué
falta. Las instrucciones manuales completas están en `docs/master-plan.md`.

## Seguridad de secretos

La configuración está separada en tres niveles:

- `.env.example`: identificadores públicos que pueden llegar al frontend.
- `functions/.env.example`: identificadores privados, pero no credenciales.
- `functions/.secret.local.example`: nombres y placeholders de secretos para el
  emulador; la copia real `.secret.local` está ignorada.

Los tokens reales de Mercado Pago y WhatsApp se guardarán en Secret Manager y se
vincularán solo con cada función consumidora. Nunca deben incluirse en Flutter,
el panel, la landing ni Git. Verificar la política con:

```powershell
npm.cmd run secrets:check
```
