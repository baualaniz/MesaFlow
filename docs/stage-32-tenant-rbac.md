# Etapa 32 — Selección de establecimiento y permisos por rol

Estado: **completa localmente**. Después del login, el panel resuelve las
membresías activas del usuario, elige un establecimiento válido y adapta la
navegación al rol y a sus permisos. Las reglas de Firestore continúan siendo la
autoridad: ocultar una opción en pantalla nunca concede ni reemplaza permisos.

## Resolución segura del establecimiento

El documento propio `users/{uid}` contiene `establishmentIds`, una lista de
referencias para descubrir las membresías sin una consulta global. Esa lista no
es una autorización. Por cada ID, el panel lee directamente
`establishments/{establishmentId}/members/{uid}` y solo acepta una membresía
activa, bien formada y vinculada al mismo usuario y establecimiento. También
descarta establecimientos inexistentes o inactivos.

Los documentos se validan de forma estricta: campos desconocidos, timestamps no
nativos, roles inválidos, permisos duplicados o IDs inconsistentes producen un
estado de error recuperable en vez de abrir el panel con datos ambiguos.

Si existe más de una membresía válida, el encabezado permite cambiar de
establecimiento. La preferencia se guarda localmente con una clave separada por
UID y vuelve a validarse contra las membresías vigentes en cada inicio. Si dejó
de ser válida, se selecciona automáticamente la primera alternativa autorizada.

## Matriz de acceso de la interfaz

| Rol | Resumen | Pedidos | Mesas | Productos | Equipo | Métricas | Configuración |
|---|---:|---:|---:|---:|---:|---:|---:|
| Propietario | Sí | Sí | Sí | Sí | Sí | Sí | Sí |
| Encargado | Sí | Sí | Sí | Sí | Sí | Sí | No |
| Salón | Sí | Sí | Sí | No | No | No | No |
| Cocina | Sí | Sí | No | No | No | No | No |

Además del rol, las capacidades operativas exigen el permiso granular
correspondiente, por ejemplo `orders.manage`, `orders.prepare`, `menu.manage` o
`metrics.read`. La navegación omite módulos no autorizados y el guard de la ruta
de pedidos vuelve a comprobar la capacidad antes de cargarla.

Esta matriz es defensa en profundidad para la experiencia del usuario. Las reglas
de Firestore bloquean lecturas y escrituras aunque alguien altere el navegador o
construya una solicitud manual. Una referencia agregada al perfil no permite leer
la membresía ni datos privados de otro tenant.

## Estados previstos

- Mientras se verifican perfil y membresías, el panel muestra una espera neutra.
- Sin membresías activas, informa que la cuenta no tiene establecimientos y
  permite cerrar sesión.
- Ante un error de lectura o contrato, ofrece reintentar sin revelar datos.
- Con acceso válido, muestra nombre del establecimiento y rol actual.

## Datos y prueba local

El seed demo agrega a cada perfil su establecimiento y mantiene cuatro cuentas
con la contraseña común `MesaFlowDemo31!`:

- `owner@mesaflow.example.invalid`
- `manager@mesaflow.example.invalid`
- `staff@mesaflow.example.invalid`
- `kitchen@mesaflow.example.invalid`

Para revisarlo, iniciar los emuladores desde la raíz con
`npm.cmd run emulators`, ejecutar `npm.cmd run firebase:seed:demo` en otra
PowerShell y abrir `http://127.0.0.1:5105`. Cambiar de cuenta permite comprobar
la navegación visible para cada rol.

## Evidencia

- 20 pruebas del panel aprobadas, incluidas matriz RBAC, contratos de perfil,
  membresía, establecimiento y selección segura.
- Lint TypeScript y build de producción del panel aprobados.
- Smoke integrado de Auth + Firestore: el owner demo resuelve su perfil,
  membresía activa y establecimiento mediante las reglas reales.
- 15 pruebas emuladas de reglas Firestore, incluido el intento de usar una
  referencia de perfil para acceder a otro tenant.
- Seed determinista de 61 documentos, ahora con referencias de establecimiento
  en los cuatro perfiles del personal.

## Siguiente etapa

La Etapa 33 reemplazará la pantalla reservada de pedidos por el tablero operativo
en tiempo real. Las transiciones de estado se validarán en backend y respetarán
la membresía activa y los permisos definidos aquí.
