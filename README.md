# MesaFlow

MesaFlow es un MVP SaaS multiestablecimiento para digitalizar la atención de
mesas: menú web por QR, pedidos y seguimiento para clientes, operación en tiempo
real para el personal, pagos y métricas para administración.

Repositorio público: [github.com/baualaniz/MesaFlow](https://github.com/baualaniz/MesaFlow).

Que el código sea visible públicamente no convierte las credenciales en públicas:
tokens, cuentas de servicio y archivos `.env` reales permanecen fuera de Git.

## Estado

Las **Etapas 1 a 42** están terminadas en su alcance local. Los dos proyectos
Firebase existen, Authentication y Firestore fueron preparados, y Auth,
Firestore, Storage, Functions y tres sitios Hosting se prueban con emuladores.
Solo los índices de Firestore en desarrollo fueron desplegados; reglas, Functions
y sitios continúan locales. La app Flutter inicializa Firebase Core con apps Web
separadas para desarrollo y producción, y usa `demo-mesaflow` por defecto local.
El sistema visual incluye Poppins/Inter empaquetadas, tokens y componentes
semánticos probados en móvil y escritorio.
La landing comercial ya es una aplicación Astro responsive con propuesta de valor,
recorrido del producto, funcionalidades, beneficios, planes, preguntas frecuentes
y CTAs hacia la experiencia y el panel. Usa únicamente fuentes e imágenes locales
y conserva una página 404 independiente.
La misma landing publica canonical, Open Graph, Twitter Card, JSON-LD, favicon,
manifiesto, robots y sitemap; su navegación por teclado, contraste y rendimiento
se controlan con pruebas y Lighthouse local.
La aplicación reconoce enlaces QR `/e/:slug/table/:tableId`, conserva la ruta al
recargar y rechaza contextos de mesa mal formados sin tratarlos como autorización.
El token QR se canjea mediante Auth anónima y Functions, se elimina de la URL y
las recargas recuperan únicamente una participación vigente en Firestore.
Después del canje, el cliente lee desde Firestore solo categorías activas y
productos activos/disponibles del establecimiento validado, con búsqueda,
filtros y estados de carga, vacío y reintento.
El detalle de cada producto permite elegir una cantidad válida, agregar una nota
de hasta 300 caracteres y calcular el subtotal con enteros antes de incorporarlo
al pedido. El carrito queda guardado por establecimiento y sesión en el
dispositivo, permite editar, eliminar o vaciar líneas y vuelve a calcular los
totales con el catálogo vigente al recargar.
El botón **Enviar pedido** llama a una Function autenticada: el servidor valida
mesa, sesión y participante, vuelve a leer productos y precios, crea el snapshot
del pedido y actualiza el consumo en una transacción idempotente.
La sección **Tus pedidos** escucha en tiempo real únicamente los pedidos de la
sesión validada, muestra su contenido y timeline de estados, y los recupera desde
Firestore después de recargar la aplicación.
El botón **Tu cuenta** solicita al servidor un resumen recalculado desde pedidos
no cancelados y pagos aprobados. Muestra consumo, pagos y saldo, y permite pedir
la cuenta reutilizando el canal seguro de asistencia de la mesa.
La aplicación **MesaFlow Desarrollo** de Mercado Pago usa Checkout Pro mediante
Preferences API con un vendedor argentino de prueba validado. Su Access Token
permanece únicamente en un archivo local ignorado; producción sigue deshabilitada.
Desde **Tu cuenta**, el cliente puede pedir una preferencia cuyo importe se
recalcula en el backend y abrir el checkout externo. El intento es idempotente,
se recupera por referencia externa y queda guardado en una colección solo
servidor. Los retornos `success`, `pending` y `failure` son informativos: ninguno
acredita el pago; esa autoridad queda reservada al webhook de la Etapa 30.
El webhook ya valida la firma con el SDK oficial, consulta el pago directamente
en Mercado Pago y concilia de forma transaccional e idempotente el documento de
pago, el saldo y el estado de la sesión. Una firma falsa no toca Firestore y un
reintento no duplica importes. Su URL pública y la clave secreta se configurarán
al desplegar Functions en la Etapa 47; no se activó facturación en esta etapa.
El panel administrativo ya es una aplicación React + TypeScript responsive con
Firebase Authentication, inicio/cierre de sesión, recuperación de contraseña y
rutas privadas. Después de autenticar, valida el perfil, cada membresía y el
establecimiento activo contra Firestore. La navegación se adapta a owner,
manager, staff o kitchen y a sus permisos granulares; las reglas siguen
bloqueando cualquier intento de saltarse la interfaz.
La sección de pedidos ya funciona en tiempo real: muestra la cola adecuada para
cada rol, abre el detalle de la comanda y ejecuta una máquina de estados
transaccional, idempotente y auditada mediante Cloud Functions.
La sección de mesas administra inventario, sesiones y QR imprimibles con rotación
segura. La sección de productos permite ordenar y mantener categorías y platos,
usar las imágenes ya incluidas y marcar disponibilidad; el cambio se refleja en
el menú del cliente. Staff solo puede alternar disponible/agotado.
La sección de equipo permite invitar por correo, reenviar el acceso y administrar
roles y activación. Los permisos se derivan en Functions: un encargado solo puede
gestionar salón/cocina y nunca puede otorgarse owner ni cruzar establecimiento.
La sección de asistencia muestra en vivo los llamados y pedidos de cuenta. Salón,
encargado y propietario pueden atender y resolver; cada cambio es transaccional,
auditado y se refleja en la aplicación del cliente sin recargar.
El dashboard administrativo ya presenta ventas, pagos, pedidos y productos más
pedidos a partir de agregados diarios transaccionales. Lee como máximo siete días,
no recorre historiales completos y reserva los importes a propietario/encargado.
La nueva sección **Configuración** permite a propietario y encargado mantener la
marca, contacto, horarios y opciones públicas/privadas. La marca se aplica al
acceso QR y pausar pedidos bloquea órdenes nuevas en el backend.
Las solicitudes de asistencia pueden generar una alerta opt-in por WhatsApp. El
emulador usa un proveedor falso sin credenciales; el envío real queda preparado
para Cloud API con plantilla configurable, límite por establecimiento, logs sin
teléfono en claro y fallos desacoplados de la atención operativa.
La especificación consolidada, las decisiones y el plan completo se
encuentran en:

- `docs/product-spec.md`
- `docs/architecture.md`
- `docs/master-plan.md`
- `docs/stage-01-environment.md`
- `docs/stage-02-repository.md`
- `docs/stage-03-firebase-environments.md`
- `docs/stage-04-emulators.md`
- `docs/stage-05-authentication.md`
- `docs/stage-06-firestore.md`
- `docs/stage-07-storage.md`
- `docs/stage-08-functions.md`
- `docs/stage-09-secrets.md`
- `docs/stage-10-hosting.md`
- `docs/stage-11-contracts.md`
- `docs/stage-12-data-model.md`
- `docs/stage-13-firestore-indexes.md`
- `docs/stage-14-firestore-rules.md`
- `docs/stage-15-storage-rules.md`
- `docs/stage-16-demo-seed.md`
- `docs/stage-17-customer-shell.md`
- `docs/stage-18-design-system.md`
- `docs/stage-19-routing.md`
- `docs/stage-20-qr-exchange.md`
- `docs/stage-21-dynamic-menu.md`
- `docs/stage-22-product-detail.md`
- `docs/stage-23-persistent-cart.md`
- `docs/stage-24-create-order.md`
- `docs/stage-25-order-tracking.md`
- `docs/stage-26-assistance.md`
- `docs/stage-27-consumption.md`
- `docs/stage-28-mercado-pago.md`
- `docs/stage-29-payment-preference.md`
- `docs/stage-30-payment-webhook.md`
- `docs/stage-31-admin-foundation.md`
- `docs/stage-32-tenant-rbac.md`
- `docs/stage-33-operational-orders.md`
- `docs/stage-34-tables-qr.md`
- `docs/stage-35-catalog-management.md`
- `docs/stage-36-team-roles.md`
- `docs/stage-37-operational-assistance.md`
- `docs/stage-38-sales-metrics.md`
- `docs/stage-39-establishment-settings.md`
- `docs/stage-40-whatsapp-assistance.md`
- `docs/stage-41-commercial-landing.md`
- `docs/stage-42-seo-accessibility.md`
- `docs/tooling-security.md`
- `SECURITY.md`

## Estructura prevista

```text
apps/
  customer/       Flutter Web/PWA, compatible con Android/iOS
  admin/          Panel web React + TypeScript
  landing/        Landing estática Astro
functions/        Backend seguro Firebase Cloud Functions
packages/
  contracts/      Contratos, enums y validaciones compartidos en TypeScript
firebase/         Seeds y pruebas de reglas
docs/             Arquitectura, operación, seguridad y guías
scripts/          Automatización local segura
```

## Validación rápida

```powershell
npm.cmd ci --ignore-scripts
npm.cmd run check
```

En macOS/Linux se usa `npm run check`. En Windows, `npm.cmd` evita el bloqueo de
`npm.ps1` por la política de PowerShell sin modificarla.

La validación confirma la estructura canónica, los workspaces, los alias Firebase
y la ausencia de archivos o valores con forma de secreto. Además, ejecuta 225
pruebas (14 de configuración, cinco de herramientas, nueve de Authentication,
ocho de Firestore, seis de índices, ocho de Storage, cuatro de secretos, siete de Hosting,
cinco de Mercado Pago, cinco del seed de presentación, siete del seed demo, tres de FlutterFire,
15 de contratos, nueve de landing, 61 del panel y 59 de Functions), más los lint y builds
TypeScript. Este comando no consulta servicios remotos.

La auditoría visual/técnica de la landing usa Chrome local y se ejecuta aparte:

```powershell
npm.cmd run landing:audit
```

Los contratos compartidos tienen además siete pruebas Dart contra los mismos
fixtures. Se ejecutan por separado porque requieren el SDK Flutter:

```powershell
npm.cmd run contracts:check
```

## Configuración Authentication en la nube

Después de configurar proveedores, privacidad, contraseñas y dominios según la
guía de la Etapa 5:

```powershell
npm.cmd run auth:check -- all
```

El comando usa la sesión Firebase CLI existente y consulta solo la configuración
de `dev` y `prod`. No escribe recursos ni obtiene usuarios; las plantillas se
revisan manualmente. La política esperada vive en `firebase/auth-policy.json` y
no se aplica automáticamente a la nube.

## Configuración Firestore en la nube

La Etapa 6 fija Firestore Standard nativo en `southamerica-east1`. Después de
crear manualmente las bases `(default)` según `docs/stage-06-firestore.md`:

```powershell
npm.cmd run firestore:check -- all
npm.cmd run firestore:smoke:dev
```

El primer comando es de solo lectura. El segundo solo acepta desarrollo, crea un
documento técnico con ID aleatorio, verifica su lectura y lo elimina; nunca escribe
en producción.

La Etapa 13 versiona ocho consultas e índices. Tras desplegar manualmente solo los
índices en desarrollo, su estado y las consultas sobre el dataset demo se validan
sin escrituras:

```powershell
npm.cmd run firestore:indexes:check:dev
npm.cmd run firestore:queries:check:dev
```

## Emuladores locales

```powershell
npm.cmd run emulators
```

Abrí `http://127.0.0.1:4000` después de que indique que está listo. Incluye Auth,
Firestore, Storage, Functions y Hosting con proyecto local fijo `demo-mesaflow`. No se
necesita crear ese proyecto en Firebase. La primera ejecución descarga binarios.
Detenelo con Ctrl+C antes de ejecutar el smoke test:

```powershell
npm.cmd run test:emulators
```

El smoke valida los tres sitios Hosting, el endpoint Functions `health`,
Auth/Firestore, el CRUD tipado con aislamiento por tenant, 15 casos de reglas
Firestore y nueve casos de reglas Storage: roles, membresía activa,
aislamiento entre tenants, tipos, tamaños, extensión, metadata exacta, rutas y
actualizaciones.
También canjea un QR con un usuario anónimo, restaura la sesión y demuestra que
replay, alteración y rotación fallan antes de limpiar sus fixtures.
Con esa misma sesión crea un pedido transaccional, comprueba el precio recalculado,
la idempotencia y el incremento único del consumo, y elimina el pedido temporal.
También crea y cancela una solicitud de asistencia, confirma que un reintento no
la duplica y que el límite temporal bloquea spam inmediato.
Además valida el login, la contraseña inválida y la recuperación de clave del
panel contra Auth Emulator. Luego resuelve el establecimiento del owner desde su
perfil y su membresía usando las reglas reales de Firestore. También reconstruye
la cuenta desde los pedidos y pagos de Firestore y comprueba
que consumo, importe pagado y saldo coincidan con la sesión.
El recorrido administrativo comprueba además que cocina y salón solo ejecuten
las transiciones de pedido permitidas, con reintento idempotente y auditoría.
También valida el CRUD del catálogo, rechaza que staff cambie el contenido y
confirma que disponible/agotado modifica la consulta pública del cliente.
El flujo de equipo comprueba además invitación idempotente, correo de acceso,
roles derivados, aislamiento por tenant y protección del último propietario.
Finalmente crea dos veces una preferencia de pago para la misma sesión y confirma
que ambos intentos reutilizan el mismo checkout y un único documento interno.

La misma prueba carga además el dataset completo de la Etapa 16 y confirma una
segunda aplicación sin cambios: 4 roles, 10 mesas, 18 productos, 4 pedidos y 3
pagos. El dataset solo puede conectarse al emulador local `demo-mesaflow`.

Para verlo mientras los emuladores permanecen abiertos, usá dos terminales. En
la primera:

```powershell
npm.cmd run emulators
```

En la segunda:

```powershell
npm.cmd run firebase:seed:demo
```

Después abrí `http://127.0.0.1:4000/firestore`. Repetir el segundo comando es
seguro: verifica el mismo estado y no duplica documentos.

El mismo seed crea usuarios de personal solo en Auth Emulator. Para el panel
abrí `http://127.0.0.1:5105` e ingresá con
`owner@mesaflow.example.invalid` / `MesaFlowDemo31!`.

Los destinos web locales son cliente en `http://127.0.0.1:5100`, panel en
`http://127.0.0.1:5105` y landing en `http://127.0.0.1:5106`. Firebase informa
las direcciones definitivas al iniciar. La guía completa está en
`docs/stage-10-hosting.md`.

Abrí `http://127.0.0.1:5100` después de cargar el seed. La raíz local canjea el QR
fixture y limpia la credencial de la barra; la URL termina en
`http://127.0.0.1:5100/e/mesa-flow-demo/table/mesa-01` y se puede recargar sin
perder la sesión. Las raíces cloud esperan un QR válido.

## Cloud Functions local

La base TypeScript usa Functions 2nd gen y runtime desplegable Node 22. El build,
lint y las pruebas unitarias se ejecutan sin facturación:

```powershell
npm.cmd run functions:check
```

`npm.cmd run test:emulators` comprueba además la función HTTP real en
`http://127.0.0.1:5001/demo-mesaflow/southamerica-east1/health`. No se despliega
nada; Blaze solo se reconsiderará en la etapa de publicación del backend.

## Imágenes sin tarjeta

El MVP usa fotografías empaquetadas dentro de las aplicaciones y no requiere un
bucket real, Blaze ni una tarjeta. Las rutas y reglas de Cloud Storage permanecen
probadas como extensión opcional. Si se activa en el futuro, el bucket se comprueba
sin escribir con:

```powershell
npm.cmd run storage:check -- dev
```

El primer shell visual está en `apps/customer`. Se ejecuta con:

```powershell
cd apps/customer
flutter.bat pub get
flutter.bat build web --dart-define=MESAFLOW_ENV=emulator
cd ../..
npm.cmd run preview:customer
```

Después abrí `http://127.0.0.1:7357`. La vista previa se detiene con Ctrl+C.

El test inicia/apaga los servicios y elimina solo los usuarios/documentos que
creó. Nunca usa desarrollo ni producción. No exponer la UI fuera de esta máquina.

La CLI local se invoca también con `npm.cmd run firebase:login`,
`npm.cmd run firebase:projects` y `npm.cmd run firebase:use:dev`. Son comandos de
autenticación/listado/selección, no de despliegue.

## Ambientes Firebase

- `dev` → `mesaflow-desarrollo`.
- `prod` → `mesaflow-produccion`.
- `default` → desarrollo.

Los alias están en `.firebaserc` y no son credenciales. Una selección activa de
Firebase CLI puede prevalecer sobre `default`; los futuros comandos operativos
especificarán siempre `--project`. No ejecutar despliegues en esta etapa.

## Comprobar el entorno en Windows

Desde PowerShell, en la raíz del repositorio:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\check-environment.ps1
```

El script no instala ni modifica herramientas; informa qué está listo y qué
falta. Las instrucciones manuales completas están en `docs/master-plan.md`.

## Seguridad de secretos

La configuración está separada en tres niveles:

- `.env.example`: identificadores públicos que pueden llegar al frontend.
- `functions/.env.example`: identificadores privados, pero no credenciales.
- `functions/.secret.local.example`: nombres y placeholders de secretos para el
  emulador; la copia real `.secret.local` está ignorada.

Los tokens reales de Mercado Pago y WhatsApp se guardarán en Secret Manager y se
vincularán solo con cada función consumidora. Nunca deben incluirse en Flutter,
el panel, la landing ni Git. Verificar la política con:

```powershell
npm.cmd run secrets:check
```
