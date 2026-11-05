# Etapa 52 — Demo académica, APK Android y PWA iOS

## Objetivo

Entregar una versión estable para la presentación de la materia sin exigir un
plan pago de Firebase, una tarjeta ni conexión a los emuladores. Esta variante
no reemplaza los ambientes `dev` y `prod`: agrega el ambiente explícito `demo` y
conserva intacta la arquitectura cloud.

El flujo principal funciona localmente. El pago usa una credencial de prueba
guardada exclusivamente como secreto cifrado de un Cloudflare Worker y abre el
checkout sandbox oficial; nunca intenta cobrar dinero real.

## Alcance funcional de la APK

- apertura de la Mesa 1 como si se hubiera leído su QR;
- menú local de 18 productos distribuidos en 5 categorías;
- búsqueda, filtros, detalle, cantidades, notas y carrito persistente;
- creación idempotente de pedidos;
- actualización automática del estado del pedido;
- solicitud y cancelación de asistencia;
- resumen de consumo y solicitud de la cuenta;
- creación remota de una preferencia sandbox y apertura del checkout oficial de
  Mercado Pago;
- funcionamiento sin Firebase; solo el checkout requiere conexión a Internet.

El panel administrativo continúa siendo una interfaz web separada. Para la
exposición puede mostrarse junto con la APK usando el recorrido local documentado
en `docs/demo-script.md`.

## Instalar la PWA en iPhone o iPad

La misma demo académica está publicada en:

```text
https://mesaflow-desarrollo.web.app/
```

1. Abrir esa dirección con **Safari** en el iPhone o iPad.
2. Tocar el botón **Compartir** de Safari.
3. Elegir **Agregar a pantalla de inicio**.
4. Confirmar el nombre **MesaFlow** y tocar **Agregar**.
5. Abrir el nuevo icono desde la pantalla de inicio.

El manifiesto usa modo `standalone`, iconos instalables y colores de MesaFlow.
El service worker conserva los recursos de la aplicación después de la primera
carga. No requiere IPA, Xcode ni una membresía de Apple para esta presentación.

## Generar la APK

Desde `apps/customer`:

```powershell
flutter.bat analyze
flutter.bat test
flutter.bat build apk --release `
  --dart-define=MESAFLOW_ENV=demo `
  --dart-define=MESAFLOW_DEMO_PAYMENT_API_URL=https://mesaflow-payment-demo.mesaflow-payment-demo-worker.workers.dev/preferences
```

La salida de Flutter queda en:

```text
apps/customer/build/app/outputs/flutter-apk/app-release.apk
```

La copia preparada para compartir se guarda como:

```text
dist/MesaFlow-Demo-Android.apk
```

Esta APK académica usa la firma local de depuración para que pueda instalarse
directamente. No debe publicarse en Google Play; una publicación comercial exige
una clave de lanzamiento privada y el flujo de producción pendiente.

## Instalar en el teléfono

1. Copiar `MesaFlow-Demo-Android.apk` al teléfono por cable, Drive o correo.
2. Abrir el archivo desde el teléfono.
3. Si Android lo solicita, habilitar temporalmente **Instalar apps desconocidas**
   para la aplicación desde la que se abrió el archivo.
4. Tocar **Instalar** y luego **Abrir**.
5. Al finalizar la exposición, se puede volver a deshabilitar ese permiso.

La APK requiere Android 7.0 (API 24) o posterior. Si se necesita empezar una
demostración desde cero, borrar los datos de **MesaFlow Demo** desde Ajustes →
Aplicaciones → Almacenamiento.

## Guion breve de comprobación

1. Abrir la app y tocar **Abrir Mesa 1**.
2. Buscar un producto, abrir su detalle, agregar una nota y sumarlo al pedido.
3. Enviar el pedido y abrir **Tus pedidos**; observar el avance automático.
4. Crear y cancelar una solicitud desde **Pedir asistencia**.
5. Abrir **Tu cuenta**, solicitar la cuenta y tocar **Pagar**.
6. Verificar que **Pagar con Mercado Pago** abra el checkout sandbox oficial con
   el mismo importe que muestra **Tu cuenta**.

## Límites transparentes

- Los datos viven en la memoria del teléfono durante la sesión de la app.
- El carrito usa almacenamiento local; no se sincroniza con otros dispositivos.
- No se envían mensajes de WhatsApp ni correos.
- El Worker usa la API real de preferencias en ambiente sandbox; no mueve dinero
  real ni acredita el saldo local porque esa autoridad corresponde al webhook
  productivo.
- Esta variante no demuestra escalabilidad, disponibilidad ni seguridad de un
  lanzamiento comercial; sí demuestra el flujo funcional solicitado para el MVP.
