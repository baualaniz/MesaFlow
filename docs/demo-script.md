# Guion de demostración de MesaFlow

Duración sugerida: **8 a 10 minutos**. Identidad de presentación: producto
**MesaFlow** y establecimiento ficticio **Bistró MesaFlow**.

## Preparación, 10 minutos antes

1. Cerrá ejecuciones anteriores de Firebase Emulator Suite.
2. En una terminal ejecutá `npm.cmd run emulators` y esperá el mensaje de listo.
3. En otra terminal ejecutá `npm.cmd run firebase:seed:demo`.
4. Abrí estas pestañas, en este orden:
   - <http://127.0.0.1:5106>;
   - <http://127.0.0.1:5100>;
   - <http://127.0.0.1:5105>;
   - <http://127.0.0.1:4000/firestore>.
5. Ingresá al panel con `owner@mesaflow.example.invalid` y
   `MesaFlowDemo31!`.
6. Mantené abiertas las terminales y no uses los proyectos cloud durante la
   presentación.

Si querés comprobar todo antes de exponer, ejecutá `npm.cmd run test:e2e`, dejá
que termine y luego repetí los pasos de preparación para tener una demo visible.

## 1. Problema y propuesta — 45 segundos

Mostrar la landing.

> MesaFlow conecta al cliente, al salón, a la cocina y a la administración desde
> una misma fuente de información. El cliente no instala nada: entra por el QR
> de la mesa; el equipo recibe pedidos y asistencia en tiempo real.

Señalar **Cómo funciona**, **Producto** y el CTA hacia la experiencia. Explicar
que hay una aplicación cliente, un panel por roles y un backend Firebase.

## 2. Experiencia del cliente — 2 minutos

Mostrar el cliente en la mesa 1.

1. Recorrer categorías y búsqueda.
2. Abrir un producto con imagen y agregar una nota.
3. Incorporarlo al carrito y mostrar el cálculo del total.
4. Enviar el pedido.
5. Abrir **Tus pedidos** y enseñar su timeline.
6. Mostrar **Tu cuenta** y la solicitud de asistencia.

Mensaje clave: los importes se manejan como enteros y el servidor vuelve a leer
precio, mesa, sesión y permisos; el navegador no decide el total definitivo.

## 3. Operación del establecimiento — 3 minutos

Pasar al panel ya autenticado.

1. **Pedidos:** abrir el pedido recién creado y mostrar el próximo estado válido.
2. **Asistencia:** enseñar la cola y cómo se atiende/resuelve una solicitud.
3. **Productos:** cambiar disponible/agotado y volver al cliente para mostrar el
   reflejo en tiempo real.
4. **Mesas:** enseñar sesiones y QR rotables.
5. **Equipo:** señalar owner, manager, staff y kitchen.

Mensaje clave: los roles limitan tanto la navegación como las operaciones del
backend y el acceso a Firestore; no dependen únicamente de botones ocultos.

## 4. Administración y datos — 90 segundos

1. Mostrar **Métricas**: ventas, pagos, pedidos y productos destacados.
2. Mostrar **Configuración**: marca, contacto, horarios y flags operativos.
3. Abrir Firestore Emulator y recorrer
   `establishments/mesa-flow-demo`, señalando `orders`, `payments`,
   `dailyMetrics` y `auditLogs`.

Mensaje clave: el modelo es multiestablecimiento; cada tenant agrupa su operación
y las reglas impiden mezclar información entre restaurantes.

## 5. Arquitectura, seguridad y calidad — 1 minuto

Explicar sin entrar en archivos:

- Flutter Web/PWA para clientes, React/TypeScript para el panel y Astro para la
  landing;
- Authentication, Firestore, Functions, Hosting y App Check;
- reglas multi-tenant, validación de servidor, idempotencia y auditoría;
- pruebas unitarias, de componentes, reglas, integración y recorrido E2E en CI;
- imágenes y fuentes incluidas para que el MVP no dependa de Storage ni CDN.

## 6. Estado real y cierre — 45 segundos

> Los tres sitios, las reglas y los índices están publicados en desarrollo y
> producción. Para mantener el MVP sin tarjeta, las Functions, Mercado Pago y
> WhatsApp funcionan integralmente en emuladores y todavía no están desplegados.
> La arquitectura ya deja preparado ese paso cuando se autorice Blaze y se
> carguen secretos reales.

Cerrar con el repositorio público:
<https://github.com/baualaniz/MesaFlow>.

## Plan de contingencia

- Si una pantalla no carga, usar la pestaña ya abierta y comprobar que la
  terminal de emuladores siga activa.
- Si el seed falta, repetir `npm.cmd run firebase:seed:demo`; es idempotente.
- Si una acción alteró el escenario, reiniciar emuladores y volver a cargar el
  seed.
- Si no hay tiempo, mostrar landing → cliente → pedidos del panel → Firestore y
  explicar el resto verbalmente.
- Si la computadora no puede iniciar el entorno, usar los sitios productivos
  solo para enseñar interfaz y aclarar que las operaciones cloud están diferidas.

## Preguntas esperables

- **¿Por qué Firebase?** Integra identidad, tiempo real, reglas, backend y hosting
  con un modelo adecuado para el MVP.
- **¿Por qué no hay tarjeta?** La experiencia completa es reproducible con
  emuladores; Functions productivas requieren Blaze y una autorización separada.
- **¿El pago se acredita por volver del checkout?** No. Solo el webhook verificado
  consulta al proveedor y concilia el pago.
- **¿Cómo se evita mezclar restaurantes?** Rutas ancladas por establecimiento,
  membresías, reglas y validaciones de backend.
- **¿La demo usa datos personales?** No; dominios `.example.invalid`, teléfonos y
  operaciones son ficticios.

