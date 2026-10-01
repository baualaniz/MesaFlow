# Backend MesaFlow

Cloud Functions 2nd gen en TypeScript para los límites de confianza de MesaFlow:
canje de QR, pedidos, pagos, webhooks, agregados y notificaciones.

Esta etapa incorpora la base ejecutable y una función HTTP `health`. Todo puede
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

La función emulada queda en:

```text
http://127.0.0.1:5001/demo-mesaflow/southamerica-east1/health
```

No ejecutes `firebase deploy --only functions`: el despliegue se realizará en una
etapa posterior y requerirá autorización expresa para activar facturación.
