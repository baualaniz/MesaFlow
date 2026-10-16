# Manual de uso y ejecución de MesaFlow

Esta guía permite recorrer el MVP completo sin cuentas cloud, tarjeta ni datos
reales. La demostración funcional se ejecuta con Firebase Emulator Suite; los
sitios productivos publicados sirven para comprobar la presentación y las rutas,
pero no ejecutan las operaciones que dependen de Cloud Functions.

## Antes de empezar

Se necesita Windows con PowerShell, Node.js, Java, Flutter, Firebase CLI y Google
Chrome. Desde la raíz del repositorio, una comprobación rápida del entorno es:

```powershell
npm.cmd run check:env
```

En PowerShell se usa `npm.cmd` para evitar el bloqueo de `npm.ps1`. No hace falta
cambiar permanentemente la política de ejecución.

## Iniciar la demostración local

1. Abrí PowerShell en la carpeta raíz de MesaFlow.
2. Ejecutá:

   ```powershell
   npm.cmd run emulators
   ```

3. Esperá hasta que la consola indique que todos los emuladores están listos.
   Dejá esa ventana abierta.
4. Abrí una segunda ventana de PowerShell en la misma carpeta.
5. Cargá el conjunto de datos ficticio:

   ```powershell
   npm.cmd run firebase:seed:demo
   ```

6. La salida debe indicar que se verificaron los documentos y usuarios. El
   comando puede repetirse sin duplicar información.

## Direcciones locales

| Superficie | Dirección | Uso |
|---|---|---|
| Landing | <http://127.0.0.1:5106> | Presentación comercial |
| Cliente | <http://127.0.0.1:5100> | Experiencia de la mesa 1 |
| Panel | <http://127.0.0.1:5105> | Operación y administración |
| Firebase local | <http://127.0.0.1:4000> | Auth, Firestore, Functions y Storage |

La raíz del cliente local prepara el acceso de demostración y termina en
`/e/mesa-flow-demo/table/mesa-01`. Si se abre esa ruta sin haber cargado el seed,
el menú no tendrá una sesión válida.

## Usuarios locales del panel

Todos usan la contraseña exclusiva del emulador `MesaFlowDemo31!`.

| Rol | Correo | Qué permite mostrar |
|---|---|---|
| Propietario | `owner@mesaflow.example.invalid` | Todas las secciones, métricas y configuración |
| Encargado | `manager@mesaflow.example.invalid` | Operación, catálogo y métricas |
| Salón | `staff@mesaflow.example.invalid` | Pedidos y asistencia |
| Cocina | `kitchen@mesaflow.example.invalid` | Preparación de pedidos |

Son identidades reservadas, sin casillas de correo reales, y solo existen en
Authentication Emulator.

## Recorrido del cliente

1. Abrí la aplicación cliente.
2. Explorá las categorías, buscá un producto y observá los productos agotados.
3. Abrí un producto, elegí cantidad y agregá una nota.
4. Añadilo al carrito y comprobá el total.
5. Enviá el pedido. El backend emulado vuelve a validar productos y precios.
6. Abrí **Tus pedidos** para seguir el estado en tiempo real.
7. Desde **Tu cuenta**, revisá consumo, pagos y saldo o pedí la cuenta.
8. Usá la opción de asistencia para llamar al personal.

Los pagos y WhatsApp están simulados localmente. Un retorno del navegador nunca
se considera prueba de pago: la conciliación autoritativa está en el webhook
emulado.

## Recorrido del panel

1. Abrí el panel e ingresá como propietario.
2. En **Pedidos**, abrí una comanda y avanzá solo por las transiciones ofrecidas.
3. En **Asistencia**, atendé o resolvé una solicitud pendiente.
4. En **Mesas**, revisá sesiones y QR; la rotación invalida el código anterior.
5. En **Productos**, modificá disponibilidad y comprobá el cambio en el cliente.
6. En **Equipo**, revisá los cuatro roles y sus permisos.
7. En **Métricas**, observá ventas, pagos, pedidos y productos destacados.
8. En **Configuración**, revisá marca, contacto, horarios y habilitación de
   pedidos/asistencia.

Para demostrar permisos, cerrá sesión e ingresá como salón o cocina. La interfaz
oculta las secciones no autorizadas y las reglas/backend vuelven a controlar cada
acción.

## Ver los datos

En Firebase local elegí **Firestore** y abrí
`establishments/mesa-flow-demo`. Allí se ven, entre otras, las subcolecciones
`members`, `tables`, `tableSessions`, `categories`, `products`, `orders`,
`assistanceRequests`, `payments`, `dailyMetrics`, `settings` y `auditLogs`.

El seed contiene únicamente datos ficticios: Bistró MesaFlow, diez mesas,
dieciocho productos, cuatro roles y actividad operativa preparada para la demo.

## Sitios productivos

- Cliente: <https://mesaflow-produccion.web.app>
- Panel: <https://mesaflow-produccion-admin.web.app>
- Landing: <https://mesaflow-produccion-landing.web.app>

Rules, índices y Hosting están publicados. Functions y el webhook no se
desplegaron porque requieren Blaze; por eso la demostración funcional completa se
hace localmente. No se debe intentar cargar el seed en producción.

## Cerrar o reiniciar

En la primera terminal presioná `Ctrl+C`. Los emuladores se detienen y sus datos
temporales se descartan. Para empezar de cero, volvé a iniciarlos y repetí el
seed.

## Problemas frecuentes

- **El puerto 5100 no carga:** comprobá que la terminal siga abierta y muestre
  los emuladores listos; luego recargá Chrome.
- **El menú queda esperando:** ejecutá el seed en la segunda terminal y volvé a
  abrir la raíz del cliente.
- **El panel rechaza el acceso:** usá exactamente una cuenta local de la tabla;
  no son usuarios de Firebase cloud.
- **Un puerto está ocupado:** cerrá una ejecución anterior con `Ctrl+C` antes de
  volver a iniciar.
- **`npm.ps1` está bloqueado:** escribí `npm.cmd`, sin cambiar la política global
  de Windows.
- **La primera ejecución demora:** Firebase puede descargar los emuladores
  oficiales; esperá a que la consola confirme que están listos.

## Verificación automática completa

Para validar el recorrido sin hacerlo manualmente:

```powershell
npm.cmd run test:e2e
```

El comando construye las aplicaciones, inicia servicios en puertos libres,
recorre QR, menú, pedido, operación y pago simulado, y apaga todo al terminar.

