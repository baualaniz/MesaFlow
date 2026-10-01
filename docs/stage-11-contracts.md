# Etapa 11 — contratos compartidos

## Resultado

MesaFlow dispone de contratos verificables y equivalentes en TypeScript y Dart
para los límites más sensibles del dominio: enums, dinero, timestamps, productos
y pedidos. La especificación no depende de copiar ejemplos entre lenguajes: ambos
consumen los mismos fixtures JSON versionados.

## Fuente canónica

- `packages/contracts/fixtures/contract-spec.json`: enums, límites cuantitativos
  y formato temporal.
- `packages/contracts/fixtures/domain-fixtures.json`: dinero, timestamps,
  producto y pedido de referencia, además de payloads inválidos.
- `packages/contracts/src/domain.ts`: validación TypeScript para backend/panel.
- `apps/customer/lib/src/contracts/domain_contracts.dart`: validación Dart para
  Flutter.

El paquete TypeScript publica su salida compilada desde `packages/contracts/lib`
y expone además los módulos históricos de rutas Firestore y Storage. `lib` es un
artefacto local de build, no código fuente versionado.

## Decisiones obligatorias

### Dinero

Todo importe se representa como un entero no negativo en la unidad menor de la
moneda y un código ISO 4217 de tres letras: por ejemplo ARS 12.900,00 se almacena
como `amountMinor: 1290000, currency: "ARS"`. No se admiten flotantes. Productos,
líneas y totales usan nombres terminados en `Minor` para mantener visible esta
semántica.

Un pedido debe cumplir simultáneamente:

1. `lineTotalMinor == unitPriceMinor * quantity` en cada línea.
2. La suma de líneas coincide con `subtotalMinor`.
3. En este MVP sin recargos/descuentos, `totalMinor == subtotalMinor`.

### Tiempo

Firestore guardará `Timestamp` de servidor. Al cruzar un límite JSON/API, el
valor canónico es UTC RFC3339 con milisegundos exactos, por ejemplo
`2026-09-17T12:00:00.000Z`. Un offset local o un valor sin milisegundos se
rechaza, evitando interpretaciones diferentes entre Dart y JavaScript.

### Estados

Los valores persistidos están en `snake_case` cuando contienen más de una
palabra. Dart puede usar nombres idiomáticos como `paymentPending`, pero su lista
wire conserva `payment_pending`. Ninguna aplicación inventa estados por fuera de
la especificación.

### Validación estricta

Los payloads de Product, Order, OrderItem y Money exigen exactamente sus campos:
faltantes o desconocidos fallan. También se validan identificadores, longitudes,
cantidad máxima de líneas, cantidad por producto y timestamp del estado actual.
La autorización y las transiciones de estado siguen siendo responsabilidad de
Functions y reglas; este contrato valida forma e invariantes, no identidad.

## Integración visible

El catálogo demostrativo Flutter ya utiliza `Money`. La interfaz conserva el
formato local de precios, pero el carrito suma `amountMinor`, por lo que la vista
y el futuro payload de pedido comparten la misma unidad.

## Verificación

Desde la raíz, en PowerShell:

```powershell
npm.cmd run test:contracts
npm.cmd run test:contracts:flutter
```

O ambas verificaciones:

```powershell
npm.cmd run contracts:check
```

La primera orden compila TypeScript y ejecuta ocho pruebas. La segunda ejecuta
siete pruebas Dart contra los mismos archivos. `npm.cmd run check` incluye la
parte TypeScript, además del resto de la suite local; Flutter se mantiene como
comprobación explícita porque requiere el SDK instalado.

## Criterios de aceptación

- [x] Enums canónicos definidos y comparados en TypeScript/Dart.
- [x] Dinero expresado únicamente como entero minor + moneda.
- [x] Timestamps JSON normalizados a UTC RFC3339 con milisegundos.
- [x] Producto y pedido rechazan campos, estados o totales inválidos.
- [x] Fixtures comunes ejecutados desde ambos lenguajes.
- [x] Shell Flutter migrado al contrato Money.

No requiere cambios en Firebase Console, facturación ni secretos.
