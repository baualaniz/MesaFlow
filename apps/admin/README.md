# Panel administrativo MesaFlow

Aplicación web React + TypeScript para propietarios, encargados, salón y cocina.
Las Etapas 31 a 34 incorporan Vite, TanStack Router/Query, Firebase
Authentication, resolución segura de membresías, establecimiento activo, matriz
de permisos, pedidos en tiempo real y administración de mesas, sesiones y QR.

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

`npm.cmd run check --workspace @mesaflow/admin` ejecuta lint, 33 pruebas y el
build de emulador. `hosting/` es salida generada e ignorada por Git.

La ruta `/operacion/mesas` ofrece listado realtime, alta y edición, sesiones,
rotación segura individual/masiva y hojas QR listas para imprimir o guardar como
PDF. Salón conserva vista operativa; solo propietario y encargado pueden mutar.
