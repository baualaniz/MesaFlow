# Etapa 47 — Despliegue controlado a desarrollo

Estado: **en progreso**. Los tres sitios Hosting de desarrollo existen, los
targets están versionados y ambos clientes inicializan App Check. La publicación
permanece bloqueada hasta registrar la clave pública de reCAPTCHA Enterprise.
Functions continúa fuera de alcance porque el usuario no autorizó Blaze.

## Recursos creados

La consulta previa encontró únicamente el sitio predeterminado. Se crearon los
dos secundarios y se fijó esta asociación exacta:

| Target | Sitio | URL |
|---|---|---|
| `customer` | `mesaflow-desarrollo` | `https://mesaflow-desarrollo.web.app` |
| `admin` | `mesaflow-desarrollo-admin` | `https://mesaflow-desarrollo-admin.web.app` |
| `landing` | `mesaflow-desarrollo-landing` | `https://mesaflow-desarrollo-landing.web.app` |

No se creó ningún sitio de producción y no se publicó contenido todavía.

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

### Acción manual pendiente: registrar App Check

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
- `deploy:check:dev` confirma el bloqueo de Functions y el pendiente App Check.

## Criterio de cierre restante

- registrar App Check sin facturación y compilar con la clave real;
- publicar rules, indexes y los tres sitios;
- ejecutar `npm.cmd run deploy:smoke:dev` y el recorrido de navegador sobre las
  tres URLs;
- decidir explícitamente si Functions se mantiene local o se autoriza Blaze.

## Fuentes oficiales

- [App Check con reCAPTCHA Enterprise para Web](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider)
- [App Check en Flutter](https://firebase.google.com/docs/app-check/flutter/default-providers)
- [Firebase Hosting multi-sitio](https://firebase.google.com/docs/hosting/multisites)
- [Cuotas y plan de Cloud Functions](https://firebase.google.com/docs/functions/quotas)
