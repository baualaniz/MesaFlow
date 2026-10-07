# Etapa 34 — Mesas, sesiones y códigos QR

Estado: **completa localmente**. El panel incorpora la ruta
`/operacion/mesas`, un inventario realtime de mesas y operaciones seguras para
alta, edición, desactivación, eliminación controlada, sesiones y rotación QR.

## Panel de salón

La pantalla escucha las colecciones `tables` y `tableSessions` del
establecimiento activo. Presenta:

- resumen de mesas activas, disponibles, en servicio y desactivadas;
- tarjetas ordenadas por número con nombre, estado, consumo, saldo y versión QR;
- alta de nuevas mesas y edición de su nombre;
- activación/desactivación sin perder historial;
- apertura y cierre de sesiones;
- rotación individual o simultánea de todos los QR activos;
- hoja responsive para imprimir o guardar como PDF.

Salón puede consultar el estado operativo porque ya posee `tables.view`, pero
las mutaciones se muestran solamente a propietario y encargado. El backend
vuelve a verificar membresía, rol y permisos; ocultar un botón nunca es el
control de seguridad definitivo.

## Ciclo de vida de mesas y sesiones

`manageTable` es una callable autenticada y transaccional. Admite siete acciones:

1. `create`: crea una mesa activa con número permanente y QR inicial;
2. `update`: modifica nombre o estado usando control de concurrencia;
3. `delete`: elimina únicamente una mesa desactivada sin historial;
4. `openSession`: crea una sesión vacía y la vincula a la mesa;
5. `closeSession`: exige saldo cero y ausencia de pedidos operativos;
6. `rotateQr`: reemplaza un código individual;
7. `rotateManyQrs`: reemplaza hasta 50 códigos en una sola transacción.

Cada acción utiliza un `requestId`, crea auditoría y puede repetirse sin duplicar
la operación. El número de una mesa existente no se cambia porque forma parte de
su identificador y de los deep links físicos. Una mesa con historial se conserva
desactivada en lugar de borrarse.

## Seguridad del QR

El navegador genera 32 bytes criptográficamente aleatorios. La Function valida
su formato y guarda solamente SHA-256 junto con una versión creciente. El token
en texto plano permanece en memoria el tiempo necesario para construir la hoja
imprimible y no se escribe en Firestore, auditoría ni Git.

Cada hoja codifica una URL con esta forma:

```text
https://<cliente>/e/<slug>/table/<tableId>?token=<token-aleatorio>
```

El origen se selecciona por ambiente: `127.0.0.1:5100` en emulador y Hosting de
desarrollo o producción en cloud. Tras rotar, un canje con el código anterior es
rechazado inmediatamente. Los participantes que ya canjearon el QR conservan su
sesión hasta que se cierre; rotar no expulsa a comensales activos.

## Impresión

**Rotar e imprimir QR activos** actualiza atómicamente todos los códigos
seleccionados y abre una vista con dos tarjetas por hoja. El diálogo del sistema
permite imprimir o elegir **Guardar como PDF**. Como el token no se almacena en
texto plano, si se cierra la vista antes de guardar hay que rotar nuevamente.

Un QR identifica siempre a su mesa. Para aceptar nuevos comensales, esa mesa
debe estar activa y tener una sesión `open`; los estados `payment_pending`,
`paid` o `closed` no aceptan nuevos canjes.

## Evidencia

- 33 pruebas del panel y build de producción local aprobados.
- 41 pruebas de Functions, incluidas cuatro del contrato estricto de mesas.
- Smoke integrado: salón bloqueado, CRUD completo, sesión abierta/cerrada,
  rotación de las diez mesas, QR nuevo aceptado y anterior rechazado.
- Regresión aprobada de pedidos, consumo, asistencia, pago, Firestore y Storage.

## Cómo probarlo

En una PowerShell desde la raíz:

```powershell
npm.cmd run emulators
```

En otra, si el seed todavía no fue cargado:

```powershell
npm.cmd run firebase:seed:demo
```

Abrir `http://127.0.0.1:5105/operacion/mesas` e ingresar como propietario o
encargado con la contraseña demo `MesaFlowDemo31!`. Para probar un QR, primero
abrir la sesión de esa mesa, rotar su código y guardar la hoja. El enlace apunta
al cliente local en `http://127.0.0.1:5100`.

## Siguiente etapa

La Etapa 35 incorporará administración de categorías y productos, orden del menú,
selección de imágenes incluidas y disponibilidad reflejada en el cliente.
