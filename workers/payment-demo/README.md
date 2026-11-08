# Worker de pagos para la demo académica

Backend temporal de Cloudflare Workers que crea preferencias reales de Mercado
Pago en ambiente sandbox. Su único consumidor permitido en navegador es
`https://mesaflow-desarrollo.web.app` y
`https://mesaflow-produccion.web.app`.

## Seguridad y alcance

- recalcula el importe a partir de los 18 productos y precios versionados;
- rechaza precios, nombres y totales enviados por el cliente;
- acepta únicamente identificadores canónicos de sesiones y mesas académicas;
- recupera preferencias por referencia externa para evitar duplicados;
- guarda `MERCADO_PAGO_ACCESS_TOKEN` como secreto cifrado de Cloudflare;
- devuelve únicamente IDs, importe y URL HTTPS oficial de Mercado Pago;
- no acredita pagos ni reemplaza el webhook productivo de Firebase Functions.

El Worker está limitado a una presentación sandbox. No debe utilizarse para
cobros productivos ni para varios restaurantes.

## Comandos

```powershell
npm.cmd run payment-demo:check
npm.cmd --workspace @mesaflow/payment-demo-worker run deploy -- --dry-run
npm.cmd --workspace @mesaflow/payment-demo-worker run deploy
```

El secreto se configura sin incorporarlo al comando ni al repositorio:

```powershell
npm.cmd exec --workspace @mesaflow/payment-demo-worker -- `
  wrangler secret put MERCADO_PAGO_ACCESS_TOKEN
```

Después del despliegue, la app se compila con el endpoint completo:

```powershell
flutter.bat build web --release --csp --no-web-resources-cdn `
  --dart-define=MESAFLOW_ENV=demo `
  --dart-define=MESAFLOW_DEMO_PAYMENT_API_URL=https://mesaflow-payment-demo.mesaflow-payment-demo-worker.workers.dev/preferences
```
