# Etapa 48 — Producción, dominios y rollback

Estado: **en progreso, sin despliegues productivos**. El repositorio ya separa y
protege el camino de publicación a `mesaflow-produccion`. La inspección remota de
solo lectura confirmó Authentication, Firestore y los tres sitios Hosting; App
Check productivo quedó validado y resta autorizar los dominios del panel.

## Estado remoto verificado

La revisión del 15 de octubre de 2026 confirmó:

- Email/Password y Anonymous habilitados en producción;
- enlace por correo y teléfono deshabilitados;
- protección contra enumeración y contraseña mínima de 12 caracteres;
- producción sin `localhost` ni otros dominios loopback;
- Firestore `(default)` nativo, Standard, en `southamerica-east1`;
- sitio Hosting principal existente: `mesaflow-produccion`;
- sitios `mesaflow-produccion-admin` y `mesaflow-produccion-landing` creados y
  verificados el 16 de octubre de 2026.
- clave `mesaflow-prod-web` validada en el proyecto productivo, de tipo `SCORE`,
  limitada a los cuatro dominios previstos;
- App Check registrado con umbral `0.5`, TTL de una hora y enforcement apagado.

No se crearon sitios, usuarios, documentos, índices ni reglas durante esa
revisión.

## Dominios elegidos para el MVP

El MVP usará inicialmente los subdominios HTTPS gratuitos administrados por
Firebase:

| Aplicación | URL productiva prevista |
|---|---|
| Cliente | `https://mesaflow-produccion.web.app` |
| Panel | `https://mesaflow-produccion-admin.web.app` |
| Landing | `https://mesaflow-produccion-landing.web.app` |

Esto evita comprar un dominio o modificar DNS en esta etapa. Un dominio propio
se podrá conectar después sin cambiar la arquitectura; antes habrá que validar
propiedad, DNS, enlaces canónicos, dominios Auth y dominios de reCAPTCHA.

## Guardas implementadas

- `.firebaserc` declara tres targets productivos independientes.
- El build admite `prod` y compila Flutter/React con el proyecto productivo.
- La landing enlaza únicamente las tres URLs productivas.
- La clave pública App Check entra solo por
  `MESAFLOW_RECAPTCHA_ENTERPRISE_SITE_KEY` y no queda en Git.
- El despliegue exige un commit limpio, el proyecto exacto y la frase adicional
  `PUBLICAR-MESAFLOW-PRODUCCION`.
- El comando solo admite Rules, índices y Hosting; excluye Functions.
- El smoke productivo controla raíces, rutas profundas, 404, CSP y anti-caché.
- Desarrollo continúa siendo el proyecto predeterminado de la CLI.

Comprobación local, sin acceso cloud:

```powershell
npm.cmd run deploy:check:prod
```

La salida actual muestra un pendiente intencional y bloquea la
publicación.

## ACCIÓN MANUAL 1 — crear los dos sitios faltantes

**Dónde:** Firebase Console, proyecto `mesaflow-produccion`, sección Hosting.

1. Confirmá en el selector superior que el proyecto sea
   `mesaflow-produccion`.
2. Abrí **Hosting**.
3. Elegí **Agregar otro sitio**.
4. Creá exactamente `mesaflow-produccion-admin`.
5. Repetí **Agregar otro sitio** y creá exactamente
   `mesaflow-produccion-landing`.
6. No conectes un dominio personalizado y no aceptes una actualización de plan.

El sitio principal `mesaflow-produccion` ya existe; no hay que recrearlo.

## ACCIÓN MANUAL 2 — App Check de producción

La clave de desarrollo no debe reutilizarse.

1. En Google Cloud Console seleccioná el proyecto **mesaflow-produccion**.
2. Abrí **reCAPTCHA Enterprise → Claves → Crear clave**.
3. Nombre sugerido: `mesaflow-prod-web`.
4. Elegí **Sitio web** e integración **basada en puntuación**.
5. Desactivá la opción de permitir todos los dominios.
6. Agregá exactamente:
   - `mesaflow-produccion.web.app`;
   - `mesaflow-produccion.firebaseapp.com`;
   - `mesaflow-produccion-admin.web.app`;
   - `mesaflow-produccion-admin.firebaseapp.com`.
7. Creá la clave y copiá únicamente su **ID público**; no es una clave secreta.
8. En Firebase Console → **App Check**, elegí la app Web con ID
   `1:619377674437:web:3643ee20e7c37954a288ac`.
9. Registrá reCAPTCHA Enterprise con ese ID, umbral `0.5` y TTL de una hora.
10. No actives enforcement todavía.

## ACCIÓN MANUAL 3 — dominios de Authentication

En Firebase Console → Authentication → Configuración → Dominios autorizados,
agregá:

- `mesaflow-produccion-admin.web.app`;
- `mesaflow-produccion-admin.firebaseapp.com`.

No agregues `localhost`, IPs, esquemas `https://`, puertos ni comodines.

## Publicación posterior

Cuando las tres acciones anteriores estén confirmadas, se actualizará la
política versionada y recién entonces se habilitará este comando:

```powershell
$env:MESAFLOW_RECAPTCHA_ENTERPRISE_SITE_KEY = "ID_PUBLICO_PRODUCTIVO"
npm.cmd run deploy:prod:free -- --confirm=mesaflow-produccion --release=PUBLICAR-MESAFLOW-PRODUCCION
Remove-Item Env:MESAFLOW_RECAPTCHA_ENTERPRISE_SITE_KEY
npm.cmd run deploy:smoke:prod
```

No se debe ejecutar antes: las guardas fallarán de manera deliberada. La clave
no debe guardarse en `.env`, documentación, capturas ni commits.

## Functions, secretos y webhook

Functions permanece fuera del despliegue porque requiere Blaze. En consecuencia,
el canje cloud de QR, pedidos, asistencia, pagos y webhook de Mercado Pago siguen
disponibles únicamente en Emulator Suite. No se cargaron credenciales productivas
de Mercado Pago o WhatsApp ni se registró un webhook público.

## Rollback

Si una publicación estática futura falla:

1. detener nuevas publicaciones;
2. abrir Firebase Console → Hosting → sitio afectado → historial de versiones;
3. elegir la última versión estable y seleccionar **Rollback**;
4. repetir el smoke productivo;
5. revertir el commit causante en Git y volver a ejecutar las pruebas;
6. para Rules o índices, desplegar la revisión anterior conocida desde un
   checkout limpio; nunca editar producción manualmente para improvisar el fix.

Cada sitio conserva su historial y se revierte por separado. El rollback de
Hosting no modifica Firestore ni Authentication.

## Verificación automatizada actual

```powershell
npm.cmd run test:hosting-config
npm.cmd run test:deploy-config
npm.cmd run test:deployment-smoke
npm.cmd run deploy:check:prod
```

Resultado: 22 pruebas aprobadas y preflight productivo bloqueado únicamente por
los tres pasos manuales documentados.

## Criterio de cierre

- [x] Authentication y Firestore productivos verificados en solo lectura.
- [x] Targets, build, smoke, doble confirmación y rollback preparados.
- [x] Estrategia HTTPS gratuita sin dominio propio definida.
- [x] Sitios Hosting de panel y landing creados y verificados.
- [x] App Check productivo registrado y validado sin enforcement.
- [ ] Dominios del panel autorizados en Authentication.
- [ ] Rules, índices y tres sitios publicados y verificados.
- [ ] Webhook productivo: diferido mientras Functions siga sin autorización.

## Fuentes oficiales

- [Firebase CLI: administración de sitios](https://firebase.google.com/docs/cli)
- [Deploy targets](https://firebase.google.com/docs/cli/targets)
- [Canales, versiones y releases de Hosting](https://firebase.google.com/docs/hosting/manage-hosting-resources)
- [App Check con reCAPTCHA Enterprise](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider)
