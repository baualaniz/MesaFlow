# Backend MesaFlow

Cloud Functions 2nd gen en TypeScript para los límites de confianza de MesaFlow:
canje de QR, pedidos, pagos, webhooks, agregados y notificaciones.

La base ejecutable incluye `health`, canje/restauración de sesión QR, creación
transaccional de pedidos, asistencia y cálculo verificado del consumo. Todo puede
compilarse y probarse con `demo-mesaflow`; no requiere Blaze, credenciales ni
recursos reales mientras se use el Emulator Suite.

## Comandos

Desde la raíz del repositorio:

```powershell
npm.cmd run functions:check
npm.cmd run test:emulators
```

La capa `src/data` contiene converters estrictos y repositorios anclados por
establecimiento para Product y Order. Sus pruebas unitarias forman parte de
`functions:check`; el CRUD contra Firestore real se comprueba exclusivamente en
el proyecto local `demo-mesaflow` con `test:emulators`.

La Etapa 13 agrega consultas tipadas de menú publicado y vistas operativas de
pedidos. Sus índices canónicos viven en `firestore.indexes.json`; los repositorios
siempre consultan una subcolección previamente acotada al establecimiento.

La Etapa 24 incorpora la callable `createOrder`. El cliente envía únicamente IDs,
cantidades y notas; la Function valida al participante, vuelve a leer catálogo y
precios, crea el snapshot y actualiza el consumo de la sesión en una transacción
idempotente. `test:emulators` comprueba el flujo real y limpia sus fixtures.

Las Etapas 26 y 27 agregan las callables de asistencia y
`getSessionConsumption`. Esta última recompone el subtotal desde pedidos no
cancelados, descuenta únicamente pagos aprobados y rechaza cualquier divergencia
con el resumen guardado de la sesión.

La Etapa 33 agrega `updateOrderStatus`: aplica la máquina de estados compartida,
valida rol y permisos desde la membresía, detecta concurrencia mediante el estado
esperado y registra cada cambio de forma idempotente. Al cancelar, también ajusta
el consumo de la sesión dentro de la misma transacción.

La Etapa 34 agrega `manageTable`: centraliza CRUD de mesas, apertura/cierre de
sesiones y rotación atómica de uno o varios QR. La Function almacena solo hashes,
protege concurrencia e historial y audita cada operación idempotente.

La Etapa 37 agrega `updateAssistanceStatus`: solo acepta `pending → acknowledged`
y `acknowledged → resolved`, obtiene el actor desde Authentication, verifica la
membresía en el tenant y registra auditoría idempotente. Cocina queda rechazada;
owner, manager y staff con `assistance.manage` pueden operar la cola.

La Etapa 38 integra `dailyMetrics` en las transacciones existentes. Crear,
cancelar o completar pedidos ajusta actividad y cantidades; aprobar o revertir
un pago ajusta ventas. La fecha se calcula con la zona horaria del establecimiento
y los reintentos idempotentes no duplican acumulados.

La Etapa 39 conecta la configuración pública con los límites de confianza. El
canje/restauración QR usa el nombre de marca configurado y `createOrder` exige
que los pedidos desde la mesa estén habilitados. Los flags no contienen secretos.

La función emulada queda en:

```text
http://127.0.0.1:5001/demo-mesaflow/southamerica-east1/health
```

No ejecutes `firebase deploy --only functions`: el despliegue se realizará en una
etapa posterior y requerirá autorización expresa para activar facturación.
