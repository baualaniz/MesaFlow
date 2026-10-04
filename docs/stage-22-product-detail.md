# Etapa 22 — detalle, cantidad y notas del producto

## Resultado

Cada producto del menú abre un detalle funcional con imagen, categoría, nombre,
descripción, precio, selector de cantidad, aclaraciones opcionales y total de la
selección. El cliente ya no agrega siempre una unidad sin contexto: puede preparar
una línea validada antes de incorporarla al resumen del pedido.

```text
Producto publicado
  → detalle visual
  → cantidad entre 1 y el máximo permitido
  → nota opcional normalizada
  → total entero = precioMinor × cantidad
  → OrderItemContract
  → línea temporal del pedido
```

## Validaciones

`ProductSelection.create` usa el contrato canónico de `OrderItemContract`. Por lo
tanto, una selección solo se crea cuando cumple simultáneamente:

- ID y nombre de producto válidos;
- precio en unidades menores, entero y no negativo;
- cantidad entre 1 y 99;
- total exacto calculado con enteros;
- total dentro del máximo monetario del contrato;
- nota vacía convertida a `null` o texto de hasta 300 caracteres.

El máximo visible de cantidad también se reduce cuando multiplicar el precio por
99 superaría el límite monetario. El botón para restar queda deshabilitado en una
unidad y el botón para sumar queda deshabilitado al alcanzar el máximo.

El límite de 300 caracteres ahora forma parte de `CONTRACT_LIMITS` en TypeScript,
Dart y el fixture compartido, evitando que la UI y el backend diverjan.

## Comportamiento temporal del resumen

Las selecciones se mantienen en memoria dentro de la pantalla actual:

- el mismo producto con la misma nota se combina en una sola línea;
- el mismo producto con otra nota crea una línea independiente;
- cada línea muestra cantidad, nombre, nota y subtotal;
- el total general suma `lineTotalMinor`, sin números decimales;
- el resumen es desplazable para no desbordar en pantallas bajas.

La persistencia por sesión, edición, eliminación y vaciado completo pertenecen a
la Etapa 23. Cerrar o recargar la aplicación todavía reinicia estas líneas.

## Ejecutar el recorrido local

Desde la raíz, en una terminal:

```powershell
npm.cmd run emulators
```

En otra terminal:

```powershell
npm.cmd run firebase:seed:demo
```

Abrir `http://127.0.0.1:5100`, seleccionar un producto tocando su tarjeta,
cambiar la cantidad, escribir una aclaración y presionar **Agregar**. El botón
inferior **Ver pedido** debe mostrar el total actualizado y conservar la nota.

## Verificación

```powershell
cd apps/customer
flutter.bat analyze
flutter.bat test
flutter.bat build web --release --dart-define=MESAFLOW_ENV=emulator
cd ../..
npm.cmd run check
```

Resultados de cierre:

- análisis Flutter sin observaciones;
- 43 pruebas Flutter aprobadas;
- contratos Dart y TypeScript alineados con nota máxima de 300 caracteres;
- cantidades cero, superiores a 99 y totales fuera de límite rechazados;
- detalle, total, nota y resumen cubiertos por pruebas de widgets;
- resumen comprobado sin desbordes en una pantalla baja;
- ninguna lectura o escritura cloud agregada por esta etapa.

## Criterios de aceptación

- [x] La tarjeta abre un detalle completo del producto.
- [x] El selector nunca baja de una unidad.
- [x] El selector respeta cantidad y monto máximos.
- [x] Las notas son opcionales, se recortan y no superan 300 caracteres.
- [x] El total de línea usa enteros y coincide con precio por cantidad.
- [x] Una selección inválida no entra al resumen.
- [x] Cantidad, nota y subtotal quedan visibles en el resumen temporal.
- [x] El flujo funciona sin APIs, servicios pagos ni acciones manuales nuevas.

## Próximo paso

La Etapa 23 extraerá estas líneas a un carrito persistente por sesión, con edición,
eliminación, vaciado y totales deterministas después de una recarga.
