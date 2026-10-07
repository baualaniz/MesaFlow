# Panel administrativo MesaFlow

Aplicación web React + TypeScript para propietarios, encargados, salón y cocina.
Las Etapas 31 a 36 incorporan Vite, TanStack Router/Query, Firebase
Authentication, resolución segura de membresías, establecimiento activo, matriz
de permisos, pedidos en tiempo real, mesas/QR, catálogo y equipo.

## Uso local

Con los emuladores encendidos, el panel queda en `http://127.0.0.1:5105`.
El seed local crea cuatro cuentas reproducibles con la misma contraseña:

- `owner@mesaflow.example.invalid`
- `manager@mesaflow.example.invalid`
- `staff@mesaflow.example.invalid`
- `kitchen@mesaflow.example.invalid`

Contraseña: `MesaFlowDemo31!`.

Estas credenciales funcionan exclusivamente en `demo-mesaflow`; nunca se crean
en desarrollo ni producción.

`npm.cmd run check --workspace @mesaflow/admin` ejecuta lint, 47 pruebas y el
build de emulador. `hosting/` es salida generada e ignorada por Git.

La ruta `/operacion/mesas` ofrece listado realtime, alta y edición, sesiones,
rotación segura individual/masiva y hojas QR listas para imprimir o guardar como
PDF. Salón conserva vista operativa; solo propietario y encargado pueden mutar.

La ruta `/catalogo` ofrece CRUD y orden de categorías/productos, cuatro imágenes
empaquetadas y disponibilidad reflejada en el cliente. Owner/manager administran
la carta; staff puede marcar un producto disponible o agotado durante el servicio.

La ruta `/equipo` lista cuentas, roles y permisos. Owner administra todos los
roles; manager solo salón/cocina. Las invitaciones generan una membresía segura y
Firebase envía el enlace para que el destinatario defina su contraseña.
