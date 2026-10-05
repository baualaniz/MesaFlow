# Etapa 27 — consumo y cuenta de la mesa

## Resultado

El comensal ya puede abrir **Tu cuenta** desde el encabezado del menú y consultar
un resumen verificado de la sesión. La pantalla muestra consumo total, pagos
aprobados, saldo pendiente, cantidad de pedidos y cantidad de productos. Desde
el mismo lugar puede solicitar la cuenta al personal.

```text
Sesión QR autenticada
  → getSessionConsumption
  → validación de tenant, mesa, sesión y participante
  → lectura consistente de pedidos y pagos
  → pedidos no cancelados − pagos aprobados
  → comparación con el resumen de tableSessions
  → consumo, pagado y saldo visibles en Flutter
```

## Cálculo confiable

El navegador no envía importes. La callable reconstruye el resumen desde los
documentos canónicos de Firestore:

- suma `totalMinor` de todos los pedidos excepto `cancelled`;
- suma `amountMinor` solo para pagos `approved`;
- calcula `balanceMinor = subtotalMinor - paidMinor`;
- cuenta pedidos válidos y unidades de sus líneas;
- exige moneda única y enteros dentro del límite compartido.

Los pagos `pending`, `rejected`, `cancelled`, `refunded` y `charged_back` no
reducen el saldo. Los pedidos cancelados tampoco integran el consumo.

## Consistencia y seguridad

La Function exige Firebase Auth y una participación activa en una sesión `open`
o `payment_pending`. También comprueba que la mesa esté activa y siga enlazada a
esa sesión. Las consultas están ancladas en
`establishments/{establishmentId}` y cada pedido/pago debe pertenecer a la misma
sesión y establecimiento.

El cálculo se realiza en una transacción de lectura y se compara con los campos
cacheados de `tableSessions`. Si `subtotalMinor`, `paidMinor` o `balanceMinor` no
coinciden, devuelve `consumption-inconsistent`; no presenta un total dudoso ni
modifica datos de forma silenciosa. Las escrituras directas del cliente siguen
denegadas por Firestore Rules.

## Experiencia del cliente

La hoja **Tu cuenta** incluye:

- saldo pendiente destacado;
- consumo y monto ya pagado;
- cantidad de pedidos y productos;
- actualización manual y reintento ante fallas;
- mensajes específicos para sesión vencida o datos inconsistentes;
- acción **Pedir la cuenta**.

La solicitud de cuenta reutiliza `AssistanceType.bill`. Si ya existe un pedido
de cuenta activo, se muestra su estado; si hay otra asistencia activa, no se crea
una solicitud paralela. Se mantienen la deduplicación y el cooldown de la Etapa
26.

## Verificación

```powershell
npm.cmd run functions:check
cd apps/customer
flutter.bat analyze
flutter.bat test
flutter.bat build web --release --dart-define=MESAFLOW_ENV=emulator
cd ../..
npm.cmd run check
npm.cmd run test:emulators
```

Resultados de cierre:

- 73 pruebas Flutter aprobadas;
- 23 pruebas de Functions aprobadas;
- 10 pruebas de contratos TypeScript aprobadas;
- parser estricto del resumen cubierto en Dart;
- pedidos cancelados y pagos no aprobados excluidos por pruebas unitarias;
- moneda divergente y sobrepago rechazados;
- smoke real con Auth, Firestore y Functions Emulator;
- interfaz responsive y build Web de producción verificados.

## Criterios de aceptación

- [x] El cliente no decide precios ni importes pagados.
- [x] Solo una sesión QR válida puede leer su consumo.
- [x] Los pedidos cancelados no suman.
- [x] Solo pagos aprobados descuentan saldo.
- [x] El saldo coincide con consumo menos pagos aprobados.
- [x] Una divergencia con la sesión se rechaza explícitamente.
- [x] La cuenta puede solicitarse sin duplicar el canal de asistencia.
- [x] La interfaz permite actualizar y reintentar.

## Próximo paso

La Etapa 28 preparará la configuración sandbox de Mercado Pago y su política de
secretos. Requiere decisiones y acciones manuales sobre la cuenta del proveedor;
ninguna credencial real se guardará en Git.
