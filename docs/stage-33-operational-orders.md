# Etapa 33 — Pedidos operativos en tiempo real

Estado: **completa localmente**. El panel reemplazó la pantalla reservada por un
tablero conectado a Firestore, detalle de cada comanda y transiciones de estado
ejecutadas exclusivamente por una Cloud Function autenticada.

## Tablero operativo

La ruta `/operacion/pedidos` escucha hasta 100 pedidos activos del
establecimiento seleccionado, ordenados por creación y filtrados mediante el
índice compuesto `status, createdAt`. No existe una consulta global ni se acepta
un tenant tomado de la URL.

Propietario, encargado y salón observan el recorrido operativo desde `created`
hasta `delivered`. Cocina recibe solamente `confirmed`, `preparing` y `ready`,
reduciendo los datos que no necesita para preparar comandas. Las actualizaciones
de Firestore se reflejan sin recargar la página.

El tablero incluye:

- conteos de nuevos, en preparación, listos y total visible;
- columnas por estado con mesa, hora, productos e importe;
- estados de conexión, vacío, error y reintento;
- panel lateral con cantidades, notas, total y acciones disponibles para el rol;
- diseño horizontal adaptable a escritorio, tablet y móvil.

Cada snapshot atraviesa el contrato compartido de pedidos. Timestamps no nativos,
totales manipulados, campos desconocidos o documentos de otro establecimiento se
rechazan antes de llegar a la interfaz.

## Máquina de estados compartida

La matriz vive en `@mesaflow/contracts` y es consumida por panel y backend:

| Desde | Hacia | Actores |
|---|---|---|
| `created` | `confirmed` | owner, manager, staff con `orders.manage` |
| `created` | `cancelled` | owner, manager, staff con `orders.manage` |
| `confirmed` | `preparing` | owner/manager con `orders.manage`; kitchen con `orders.prepare` |
| `confirmed` | `cancelled` | owner/manager; staff solo con `orders.cancel_confirmed` |
| `preparing` | `ready` | owner/manager con `orders.manage`; kitchen con `orders.prepare` |
| `ready` | `delivered` | owner, manager, staff con `orders.manage` |
| `delivered` | `completed` | owner o manager con `orders.manage` |

No se permiten saltos, retrocesos ni cambios desde estados finales.

## Escritura segura y concurrencia

El navegador envía únicamente establecimiento, pedido, estado esperado, próximo
estado y un `requestId` aleatorio. Nunca envía rol ni permisos. La Function
`updateOrderStatus` vuelve a leer en una transacción:

1. la membresía del UID autenticado;
2. el pedido y su estado actual;
3. el registro idempotente de auditoría.

Si el pedido cambió en otro dispositivo, responde `stale-order` y no sobrescribe
el cambio. Una transición válida actualiza `status`, agrega
`statusTimestamps.<estado>`, conserva el contrato completo y crea un `auditLog`
con actor, antes, después y timestamp. Repetir el mismo `requestId` devuelve el
mismo resultado sin duplicar escrituras.

Al cancelar un pedido nuevo o confirmado, la misma transacción descuenta su total
de `subtotalMinor` y `balanceMinor` en la sesión abierta. Si la sesión ya cambió,
fue pagada o el saldo no es coherente, la cancelación se rechaza sin escrituras
parciales. Así, **Tu cuenta** y el panel mantienen el mismo consumo.

Las reglas de Firestore mantienen `allow write: false` para pedidos y auditoría:
modificar el frontend no permite evitar la Function.

## Evidencia

- 15 pruebas del paquete de contratos, incluidas cinco de la matriz operativa.
- 26 pruebas del panel para contratos, visibilidad por rol, RBAC y autenticación.
- 37 pruebas de Functions, incluidas validación estricta de la transición.
- Lint y builds TypeScript aprobados.
- Smoke integrado con cuentas reales del emulador: cocina no puede confirmar un
  pedido nuevo, sí puede marcar uno en preparación como listo; salón lo entrega;
  el reintento es idempotente, la cancelación ajusta la sesión y cada cambio
  genera auditoría.

## Cómo probarlo

En una PowerShell desde la raíz:

```powershell
npm.cmd run emulators
```

En otra:

```powershell
npm.cmd run firebase:seed:demo
```

Abrir `http://127.0.0.1:5105` y usar cualquiera de estas cuentas con la
contraseña `MesaFlowDemo31!`:

- `owner@mesaflow.example.invalid`
- `manager@mesaflow.example.invalid`
- `staff@mesaflow.example.invalid`
- `kitchen@mesaflow.example.invalid`

El seed ya incluye pedidos en distintos estados. Para observar tiempo real, abrir
dos ventanas con roles diferentes y avanzar un pedido permitido.

## Siguiente etapa

La Etapa 34 incorporará administración de mesas, sesiones, rotación segura de QR
y exportación imprimible.
