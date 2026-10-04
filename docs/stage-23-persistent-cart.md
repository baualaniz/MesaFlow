# Etapa 23 — carrito persistente por sesión

## Resultado

El cliente puede armar un pedido, cerrar o recargar la aplicación y recuperar el
carrito de la misma sesión. Desde **Ver pedido** puede aumentar o disminuir la
cantidad, eliminar una línea o vaciar todo el contenido con confirmación.

```text
Selección validada
  → CartController
  → borrador mínimo: productId + cantidad + nota
  → CartStore aislado por establecimiento y sesión
  → almacenamiento local del navegador
  → restauración contra el catálogo vigente
  → subtotales y total recalculados con enteros
```

## Persistencia y aislamiento

La clave persistida tiene la forma lógica
`mesaflow.cart.v1.<establishmentId>.<sessionId>`. El documento incluye además la
versión y ambos identificadores, que deben coincidir al decodificarlo. Esto evita
que una mesa o sesión restaure accidentalmente el pedido de otra.

Solo se guardan datos de borrador:

- ID del producto;
- cantidad entre 1 y 99, respetando también el máximo monetario;
- nota opcional normalizada de hasta 300 caracteres.

No se guardan token QR, UID, datos personales, precio, moneda, nombre, subtotal ni
total. Al restaurar, esos valores se toman nuevamente del menú publicado. Si un
producto ya no existe, se descarta. Si el documento está corrupto, tiene campos
inesperados o pertenece a otro contexto, se reinicia de forma segura.

El almacenamiento del navegador es editable por quien usa el dispositivo y no
constituye autorización ni una fuente confiable. En la Etapa 24, el servidor
volverá a validar la sesión, disponibilidad y precio antes de crear el pedido.

## Comportamiento de la interfaz

- agregar nuevamente el mismo producto con la misma nota suma cantidades;
- una nota diferente mantiene una línea independiente;
- los botones `+` y `−` respetan los límites del contrato;
- eliminar afecta una sola línea;
- vaciar exige confirmación y borra el documento de esa sesión;
- mientras se persiste un cambio, los controles evitan operaciones simultáneas;
- si la escritura falla, el estado visible anterior no cambia;
- todos los subtotales y el total general usan unidades monetarias enteras.

## Probarlo manualmente

Con los emuladores y el seed demo activos, abrí
`http://127.0.0.1:5100/e/mesa-flow-demo/table/mesa-01` y:

1. agregá un producto, con o sin nota;
2. abrí **Ver pedido** y modificá su cantidad;
3. recargá la pestaña: el producto y la cantidad deben continuar;
4. eliminá una línea o usá **Vaciar pedido**;
5. recargá otra vez para confirmar que el cambio también quedó guardado.

El carrito pertenece a la sesión autenticada que restaura el backend. Una ruta
válida por sí sola no concede acceso ni permite leer el carrito de otra sesión.

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
- 53 pruebas Flutter aprobadas;
- persistencia y reapertura cubiertas por pruebas;
- separación entre sesiones comprobada;
- edición, eliminación, vaciado y fallas de escritura comprobados;
- precio vigente y descarte de productos ausentes comprobados;
- ninguna lectura o escritura nueva en Firebase;
- ninguna acción manual, API paga ni tarjeta requerida.

## Criterios de aceptación

- [x] El carrito se recupera después de recrear la aplicación.
- [x] Cada establecimiento y sesión tiene un espacio aislado.
- [x] Cantidades y líneas pueden editarse o eliminarse.
- [x] Vaciar elimina también la copia persistida.
- [x] Los totales se calculan siempre con enteros.
- [x] Los precios no se aceptan desde el almacenamiento local.
- [x] Un documento local inválido no bloquea la aplicación.
- [x] Una falla de guardado no publica un estado falso en la UI.

## Próximo paso

La Etapa 24 implementará la creación segura del pedido. Una Cloud Function
recibirá únicamente IDs, cantidades y notas, validará la sesión y recalculará los
precios desde Firestore dentro de una operación transaccional.
