# Etapa 31 — Base del panel administrativo

Estado: **completa localmente**. El panel dejó de ser una página estática y ahora
es una aplicación React + TypeScript servida por Vite. Authentication, recuperación
de contraseña, cierre de sesión y protección de rutas se probaron contra Firebase
Auth Emulator sin escribir en desarrollo ni producción.

## Base implementada

- React 19 y TypeScript estricto con build reproducible de Vite.
- TanStack Router para rutas públicas y privadas, y TanStack Query preparado para
  las consultas operativas de las próximas etapas.
- Sistema visual MesaFlow responsive con Poppins/Inter empaquetadas, tokens,
  estados de foco, navegación móvil y respeto por movimiento reducido.
- Configuraciones Firebase públicas y separadas para `demo-mesaflow`,
  `mesaflow-desarrollo` y `mesaflow-produccion`.
- Persistencia local de la sesión de personal y espera explícita del estado de
  Auth antes de decidir una redirección.
- Pantallas de ingreso y recuperación de contraseña que no revelan si una cuenta
  existe.
- Shell privado con resumen inicial y ruta reservada para el tablero operativo de
  pedidos de la Etapa 33.

## Autenticación y navegación

Las únicas rutas públicas son `/login` y `/recuperar-clave`. La raíz `/` y
`/operacion/pedidos` comparten un guard: si Firebase no tiene una sesión válida,
el router reemplaza la navegación por `/login` y conserva solamente un destino
interno seguro. Redirecciones externas, rutas `//` y barras invertidas se
descartan.

Una sesión válida no puede volver a las pantallas de acceso. El cierre de sesión
elimina la identidad persistida y el mismo guard vuelve a bloquear las rutas
privadas. Esta capa mejora la experiencia, pero no reemplaza las reglas de
Firestore ni el control de membresías que se integrará en la Etapa 32.

## Datos de demostración

El seed local sincroniza cuatro cuentas de Auth correspondientes a las membresías
owner, manager, staff y kitchen. Para revisar el panel local se usa:

- correo: `owner@mesaflow.example.invalid`
- contraseña: `MesaFlowDemo31!`

Son credenciales fijas y deliberadamente exclusivas del emulador. El script exige
`demo-mesaflow` y hosts loopback; nunca crea estas cuentas en los proyectos cloud.

## Evidencia

- 10 pruebas del panel aprobadas: ambientes, errores privados y guards.
- Lint TypeScript y build de producción del panel aprobados.
- 135 pruebas del chequeo raíz aprobadas.
- Build integrado en Firebase Hosting con fallback SPA y recarga profunda
  comprobada en `/operacion/pedidos`.
- Flujo emulado aprobado: login correcto, contraseña inválida rechazada y solicitud
  de recuperación aceptada.
- Suite completa de emuladores aprobada, incluidas 14 pruebas de Firestore y nueve
  de Storage, sin regresiones en QR, pedidos ni pagos.
- `npm audit --omit=dev`: cero vulnerabilidades en dependencias de producción.

La auditoría completa mantiene avisos altos de `braces` dentro de `chokidar@3`,
dependencia de desarrollo de Firebase CLI. El proyecto ya fuerza la última versión
publicada (`3.0.3`), pero el registro aún no ofrece una versión corregida y
`npm audit fix --force` propone degradar Firebase CLI. Este árbol no se incorpora
al panel ni a Functions desplegadas; queda documentado para la revisión de
seguridad de la Etapa 45.

## Cómo verlo

Desde la raíz, en una primera ventana de PowerShell:

```powershell
npm.cmd run emulators
```

Cuando la consola indique que los servicios están listos, en una segunda ventana:

```powershell
npm.cmd run firebase:seed:demo
```

Abrir `http://127.0.0.1:5105`, iniciar sesión con la cuenta local y comprobar que
la raíz privada se muestra. En una ventana de incógnito, abrir directamente
`http://127.0.0.1:5105/operacion/pedidos`: debe aparecer el login, no el contenido
privado. Detener los emuladores con `Ctrl+C`.

## Siguiente etapa

La Etapa 32 leerá las membresías del usuario autenticado, permitirá seleccionar
el establecimiento activo y aplicará la matriz de permisos en la interfaz. Las
reglas backend continúan siendo la autoridad aunque una acción se oculte en UI.
