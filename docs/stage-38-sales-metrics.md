# Etapa 38 — Ventas y métricas

Estado: **completa localmente**. El resumen administrativo deja de mostrar datos
estáticos y consume agregados diarios mantenidos dentro de las mismas
transacciones de pedidos y pagos.

## Agregación transaccional

Cada documento `dailyMetrics/{yyyy-MM-dd}` pertenece a un establecimiento y usa
la zona horaria configurada por ese establecimiento. Conserva:

- venta acreditada en unidades monetarias menores;
- cantidad de pagos aprobados;
- pedidos activos y completados;
- cantidades acumuladas por producto;
- fecha de actualización nativa de Firestore.

La creación idempotente de un pedido incrementa una sola vez pedidos activos y
productos. Una cancelación revierte esas cantidades y una finalización mueve el
pedido de activo a completado. La conciliación de Mercado Pago suma una venta
solo al pasar a `approved`; un reembolso o contracargo revierte su contribución.

Los agregados se leen y escriben dentro de la misma transacción que modifica el
pedido, la sesión o el pago. Por eso un fallo no deja el detalle y el resumen en
estados diferentes. Los reintentos idempotentes regresan antes de volver a tocar
la métrica.

## Dashboard

Propietario y encargado reciben en el inicio:

- ventas acumuladas del período visible;
- pagos aprobados;
- pedidos completados y activos;
- gráfico de ventas diarias;
- cinco productos más pedidos.

El navegador escucha como máximo los últimos siete documentos diarios del tenant
activo. No escanea las colecciones globales de pedidos o pagos. Cada documento se
valida estrictamente antes de mostrarse y un error descarta el feed anterior para
evitar cifras desactualizadas.

Salón y cocina conservan un inicio operativo sin importes comerciales. Además de
ocultarlo en la interfaz, Firestore Rules limita `dailyMetrics` a owner/manager y
niega todas las escrituras de clientes.

## Evidencia

- 56 pruebas del panel aprobadas;
- 54 pruebas de Functions aprobadas;
- build React/Vite aprobado;
- suite completa de emuladores aprobada;
- owner puede ejecutar la consulta limitada de siete días y staff recibe
  `permission-denied`;
- pedido repetido no duplica actividad ni cantidades;
- cancelación y finalización ajustan el fixture diario esperado;
- webhook repetido no duplica venta ni pago aprobado;
- métricas temporales del smoke se restauran o eliminan al finalizar.

No se agregó un trigger que escanee historial ni una tarea programada. El diseño
actual agrega desde los límites de confianza existentes y queda preparado para
incorporar períodos mayores mediante más documentos diarios, sin cambiar el
detalle transaccional.
