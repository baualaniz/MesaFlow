# Etapa 29 — Preferencia idempotente y retorno de Checkout Pro

## Estado

Etapa completa en alcance local. La app cliente puede solicitar al backend una
preferencia de Mercado Pago, abrir el checkout en una pestaña o aplicación
externa y recibir rutas diferenciadas de éxito, pendiente y fallo. Ninguna ruta
de retorno modifica el pago ni muestra una aprobación no verificada.

El despliegue cloud continúa diferido a la Etapa 47 porque Cloud Functions de
segunda generación requiere habilitar facturación. La prueba integrada usa un
proveedor determinista del emulador y nunca consume la credencial real.

## Flujo implementado

1. El cliente autenticado invoca `createPaymentPreference` únicamente con
   establecimiento, sesión y mesa.
2. El backend vuelve a validar establecimiento activo, mesa, sesión,
   participante, moneda y saldo guardado. El cliente no envía importes.
3. El intento se identifica con SHA-256 de establecimiento y sesión. Firestore
   toma un lease corto en `paymentPreferences/{intentId}` y mueve la sesión a
   `payment_pending` para impedir pedidos que vuelvan obsoleto el importe.
4. Antes de crear, el adaptador busca en Mercado Pago por `external_reference`.
   Esto recupera una preferencia creada si una ejecución anterior se interrumpió
   antes de guardarla.
5. Si no existe, crea una preferencia con un único ítem por el saldo de la mesa,
   moneda del establecimiento, `auto_return=approved` y retornos HTTPS públicos.
6. El backend guarda solo ID y URL de checkout validados. Un segundo llamado
   devuelve el mismo resultado.
7. La app valida que la URL sea HTTPS de `mercadopago.com` y la abre fuera de
   MesaFlow mediante `url_launcher`.

## Retornos no autoritativos

Las rutas públicas son:

- `/payment/success`
- `/payment/pending`
- `/payment/failure`

Mercado Pago puede agregar parámetros a estas URLs. MesaFlow no usa esos datos
para acreditar un pago. `returnTo` solo se acepta si coincide con una ruta
interna canónica `/e/:slug/table/:tableId`; URLs absolutas, queries, fragmentos y
segmentos inseguros se descartan.

Incluso el retorno `success` dice que el pago se está verificando. El único
componente que podrá escribir un pago aprobado será el webhook verificado de la
Etapa 30, después de consultar el estado al proveedor.

## Seguridad e idempotencia

- `MERCADO_PAGO_ACCESS_TOKEN` se vincula exclusivamente a la Function de pago.
- `CUSTOMER_PUBLIC_BASE_URL` es un parámetro backend no secreto y por defecto
  apunta a `https://mesaflow-desarrollo.web.app`.
- Localhost y `127.0.0.1` se rechazan como retorno del proveedor.
- La colección `paymentPreferences` es solo backend; reglas Firestore deniegan
  lectura y escritura a clientes, incluso miembros y participantes.
- Un lease evita creaciones concurrentes y solo su propietario puede finalizar
  o marcar fallido el intento.
- Si el proveedor falla, la misma transacción de compensación vuelve a abrir una
  sesión que esta ejecución había bloqueado.
- La búsqueda previa por `external_reference` cubre el caso de caída entre la
  creación remota y la escritura local.
- La respuesta se valida por campos exactos, importes enteros y dominio HTTPS.
- Los errores del proveedor se sanitizan; nunca se registra ni devuelve el token.

## Verificación

```powershell
npm.cmd run functions:check
cd apps/customer
flutter.bat analyze
flutter.bat test
flutter.bat build web --dart-define=MESAFLOW_ENV=emulator
cd ../..
npm.cmd run test:emulators
npm.cmd run check
```

Resultados de cierre:

- 28 pruebas de Functions aprobadas;
- 78 pruebas Flutter aprobadas y análisis sin observaciones;
- build Web del cliente aprobado;
- prueba integrada: dos llamados devuelven la misma preferencia y existe un solo
  documento interno; la sesión queda en `payment_pending`;
- 14 pruebas de reglas Firestore y 9 de Storage aprobadas;
- suite general del repositorio aprobada;
- datos temporales y emuladores eliminados al terminar.

## Cómo verlo localmente

1. Ejecutá `npm.cmd run emulators` en la raíz.
2. En otra PowerShell ejecutá `npm.cmd run firebase:seed:demo`.
3. Abrí `http://127.0.0.1:5100/e/mesa-flow-demo/table/mesa-01`.
4. Abrí **Tu cuenta** y verificá el botón **Pagar con Mercado Pago**.

En el emulador, el botón usa una URL sandbox determinista para comprobar el
contrato sin crear preferencias externas. El checkout real de prueba quedará
accesible desde la misma interfaz después del despliegue de desarrollo.

Las pantallas de retorno pueden previsualizarse sin pagar:

- `http://127.0.0.1:5100/payment/success`
- `http://127.0.0.1:5100/payment/pending`
- `http://127.0.0.1:5100/payment/failure`

## Criterios de aceptación

- [x] El importe y la moneda provienen exclusivamente del servidor.
- [x] Reintentos y concurrencia no generan intenciones internas duplicadas.
- [x] Iniciar el pago bloquea pedidos nuevos; un fallo previo al checkout revierte el bloqueo.
- [x] Una caída posterior a Mercado Pago se recupera por referencia externa.
- [x] El cliente abre únicamente URLs HTTPS del dominio Mercado Pago.
- [x] Las tres rutas de retorno son válidas con fallback SPA.
- [x] Ningún retorno marca el pago como aprobado.
- [x] La colección operativa es inaccesible desde SDKs cliente.
- [x] El secreto sigue fuera del frontend y del repositorio.

## Próximo paso

La Etapa 30 implementará el endpoint webhook: validará autenticidad, deduplicará
eventos, consultará el pago a Mercado Pago y recién entonces actualizará
`payments`, saldo de sesión y estado operativo.

## Fuentes oficiales

- [Referencia de Checkout Pro vía Preferences API](https://www.mercadopago.com.ar/developers/es/reference/online-payments/checkout-pro-preferences/overview)
- [Crear una preferencia](https://www.mercadopago.com.ar/developers/es/reference/online-payments/checkout-pro-preferences/create-preference/post)
- [Buscar preferencias por `external_reference`](https://www.mercadopago.com.ar/developers/en/reference/online-payments/checkout-pro-preferences/search-preferences/get)
- [Obtener una preferencia por ID](https://www.mercadopago.com.ar/developers/es/reference/online-payments/checkout-pro-preferences/get-preference/get)
