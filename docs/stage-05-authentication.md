# Etapa 5 — Firebase Authentication

## Objetivo

Configurar la identidad de personal y clientes en los proyectos reales,
manteniendo la separación dev/prod y sin confundir autenticación con permisos.

## Estado de esta entrega

El verificador local y sus nueve pruebas están implementados. La primera lectura
remota, realizada el 2026-09-03, confirmó Email/Password y privacidad de correos en
ambos proyectos. Detectó Anonymous sin habilitar, política mínima de contraseñas
pendiente y dominios loopback en producción. Aunque el usuario había confirmado
los proveedores, se solicitó revisar Guardar en Anonymous y repetir la lectura.
La etapa no se cierra hasta confirmar los ajustes y las plantillas.
No se crearon cuentas reales ni se enviaron correos.

## Resultado esperado

| Ajuste | Desarrollo | Producción |
|---|---|---|
| Proyecto | `mesaflow-desarrollo` | `mesaflow-produccion` |
| Email/Password | Habilitado | Habilitado |
| Enlace por email sin contraseña | Deshabilitado | Deshabilitado |
| Anonymous/Anónimo | Habilitado | Habilitado |
| Teléfono y otros proveedores | No habilitarlos para el MVP | No habilitarlos para el MVP |
| Enumeración de correos | Protección habilitada | Protección habilitada |
| Contraseña nueva | Mínimo 12 caracteres, exigida | Mínimo 12 caracteres, exigida |
| `localhost` autorizado | Sí | No |
| Plantillas | Español; remitente MesaFlow (desarrollo) | Español; remitente MesaFlow |

La mínima longitud es una decisión del MVP. Si ya hay requisitos más fuertes,
no hace falta debilitarlos. No se activan MFA/SMS, funciones de pago o actualizaciones
a Identity Platform sin una decisión explícita posterior.

## Arquitectura de identidad

- Personal: Email/Password. Una cuenta sin membresía activa no puede entrar a un
  establecimiento. Un eventual alta directa contra la API de Auth no crea permisos.
- Cliente: Anonymous Auth provee UID. No es una cuenta de personal ni concede
  acceso a una mesa; la sesión de mesa se autoriza al canjear un QR válido en backend.
- Roles: `owner`, `manager`, `staff` y `kitchen`, almacenados en la membresía por
  establecimiento. El cliente jamás escribe su propio rol.
- Separación SaaS: los restaurantes compartirán el Auth del mismo ambiente. No
  vamos a crear tenants de Identity Platform por restaurante. El aislamiento lo
  implementan membresías, reglas y backend en las etapas correspondientes.
- Firebase crea usuarios automáticamente al registrarse; habilitar proveedores
  ahora no crea ningún owner ni tabla de miembros.
- Panel futuro: no habrá registro público con permisos automáticos. La recuperación
  de contraseña usará un mensaje genérico que no revele si existe el correo.
- Se requerirá email verificado para operar como personal al implementar sus
  reglas/servicios. Esta guía no afirma que esa restricción ya exista en el código.
- `firebase/auth-policy.json` documenta lo esperado y alimenta el chequeo. **No es
  un archivo desplegable y no cambia Firebase por sí solo.**

## Dependencias y archivos

No se agregaron paquetes. El verificador utiliza la CLI local fijada en la etapa
anterior, reutiliza la sesión existente y solo consulta configuración.

```text
MesaFlow/
├── firebase/auth-policy.json
├── scripts/
│   ├── check-auth-config.mjs
│   ├── auth-config.test.mjs
│   ├── check-repository.mjs
│   └── lib/auth-config.mjs
├── package.json
├── README.md
└── docs/
    ├── architecture.md
    ├── master-plan.md
    └── stage-05-authentication.md
```

- `auth-policy.json`: política mínima, idioma y nombres de remitente propuestos.
- `lib/auth-config.mjs`: valida la política, evalúa respuestas y define la lectura
  HTTP GET a la configuración de un proyecto concreto.
- `check-auth-config.mjs`: acepta `dev`, `prod` o `all`; imprime solo resultados
  sanitizados, nunca la respuesta completa, tokens o datos de usuarios.
- `auth-config.test.mjs`: nueve tests sin red, incluyendo configuración incompleta,
  roles de entorno, privacidad, dominios y transporte de solo lectura.
- `check-repository.mjs` y `package.json`: incorporan las validaciones a `check`.

## ACCIÓN MANUAL 1 — habilitar los proveedores

**Objetivo:** permitir acceso del personal por contraseña y del cliente anónimo.

**Dónde hacerlo:** [Firebase Console](https://console.firebase.google.com/), no
la consola del emulador en `127.0.0.1:4000`.

**Pasos exactos:**

1. Abrí `mesaflow-desarrollo` y buscá **Authentication / Autenticación** en el menú.
   Puede estar agrupado bajo Security o Build según el idioma/versión de Console.
2. Si aparece **Comenzar / Get started**, abrí el asistente básico. Si ofrece
   aceptar términos nuevos o cambiar de plan, detenete y revisalo antes de aceptar.
3. Entrá en **Método de acceso / Sign-in method**.
4. Seleccioná **Correo electrónico/contraseña / Email/Password**.
5. Habilitá la opción de email y contraseña. Dejá apagada **Enlace por correo
   electrónico (acceso sin contraseña) / Email link**. Guardá.
6. Seleccioná **Anónimo / Anonymous**, habilitalo y guardá.
7. No habilites otros proveedores ni limpieza automática de usuarios anónimos.
8. Repetí los pasos en `mesaflow-produccion`, comprobando el ID antes de guardar.

**Qué opción seleccionar:** Email/Password y Anonymous habilitados; email link no.

**Qué valor copiar/guardar:** ninguno; no hacen falta claves de aplicaciones web.

**Dónde se utilizará después:** Flutter cliente y panel administrativo.

**Cómo verificar:** ambos proveedores muestran estado habilitado en cada proyecto.

El usuario confirmó esta acción; la lectura remota posterior detectó Anonymous
pendiente. Se debe revisar su guardado en ambos proyectos y repetir el chequeo.

## ACCIÓN MANUAL 2 — privacidad y política de contraseñas

**Objetivo:** reducir divulgación de cuentas y evitar contraseñas nuevas cortas.

**Dónde hacerlo:** Authentication → **Configuración / Settings**, en ambos proyectos.

**Pasos exactos:**

1. Buscá **Protección contra enumeración de correos / Email enumeration protection**,
   generalmente dentro de administración de cuentas o acciones del usuario.
2. Confirmá que esté habilitada; si ya está activa, dejala así.
3. Buscá **Política de contraseñas / Password policy**.
4. Elegí el modo **Exigir / Require** y longitud mínima **12**.
5. Conservá el máximo predeterminado. No exigimos nuevas reglas de composición
   adicionales; podés conservar las que ya estén activas.
6. No marques opciones para forzar cambios de contraseñas a usuarios existentes
   sin revisar primero su efecto. Esta etapa no necesita bloquear cuentas previas.
7. Guardá y repetí en el otro proyecto.

**Qué opción seleccionar:** privacidad habilitada y política exigida, mínimo 12.
La API representa la exigencia como `ENFORCE`.

**Qué valor copiar/guardar:** ninguno; no se ingresa una contraseña en este paso.

**Dónde se utilizará después:** alta/recuperación del personal y validación de UI.

**Cómo verificar:** la sección muestra la política guardada y el comando remoto
`auth:check` marca estos controles como OK.

Si la consola no presenta esas opciones, no aceptes una actualización de plan para
continuar: compartí el nombre de la sección o el mensaje para revisar el caso.

## ACCIÓN MANUAL 3 — dominios autorizados

**Objetivo:** autorizar los hosts propios de cada ambiente sin mezclar entornos.

**Dónde hacerlo:** Authentication → Settings → **Dominios autorizados / Authorized
domains**.

**Pasos exactos:**

1. En `mesaflow-desarrollo`, agregá `localhost` si falta. Escribilo sin `http://`,
   sin puerto y sin barra final.
2. Conservá los dominios gestionados por Firebase correspondientes al proyecto.
3. En `mesaflow-produccion`, no agregues `localhost` ni direcciones loopback. Si
   ya aparecen, revisá y quitá esos hosts locales de la lista de producción.
4. No agregues `github.com`, dominios de terceros, comodines ni direcciones de otro
   proyecto. La URL del repo público no es un host de inicio de sesión de MesaFlow.
5. Los hosts concretos del panel/cliente y un dominio propio se revisarán al
   configurar Hosting; no los inventes ahora.

**Qué opción seleccionar:** Agregar dominio → `localhost`, únicamente en desarrollo.

**Qué valor copiar/guardar:** ninguno.

**Dónde se utilizará después:** pruebas web y redirecciones/enlaces de autenticación.

**Cómo verificar:** `localhost` aparece en dev y no en prod; el chequeo remoto pasa.

Los proyectos nuevos no necesariamente incluyen localhost automáticamente. Esta
lista no sustituye autorización, protección de APIs ni reglas de Firestore.

## ACCIÓN MANUAL 4 — plantillas de correo

**Objetivo:** preparar mensajes coherentes para verificación y recuperación.

**Dónde hacerlo:** Authentication → **Plantillas / Templates** de cada proyecto.

**Pasos exactos:**

1. Revisá las plantillas **Verificación de correo**, **Restablecimiento de
   contraseña** y **Cambio de dirección de correo** cuando estén disponibles.
2. Seleccioná **Español** como idioma predeterminado donde la consola lo permita.
3. Usá `MesaFlow (desarrollo)` como nombre del remitente en dev y `MesaFlow` en prod.
4. Conservá el remitente y la URL de acción gestionados por Firebase. No cambies
   esa URL por localhost ni por una pantalla de MesaFlow que todavía no exista.
5. Conservá el texto estándar localizado y sus placeholders, especialmente el
   enlace de acción. No inventes direcciones de correo de soporte.
6. Guardá y verificá la vista previa. No envíes mensajes de prueba a terceros.

**Qué opción seleccionar:** español y nombre de marca, manteniendo acción/remitente
gestionados. No configurar dominio de correo propio ni SMTP en esta etapa.

**Qué valor copiar/guardar:** ninguno. No compartir enlaces de recuperación reales.

**Dónde se utilizará después:** recuperación del panel y verificación del personal.
Los clientes SDK establecerán también el idioma `es` cuando sean implementados.

**Cómo verificar:** vista previa y configuración guardada en español. Este punto
se revisa manualmente: `auth:check` no lee ni valida el contenido de las plantillas.

## Comandos y pruebas

Validación local, sin contactar a Firebase:

```powershell
npm.cmd run check
```

Verificación remota de solo lectura usando tu sesión existente de CLI:

```powershell
npm.cmd run auth:check -- all
```

Podés revisar un solo ambiente cambiando `all` por `dev` o `prod`. No agregues un
token como argumento. Si falta sesión, ejecutá `npm.cmd run firebase:login`.

El script consulta únicamente configuración del proyecto: no obtiene listas de
usuarios, no hace registro/login de clientes, no manda correos y no ejecuta PATCH
ni despliegues. Si la CLI necesita renovar su sesión, reutiliza el flujo normal.
Utiliza módulos internos de la CLI fijada: al actualizarla se deben repetir estas
pruebas, no se presupone compatibilidad con cualquier versión.

`PENDIENTE` significa que un ajuste todavía no coincide; no es una orden para
reinstalar dependencias. Después de corregirlo en Console, repetí el comando.
Un fallo de acceso/API/conexión se informa sin volcar la respuesta remota: no se
habilitan APIs ni planes automáticamente como solución.

El smoke test Auth de la Etapa 4 ya comprobó Anonymous y Email/Password localmente.
Las políticas y plantillas de la nube NO se sincronizan automáticamente con el
emulador. La prueba de login real, correo recibido, reset y sesión del panel se
realizará en desarrollo al registrar e integrar las apps (Etapas 17/31). No se
declara probado ese recorrido real en esta etapa.

## Errores frecuentes

- **Console vs. Emulator UI:** la configuración de proveedores reales se hace en
  Firebase Console; cambiar datos en localhost no configura dev ni prod.
- **Usuarios vacíos:** esperado; habilitar un proveedor no crea usuarios.
- **No puedo elegir región:** Authentication no pide seleccionar la región de
  Firestore. La base de datos se configurará en la Etapa 6.
- **No veo un menú con el nombre exacto:** buscá el concepto indicado; no aceptes
  nuevos términos ni costos solo para encontrarlo.
- **Ambos proyectos aparecen en la CLI pero auth:check falla:** poder listar un
  proyecto no garantiza permisos para leer Auth. Revisá cuenta e inicialización;
  no agregues roles amplios a una cuenta sin evaluar la necesidad.
- **Se solicita API key del cliente:** todavía no se requiere para el chequeo;
  se obtendrá al registrar las apps y no es una clave administrativa.

## Criterio de aceptación

- [x] Email/Password confirmado por la API en dev y prod.
- [ ] Anonymous confirmado por la API en dev y prod tras revisar Guardar.
- [x] Política local, verificador de solo lectura y nueve tests implementados.
- [x] Suite local completa: 26 pruebas aprobadas.
- [x] Privacidad de correos verificada remotamente en ambos proyectos.
- [ ] Política mínima de contraseñas verificada remotamente en ambos proyectos.
- [ ] Dominios autorizados verificados remotamente en ambos proyectos.
- [ ] Plantillas revisadas manualmente en español.
- [x] No se crearon usuarios ni se modificó configuración remota mediante scripts.

## ACCIÓN MANUAL — guardar los cambios

**Objetivo:** conservar la implementación y guía en GitHub.

**Dónde hacerlo:** PowerShell en MesaFlow.

**Pasos exactos:**

1. Revisá `git status`.
2. Ejecutá:

   ```powershell
   git add firebase/auth-policy.json scripts/lib/auth-config.mjs scripts/check-auth-config.mjs scripts/auth-config.test.mjs scripts/check-repository.mjs package.json README.md docs/architecture.md docs/master-plan.md docs/stage-05-authentication.md
   git commit -m "chore(auth): add authentication policy and read-only checks"
   git push
   git status
   ```

**Qué opción seleccionar:** la rama actual `main`.

**Qué valor copiar/guardar:** ninguno; la política contiene solo ajustes esperados.

**Dónde se utilizará después:** CI local y futuras interfaces.

**Cómo verificar:** `working tree clean` y sincronización con GitHub.

## Commit sugerido

`chore(auth): add authentication policy and read-only checks`

## Fuentes oficiales consultadas

- [Email/Password y política de contraseñas](https://firebase.google.com/docs/auth/web/password-auth).
- [Autenticación anónima](https://firebase.google.com/docs/auth/web/anonymous-auth).
- [Privacidad de correos](https://docs.cloud.google.com/identity-platform/docs/admin/email-enumeration-protection).
- [Dominios autorizados y localhost](https://firebase.google.com/docs/auth/faq-and-troubleshooting).
- [Plantillas e idioma de acciones de correo](https://firebase.google.com/docs/auth/custom-email-handler).
