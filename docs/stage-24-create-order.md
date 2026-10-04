# Etapa 24 — creación segura del pedido

## Resultado

El carrito ya puede convertirse en un pedido real dentro de Firestore Emulator.
Al presionar **Enviar pedido**, Flutter manda únicamente el contexto de la sesión,
un identificador de intento y el borrador mínimo de las líneas. La Function
autenticada verifica todo y devuelve la referencia y el total calculado por el
servidor.

```text
Carrito local
  → establishmentId + sessionId + tableId
  → requestId aleatorio
  → productId + cantidad + nota
  → callable createOrder
  → transacción Firestore
      ├─ valida mesa, sesión y participante
      ├─ lee productos y categorías vigentes
      ├─ recalcula precios y total
      ├─ crea snapshot Order(created)
      └─ actualiza subtotal y saldo de la sesión
  → confirmación al cliente
  → limpieza del carrito local
```

## Límite de confianza

El cliente nunca envía ni decide:

- nombre del producto;
- precio unitario;
- subtotal de línea;
- subtotal o total general;
- moneda;
- estado inicial;
- identidad del cliente.

Los campos adicionales se rechazan. El UID proviene de Firebase Authentication y
el backend lee precio, nombre, moneda, publicación y disponibilidad desde
Firestore dentro de la operación. El pedido final vuelve a pasar por
`OrderContract`, que exige importes enteros y totales exactos.

## Transacción e idempotencia

El navegador genera 128 bits aleatorios como `requestId`. La Function combina ese
valor con el UID mediante SHA-256 para obtener el ID del pedido. Si la red pierde
la respuesta y Flutter reintenta el mismo carrito, conserva el identificador:

- si el pedido no existe, se crea y el consumo de la sesión aumenta una vez;
- si ya existe y pertenece al mismo contexto, se devuelve el snapshot existente;
- si el carrito cambia, Flutter genera un identificador nuevo;
- una colisión o contexto incoherente se rechaza.

La creación del documento y la actualización de `subtotalMinor` y `balanceMinor`
ocurren en una sola transacción. No puede quedar consumo actualizado sin pedido,
ni pedido creado sin consumo actualizado.

## Validaciones del servidor

Antes de escribir, la Function exige:

- usuario autenticado;
- establecimiento activo;
- mesa activa apuntando a la sesión recibida;
- sesión en estado `open`;
- participante activo con el mismo UID;
- entre 1 y 50 líneas sin duplicados exactos;
- cantidades entre 1 y 99;
- notas opcionales de hasta 300 caracteres;
- productos y categorías activos del mismo establecimiento;
- productos disponibles y con la moneda del establecimiento;
- totales y nuevo saldo dentro de los límites enteros.

Firestore Rules mantiene bloqueada la escritura directa a `orders` y
`tableSessions`; la transacción se ejecuta únicamente con Admin SDK en Functions.

## Experiencia del cliente

Durante el envío se bloquean edición, eliminación y vaciado. Si la Function falla,
el carrito permanece intacto y aparece un mensaje específico para carrito
inválido, producto no disponible, sesión cerrada o problema temporal.

Tras el éxito se limpia la copia local y se muestra **Pedido enviado**, una
referencia corta y el total confirmado por servidor. El seguimiento de estados
`confirmed`, `preparing`, `ready` y posteriores corresponde a la Etapa 25.

## Probarlo localmente

La validación integral inicia todos los servicios, carga el seed, crea un usuario
anónimo y un pedido temporal, prueba un reintento, rechaza un precio manipulado y
un producto no disponible, y finalmente limpia sus datos:

```powershell
npm.cmd run test:emulators
```

Para recorrerlo visualmente, iniciá los emuladores y el seed como en las etapas
anteriores, abrí `http://127.0.0.1:5100`, agregá productos, entrá en **Ver pedido**
y presioná **Enviar pedido**. El nuevo documento aparecerá bajo:

```text
establishments/mesa-flow-demo/orders/<orderId>
```

No se desplegó ninguna Function en desarrollo ni producción. El recorrido cloud
seguirá pendiente mientras no se habilite facturación; el MVP local es funcional
sin tarjeta.

## Verificación

```powershell
cd apps/customer
flutter.bat analyze
flutter.bat test
flutter.bat build web --release --dart-define=MESAFLOW_ENV=emulator
cd ../..
npm.cmd run functions:check
npm.cmd run test:emulators
npm.cmd run check
```

Resultados de cierre:

- análisis Flutter sin observaciones;
- 57 pruebas Flutter aprobadas;
- 16 pruebas unitarias de Functions aprobadas;
- callable real ejecutada con Auth y Firestore Emulator;
- precio manipulado y producto no disponible rechazados;
- reintento idempotente sin pedido ni consumo duplicados;
- reglas confirmadas: el cliente no escribe pedidos directamente;
- fixtures temporales eliminados al terminar;
- desarrollo y producción no fueron contactados.

## Criterios de aceptación

- [x] El cliente no envía precios ni totales confiables.
- [x] La identidad proviene de Firebase Auth.
- [x] Mesa, sesión y participante se validan en servidor.
- [x] Productos, categorías, moneda y disponibilidad se vuelven a leer.
- [x] El snapshot usa precios vigentes y totales enteros.
- [x] Pedido y consumo se actualizan en una sola transacción.
- [x] Reintentar la misma solicitud no duplica efectos.
- [x] El carrito se conserva ante fallas y se limpia después del éxito.
- [x] La interfaz confirma referencia y total creados.

## Próximo paso

La Etapa 25 agregará la lectura en tiempo real de pedidos de la sesión, su
recuperación después de recargar y un timeline amigable de estados.
