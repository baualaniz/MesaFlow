# Panel administrativo MesaFlow

Aplicación web React + TypeScript para propietarios, encargados, salón y cocina.
Las Etapas 31 a 33 incorporan Vite, TanStack Router/Query, Firebase
Authentication, resolución segura de membresías, establecimiento activo, matriz
de permisos y tablero de pedidos en tiempo real con cambios auditados.

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

`npm.cmd run check --workspace @mesaflow/admin` ejecuta lint, 26 pruebas y el
build de emulador. `hosting/` es salida generada e ignorada por Git.
