# MesaFlow

MesaFlow es un MVP SaaS multiestablecimiento para digitalizar la atención de
mesas: menú web por QR, pedidos y seguimiento para clientes, operación en tiempo
real para el personal, pagos y métricas para administración.

Repositorio público: [github.com/baualaniz/MesaFlow](https://github.com/baualaniz/MesaFlow).

Que el código sea visible públicamente no convierte las credenciales en públicas:
tokens, cuentas de servicio y archivos `.env` reales permanecen fuera de Git.

## Estado

Las **Etapas 1 a 3 — entorno, monorepo y alias Firebase** están terminadas.
La **Etapa 4** incorpora emuladores locales probados; el usuario confirmó acceso
con Firebase CLI a ambos proyectos reales. Todavía no hay aplicaciones de negocio
ni despliegues.
La especificación consolidada, las decisiones y el plan completo se
encuentran en:

- `docs/product-spec.md`
- `docs/architecture.md`
- `docs/master-plan.md`
- `docs/stage-01-environment.md`
- `docs/stage-02-repository.md`
- `docs/stage-03-firebase-environments.md`
- `docs/stage-04-emulators.md`
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
y la ausencia de nombres de archivos que normalmente contienen secretos. Además,
ejecuta 14 pruebas de configuración y tres de compatibilidad de herramientas.

## Emuladores locales

```powershell
npm.cmd run emulators
```

Abrí `http://127.0.0.1:4000` después de que indique que está listo. Incluye Auth y
Firestore, con reglas cerradas y proyecto local fijo `demo-mesaflow`. No se
necesita crear ese proyecto en Firebase. La primera ejecución descarga binarios.
Detenelo con Ctrl+C antes de ejecutar el smoke test:

```powershell
npm.cmd run test:emulators
```

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

`.env.example` contiene exclusivamente nombres y valores ficticios. Los tokens
de Mercado Pago y WhatsApp se guardarán en Secret Manager y solo serán leídos
por Cloud Functions. Nunca deben incluirse en Flutter, el panel, la landing ni
Git.
