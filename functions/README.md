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

La función emulada queda en:

```text
http://127.0.0.1:5001/demo-mesaflow/southamerica-east1/health
```

No ejecutes `firebase deploy --only functions`: el despliegue se realizará en una
etapa posterior y requerirá autorización expresa para activar facturación.
