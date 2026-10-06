# Panel administrativo MesaFlow

Aplicación web React + TypeScript para propietarios, encargados, salón y cocina.
La Etapa 31 incorpora Vite, TanStack Router/Query y Firebase Authentication con
sesión persistente, recuperación de contraseña y rutas privadas.

## Uso local

Con los emuladores encendidos, el panel queda en `http://127.0.0.1:5105`.
El seed local crea una cuenta reproducible:

- correo: `owner@mesaflow.example.invalid`
- contraseña: `MesaFlowDemo31!`

Estas credenciales funcionan exclusivamente en `demo-mesaflow`; nunca se crean
en desarrollo ni producción.

`npm.cmd run check --workspace @mesaflow/admin` ejecuta lint, diez pruebas y el
build de emulador. `hosting/` es salida generada e ignorada por Git.
