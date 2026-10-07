# Etapa 37 — Asistencia operativa

Estado: **completa localmente**. El panel incorpora una cola en tiempo real para
los llamados del salón y las solicitudes de cuenta que ya genera la aplicación
del cliente.

## Recorrido funcional

La nueva ruta `/operacion/asistencia` consulta únicamente documentos `pending` y
`acknowledged` del establecimiento activo, ordenados por antigüedad. La pantalla
muestra contadores, filtros y tarjetas visuales con mesa, tipo, estado y tiempo de
espera.

- `pending` muestra la acción **Atender**;
- `acknowledged` muestra la acción **Resolver**;
- al resolver, el documento sale automáticamente de la cola;
- el listener que ya existe en la aplicación Flutter recibe ambos cambios sin
  recargar y actualiza el mensaje que ve el cliente.

No se agregó sonido, notificación push ni ejecución en segundo plano. Las alertas
de esta etapa son deliberadamente visuales dentro del panel; WhatsApp queda
separado para la Etapa 40.

## Autorización y consistencia

`updateAssistanceStatus` es la única frontera de escritura operativa. El
navegador envía tenant, solicitud, estado esperado, siguiente estado y un
identificador aleatorio de operación. La Function vuelve a leer la membresía y
solo admite estas transiciones:

```text
pending → acknowledged → resolved
```

Propietario y encargado pueden operar por rol. Salón necesita el permiso
`assistance.manage`; cocina no ve la ruta ni puede invocar la transición. El
cliente no puede enviar rol, permisos ni identidad del miembro.

La actualización se realiza en una transacción. Un estado esperado obsoleto se
rechaza, cada operación crea `assistance.status.changed` en `auditLogs`, y repetir
el mismo `operationId` devuelve el resultado anterior sin duplicar efectos.
`acknowledgedBy` y `resolvedBy` se toman exclusivamente de Firebase Auth.

Firestore Rules continúa negando escrituras directas en `assistanceRequests`.
Los miembros activos conservan lectura operativa dentro de su tenant y los
participantes de mesa solo observan su propia solicitud.

## Evidencia

- 52 pruebas del panel aprobadas, incluidas conversión estricta de Timestamp,
  etiquetas y permisos de asistencia;
- 49 pruebas de Functions aprobadas, con validación de payload y transiciones;
- build React/Vite de emulador aprobado;
- suite completa de emuladores aprobada con reglas reales;
- smoke integrado: cocina rechazada, salón atiende y resuelve, reintento
  idempotente, auditoría creada y documento visible desde el SDK cliente;
- datos y auditorías temporales restaurados/eliminados al finalizar.

## Uso local

1. Desde la raíz, ejecutar `npm.cmd run emulators`.
2. Abrir `http://127.0.0.1:5105`.
3. Ingresar como `staff@mesaflow.example.invalid` con la contraseña demo
   documentada en el README del panel.
4. Abrir **Asistencia** en el menú lateral.
5. En otra pestaña, abrir una mesa del cliente y generar un llamado. La tarjeta
   aparecerá sin recargar; **Atender** y **Resolver** se reflejarán también en la
   vista del cliente.

No requiere configuración manual, un servicio externo ni cambios en los
proyectos cloud. El despliegue sigue reservado para la Etapa 47.
