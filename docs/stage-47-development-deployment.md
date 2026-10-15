# Etapa 47 — Despliegue controlado a desarrollo

Estado: **completa en el alcance gratuito autorizado**. Firestore Rules,
índices y los tres sitios Hosting están publicados en desarrollo; el smoke HTTP
y la verificación real en navegador pasaron. Functions queda diferido porque el
usuario no autorizó Blaze.

## Recursos creados

La consulta previa encontró únicamente el sitio predeterminado. Se crearon los
dos secundarios y se fijó esta asociación exacta:

| Target | Sitio | URL |
|---|---|---|
| `customer` | `mesaflow-desarrollo` | `https://mesaflow-desarrollo.web.app` |
| `admin` | `mesaflow-desarrollo-admin` | `https://mesaflow-desarrollo-admin.web.app` |
| `landing` | `mesaflow-desarrollo-landing` | `https://mesaflow-desarrollo-landing.web.app` |

No se creó ni publicó ningún sitio de producción.

## App Check

Cliente Flutter y panel React comparten la app Web Firebase
`1:685584709099:web:2d9cac26a22fbdcae815ae`. Ambos inicializan App Check antes
de Auth, Firestore y Functions, usan reCAPTCHA Enterprise y habilitan la
renovación automática del token. El emulador no necesita clave ni proveedor.

La Content Security Policy permite solamente los orígenes de reCAPTCHA indicados
por Google para scripts, conexión e iframe. El build cloud exige la variable
pública `MESAFLOW_RECAPTCHA_ENTERPRISE_SITE_KEY`; su ausencia detiene la
compilación. La clave es pública, pero no se guarda en Git para evitar mezclar
ambientes.

### Acción manual completada: registrar App Check

1. Abrir Google Cloud Console con el proyecto `mesaflow-desarrollo` seleccionado.
2. Ir a **Seguridad → reCAPTCHA** (puede mostrarse como Fraud Defense) y habilitar
   la API de reCAPTCHA Enterprise si lo solicita.
3. Crear una clave de tipo **Sitio web**, basada en puntuación y sin casilla.
4. Autorizar solo estos dominios:
   - `mesaflow-desarrollo.web.app`
   - `mesaflow-desarrollo.firebaseapp.com`
   - `mesaflow-desarrollo-admin.web.app`
   - `mesaflow-desarrollo-admin.firebaseapp.com`
5. No agregar `localhost`, no aceptar una actualización de facturación y detener
   el proceso si la consola exige una tarjeta.
6. Copiar la **clave del sitio** pública; no copiar claves API privadas.
7. En Firebase Console, abrir `mesaflow-desarrollo` → **App Check** → **Apps**.
8. En `mesaflow_customer (web)`, elegir **Registrar**, proveedor
   **reCAPTCHA Enterprise**, seleccionar o pegar la clave anterior y confirmar.
9. No habilitar todavía enforcement para Authentication ni Firestore. Primero se
   publicará y se observarán métricas; las callables ya exigen App Check desde el
   código de Functions.
10. En Firebase Console abrir **Authentication → Configuración → Dominios
    autorizados** y agregar:
    - `mesaflow-desarrollo-admin.web.app`
    - `mesaflow-desarrollo-admin.firebaseapp.com`
11. No agregar los dominios de producción en esta etapa.

Como cliente y panel usan el mismo App ID, se realiza un único registro con los
cuatro dominios anteriores. La landing no usa Firebase y no necesita App Check.

El usuario confirmó ambos controles el 15 de octubre de 2026. La clave pública
solo se entrega al proceso de build mediante variable de entorno y no se guarda
en el repositorio.

La primera clave entregada pertenecía a otro proyecto de Google Cloud. Se creó
una nueva en `mesaflow-desarrollo`, basada en puntuación y limitada a los cuatro
dominios previstos. La consulta remota confirmó su proyecto, tipo y dominios;
Firebase App Check quedó actualizado con umbral `0.5` y TTL de una hora, sin
activar enforcement. La clave pública solo se inyectó en los builds y no se
versionó.

La primera carga cloud también reveló que la CSP de Flutter permitía los
bootstrap dinámicos de Core, Firestore, Functions y Auth, pero no el nuevo
bootstrap de `firebase_app_check`. Se agregó únicamente su hash SHA-256 exacto,
sin habilitar `unsafe-inline`. Una sesión limpia del navegador confirmó que
cliente y panel inicializan App Check sin errores ni advertencias.

## Guardas de despliegue

`firebase/deploy-policy.json` separa los componentes que no requieren Blaze
(`firestore:rules`, `firestore:indexes`, `hosting`) de `functions`. El script de
publicación:

- acepta solamente `mesaflow-desarrollo` como confirmación;
- rechaza cualquier target cruzado con producción;
- exige que el registro manual de App Check esté confirmado;
- exige que los dominios del panel estén autorizados en Firebase Auth;
- exige la clave pública solo en la sesión de PowerShell;
- exige que todos los cambios versionables estén guardados en un commit;
- ejecuta todos los checks y builds antes de publicar;
- usa `--project mesaflow-desarrollo` y excluye Functions y Storage.

El diagnóstico local, que no modifica la nube, es:

```powershell
npm.cmd run deploy:check:dev
```

Después de completar la acción manual y actualizar el estado versionado, la
publicación gratuita se ejecutará con:

```powershell
$env:MESAFLOW_RECAPTCHA_ENTERPRISE_SITE_KEY = "CLAVE_PUBLICA"
npm.cmd run deploy:dev:free -- --confirm=mesaflow-desarrollo
Remove-Item Env:MESAFLOW_RECAPTCHA_ENTERPRISE_SITE_KEY
```

## Functions y costo

Cloud Functions for Firebase requiere Blaze. Como no hay consentimiento para
vincular facturación, `functions` no forma parte del script gratuito y su estado
es `blocked-no-user-consent`. Tampoco se cargaron secretos cloud de Mercado Pago
o WhatsApp. Esta decisión evita cargos, pero significa que QR, pedidos,
asistencia y pagos seguirán siendo recorridos completos solo en Emulator Suite
hasta autorizar y configurar el backend cloud.

## Verificación realizada

- listado remoto: sitio predeterminado detectado antes de crear secundarios;
- dos sitios secundarios creados correctamente;
- 5 pruebas de política de deploy aprobadas;
- 3 pruebas del smoke HTTP aprobadas;
- 7 pruebas de configuración Hosting aprobadas;
- 3 pruebas Flutter de configuración App Check aprobadas;
- 4 pruebas del ambiente administrativo aprobadas;
- builds emulator y development de las tres interfaces aprobados;
- regresión completa de Emulator Suite y navegador aprobada;
- `deploy:check:dev` confirma las guardas y el bloqueo de Functions;
- deploy gratuito completado: Rules, indexes y los tres targets Hosting;
- smoke HTTP cloud aprobado en raíces, rutas profundas y 404 de landing;
- panel cloud carga su pantalla de acceso;
- clave reCAPTCHA Enterprise validada remotamente dentro del proyecto correcto;
- App Check actualizado y verificado en sesiones limpias de cliente y panel;
- CSP del cliente ampliada solo con el hash exacto del bootstrap App Check;
- la revisión visual encontró CTAs locales en la landing; el build se corrigió
  para inyectar las URLs cloud y recompilar si cambia la clave pública;
- la landing corregida se republicó y el navegador confirmó que sus CTAs ya
  apuntan a los sitios cloud de cliente y panel.

## Cierre

El alcance gratuito queda aprobado. La raíz del cliente muestra la indicación
para escanear un QR, el panel muestra el acceso y la landing enlaza ambos sitios.
Una ruta de mesa sin sesión válida muestra el error controlado correspondiente,
porque el canje seguro del QR depende de Functions. El flujo completo de QR,
pedidos, asistencia y pagos permanece disponible en Emulator Suite; su traslado
a cloud requiere una decisión futura y explícita sobre Blaze.

## Fuentes oficiales

- [App Check con reCAPTCHA Enterprise para Web](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider)
- [App Check en Flutter](https://firebase.google.com/docs/app-check/flutter/default-providers)
- [Firebase Hosting multi-sitio](https://firebase.google.com/docs/hosting/multisites)
- [Cuotas y plan de Cloud Functions](https://firebase.google.com/docs/functions/quotas)
