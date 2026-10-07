# Etapa 36 — Equipo, invitaciones y roles

Estado: **completa localmente**. El panel incorpora `/equipo` y una Function
privilegiada para listar, invitar, activar, desactivar y cambiar el rol del
personal sin permitir escrituras directas de membresías desde el navegador.

## Flujo de invitación

Propietario y encargado ingresan nombre, correo y rol. `manageTeam` vuelve a leer
la membresía del actor, busca o crea la cuenta en Firebase Authentication y crea
la membresía bajo el establecimiento activo. El navegador solicita después a
Firebase el correo para establecer o restablecer la contraseña.

La contraseña temporal aleatoria nunca se devuelve, registra ni muestra. La
persona invitada decide su propia clave desde el enlace administrado por Firebase.
En el emulador, ese enlace aparece en la consola local; en desarrollo y producción
usa la plantilla de correo configurada en Authentication.

Invitar un correo que ya posee una cuenta reutiliza el mismo UID y añade solamente
la membresía del nuevo establecimiento. El perfil global conserva una lista de
establecimientos orientativa, pero cada acceso vuelve a validar el documento
`establishments/{establishmentId}/members/{uid}`.

## Matriz de administración

| Actor | Puede asignar | Puede editar |
|---|---|---|
| Propietario | propietario, encargado, salón, cocina | cualquier miembro |
| Encargado | salón, cocina | únicamente salón y cocina |
| Salón / Cocina | ninguno | ninguno |

Los permisos no forman parte del formulario ni se aceptan desde el cliente. La
Function los deriva de una matriz canónica:

- propietario: establecimiento, menú, pedidos y métricas;
- encargado: menú, pedidos y métricas;
- salón: pedidos y asistencia;
- cocina: preparación de pedidos.

Un encargado no puede crear, editar ni convertirse en propietario o encargado.
Cada actualización usa `expectedUpdatedAt`, genera auditoría idempotente y vuelve
a comprobar actor, destino y tenant dentro de la transacción.

## Salvaguardas

- Firestore Rules continúa negando todas las escrituras directas en `members`.
- Una membresía de otro establecimiento no autoriza ninguna operación.
- No se puede desactivar ni degradar al último propietario activo.
- La desactivación conserva historial y auditoría; no elimina la cuenta global.
- Reintentar la misma solicitud no crea cuentas ni membresías duplicadas.
- Los correos y nombres se obtienen por Admin SDK solo después de autorizar al
  actor para ese establecimiento.

## Evidencia

- 47 pruebas del panel, lint y build Vite aprobados.
- 45 pruebas de Functions, incluidas cuatro del contrato de administración.
- Smoke integrado: manager no asigna owner ni cruza tenant; owner invita de forma
  idempotente; Firebase acepta el correo de acceso; manager cambia staff a cocina
  desactivada; la escalada a owner y la baja del último owner son rechazadas.
- Todos los fixtures temporales, cuentas y auditorías se eliminan al terminar.

## Cómo probarlo

En una PowerShell desde la raíz:

```powershell
npm.cmd run emulators
```

En otra terminal:

```powershell
npm.cmd run firebase:seed:demo
```

Abrir `http://127.0.0.1:5105/equipo` e ingresar como owner o manager con
`MesaFlowDemo31!`. Para una invitación local se puede usar un correo ficticio; el
enlace de cambio de contraseña aparecerá en la consola del emulador Auth. En un
proyecto real, el destinatario debe abrir el correo y elegir su clave.

## Siguiente etapa

La Etapa 37 incorporará la cola operativa de asistencia, acknowledge/resolve y
alertas visuales sincronizadas con el estado que ya observa el cliente.
