# Etapa 30 — Webhook y conciliación de pagos

Estado: **completa localmente**. El endpoint, la verificación criptográfica, la
consulta autoritativa, la conciliación transaccional y los reintentos se probaron
con la Emulator Suite. El registro de la URL pública se realizará junto con el
despliegue de desarrollo en la Etapa 47.

## Flujo implementado

1. Mercado Pago envía un `POST` a `mercadoPagoWebhook` con el tópico `payment`.
2. La Function exige `x-signature`, `x-request-id` y `data.id`, y valida la firma
   HMAC con el validador del SDK oficial.
3. El cuerpo solo sirve para identificar el evento. Nunca se usa como prueba de
   pago ni como fuente de monto, moneda o estado.
4. El backend consulta `GET /v1/payments/{id}` con el Access Token guardado como
   secreto.
5. La referencia externa debe corresponder a un intento creado previamente por
   MesaFlow. También deben coincidir ID, importe, moneda y ambiente de prueba.
6. Una transacción crea o actualiza `payments`, recalcula `paidMinor` y
   `balanceMinor`, actualiza el estado de la sesión y registra el evento.
7. El ID de pago y el evento son deterministas. Un reintento no duplica saldo,
   aun si el proveedor entrega la misma actualización más de una vez.

Los retornos del navegador `/payment/success`, `/payment/pending` y
`/payment/failure` continúan siendo exclusivamente informativos.

## Seguridad y estados

- `paymentIntents/{intentId}` resuelve una `external_reference` hacia su tenant
  sin hacer búsquedas globales. Es una colección exclusiva de backend.
- `webhookEvents/{eventId}` conserva la deduplicación por `x-request-id`.
- El documento `payments/{paymentId}` usa un ID derivado del ID remoto y queda
  aislado bajo el establecimiento correcto.
- Solo `approved` incrementa lo pagado. `refunded` y `charged_back` retiran esa
  contribución de forma idempotente.
- Una actualización tardía `pending` o `rejected` no puede degradar un pago que
  ya fue aprobado.
- Los errores transitorios devuelven `503` para que Mercado Pago reintente. Una
  firma inválida devuelve `401` y no toca Firestore.
- No se registran tokens, firmas ni cuerpos completos en logs.

## Evidencia local

- 34 pruebas de Functions aprobadas, incluidas seis nuevas del proveedor,
  firma, payload y política de reintento.
- 124 pruebas del chequeo raíz aprobadas.
- 14 pruebas de reglas Firestore y nueve de Storage aprobadas.
- Recorrido emulado aprobado: QR → pedido → preferencia → webhook aprobado →
  sesión pagada, repetición sin doble cómputo y firma falsa rechazada.
- `npm audit --omit=dev`: cero vulnerabilidades.

## Acción manual diferida hasta la Etapa 47

No se debe configurar una URL local (`127.0.0.1`) en Mercado Pago. Cuando la
Function de desarrollo se despliegue y exista una URL HTTPS pública:

1. Abrir **Mercado Pago Developers → Tus integraciones → MesaFlow Desarrollo**.
2. Entrar en **Webhooks → Configurar notificaciones**.
3. En **URL modo pruebas**, pegar la URL HTTPS desplegada de
   `mercadoPagoWebhook`.
4. Seleccionar únicamente el evento **Pagos**, cuyo tópico es `payment` para
   Checkout Pro vía Preferences API.
5. Guardar y revelar la clave secreta generada.
6. Cargar esa clave en Firebase Secret Manager como
   `MERCADO_PAGO_WEBHOOK_SECRET`; no pegarla en archivos versionados ni en el
   chat.
7. Usar **Simular notificación** y verificar HTTP `200` y el registro conciliado
   en Firestore.

El despliegue de Cloud Functions requiere habilitar facturación en Firebase. La
Etapa 30 no activó facturación, no hizo despliegues y no generó costos cloud.

## Fuentes del proveedor

- [Webhooks de Mercado Pago](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/additional-content/your-integrations/notifications/webhooks)
- [Notificaciones de pago para Checkout Pro](https://www.mercadopago.com.ar/developers/en/docs/checkout-pro-preferences/payment-notifications)

La documentación oficial establece el tópico `payment` para Checkout Pro, la
validación mediante `x-signature`, la respuesta `200`/`201`, el reintento cuando
no hay confirmación y la consulta posterior a `/v1/payments/{id}`.
