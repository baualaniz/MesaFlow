# Etapa 51 — Preparación segura del backend productivo

Estado: **código completo; activación cloud pendiente del usuario**. Esta etapa
prepara el paso desde el MVP estático gratuito hacia una operación real de un
único restaurante. No habilita Blaze, no crea secretos, no escribe producción y
no despliega Functions.

## Alcance comercial fijado

El primer lanzamiento productivo usa un solo establecimiento y una sola cuenta
receptora de Mercado Pago. Un SaaS donde cada restaurante cobre en su propia
cuenta requiere implementar OAuth por establecimiento antes de incorporarlo.
El despliegue protegido no cambia por sí solo ese modelo comercial.

## Separación sandbox/producción

`MERCADO_PAGO_ENVIRONMENT` admite únicamente `sandbox` o `production`:

- sandbox selecciona `sandbox_init_point` y registra `liveMode: false`;
- producción selecciona `init_point` y registra `liveMode: true`.

La conciliación sigue exigiendo que el pago consultado coincida en referencia,
importe, moneda y ambiente. Esto impide acreditar un pago de prueba contra un
intento real o viceversa. El emulador permanece siempre en sandbox.

## Despliegue completo protegido

La política `firebase/full-production-deploy-policy.json` fija:

- proyecto único `mesaflow-produccion`;
- bloqueo explícito de desarrollo y emuladores;
- tres secretos mínimos, sin leer sus valores;
- seis parámetros backend con `MERCADO_PAGO_ENVIRONMENT=production`;
- cuatro confirmaciones independientes, incluida aceptación de Blaze;
- árbol Git versionado limpio;
- suite completa y build productivo antes de publicar;
- despliegue de 14 Functions en dos grupos para reducir fallos por cuota.

El archivo real de parámetros será
`functions/.env.mesaflow-produccion`, está ignorado por Git y se crea a partir de
`functions/production.env.example`. No debe contener tokens.

El comando queda preparado, pero **no debe ejecutarse hasta completar Blaze,
Mercado Pago, Meta y Secret Manager**:

```powershell
$env:MESAFLOW_RECAPTCHA_ENTERPRISE_SITE_KEY = "ID_PUBLICO_PRODUCTIVO"
npm.cmd run deploy:prod:full -- `
  --confirm=mesaflow-produccion `
  --release=ACTIVAR-BACKEND-MESAFLOW-PRODUCCION `
  --billing=ACEPTO-COSTOS-BLAZE `
  --payments=CONFIRMO-CREDENCIALES-PRODUCTIVAS
Remove-Item Env:MESAFLOW_RECAPTCHA_ENTERPRISE_SITE_KEY
```

Al finalizar, el chequeo de solo lectura será:

```powershell
npm.cmd run deploy:smoke:functions:prod
```

Comprueba que estén enumeradas las 14 Functions y que `health` responda mediante
HTTPS; no crea usuarios, documentos, pedidos ni pagos.

## Alta inicial sin seed demo

Producción dispone de un bootstrap separado del seed de desarrollo. El usuario
debe crear primero el propietario en Firebase Authentication, copiar el ejemplo
a `firebase/bootstrap-production.local.json` y completar el UID y los datos del
restaurante. El archivo local está ignorado por Git.

El comando exige dos confirmaciones y un árbol versionado limpio:

```powershell
npm.cmd run bootstrap:prod -- `
  --confirm=mesaflow-produccion `
  --release=CREAR-ESTABLECIMIENTO-PRODUCCION
```

Antes de escribir, verifica que UID y correo coincidan con Authentication. El
commit crea atómicamente siete documentos y todos llevan precondición de no
existencia, por lo que nunca sobrescribe un establecimiento parcial o previo.
Pedidos, asistencia, Mercado Pago y WhatsApp nacen deshabilitados; se activan
desde el panel únicamente después de comprobar sus proveedores.

## Verificación local

```powershell
npm.cmd run functions:check
npm.cmd run test:deploy-config
npm.cmd run check
```

Los controles cubren selección del checkout productivo, rechazo de sandbox,
parámetros, secretos declarados, confirmaciones, lista de Functions, bootstrap
atómico y prohibición de sobrescritura.

## Pendientes manuales

1. confirmar que el lanzamiento inicial será para un solo restaurante;
2. habilitar Blaze y configurar presupuesto/alertas;
3. activar credenciales productivas de Mercado Pago;
4. configurar número, token y plantilla aprobada de WhatsApp;
5. cargar los tres secretos en Secret Manager;
6. completar los parámetros backend productivos;
7. ejecutar el despliegue protegido y registrar el webhook;
8. crear el usuario propietario y ejecutar el bootstrap;
9. probar el recorrido real antes de habilitar App Check enforcement.

## Fuentes oficiales

- [Configuración y secretos de Functions](https://firebase.google.com/docs/functions/config-env)
- [Administración y despliegue de Functions](https://firebase.google.com/docs/functions/manage-functions)
- [Métricas de App Check](https://firebase.google.com/docs/app-check/monitor-metrics)
- [Checkout Pro mediante Preferences API](https://www.mercadopago.com.ar/developers/es/reference/online-payments/checkout-pro-preferences/overview)
- [Notificaciones de pago de Checkout Pro](https://www.mercadopago.com.ar/developers/en/docs/checkout-pro-preferences/payment-notifications)
