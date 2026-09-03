# Plan maestro de implementación

Cada etapa indica objetivo, trabajo, dependencias, intervención manual, artefactos,
resultado y aceptación. `Código: sí` significa que Codex puede generar la parte
local; las cuentas, términos, credenciales y decisiones con costo pertenecen al
usuario.

## Fases 1–10: base y Firebase

| # | Etapa | Objetivo y trabajo | Dependencias | Manual | Código / archivos | Resultado y criterio verificable |
|---:|---|---|---|---|---|---|
| 1 | Entorno | Auditar/instalar Git, Flutter, Android SDK opcional, Node LTS, Java y Firebase CLI | Ninguna | Sí: instaladores y PATH | Sí: `scripts/check-environment.ps1`, README | Todas las herramientas responden y `flutter doctor` no tiene bloqueos web |
| 2 | Repositorio | Inicializar Git, convenciones, ramas simples y monorepo | 1 | Opcional: crear remoto GitHub | Sí: `.gitignore`, estructura | `git status` limpio y primer commit reproducible |
| 3 | Ambientes | Definir IDs Firebase dev/prod y archivos de alias | 2 | Sí: crear dos proyectos | Sí: `.firebaserc`, validación y tests | Los aliases `dev`/`prod` apuntan a proyectos distintos |
| 4 | Firebase CLI | Login, asociación y Emulator Suite inicial (Auth, Firestore, UI) | 1,3 | Sí: login OAuth | Sí: `firebase.json`, reglas cerradas, scripts/tests | `npm.cmd run test:emulators` pasa con ID demo; otros emuladores llegan con sus módulos |
| 5 | Authentication | Activar Email/Password y Anonymous; privacidad, contraseñas, plantillas y dominios | 3,4 | Sí: consola | Sí: política/verificador; SDKs en Etapas 17/31 | Configuración remota verificada y flujo local probado; login real al integrar apps |
| 6 | Firestore | Crear base, región, esquema raíz y converters | 3 | Sí: crear base | Sí: reglas/esquema/modelos | Escritura/lectura dev validada y región documentada |
| 7 | Storage | Activar bucket y rutas de imágenes por tenant | 3 | Sí: consola si lo pide | Sí: `storage.rules` | Solo miembros autorizados escriben imágenes de su tenant |
| 8 | Functions | Proyecto TypeScript, emulador y cuentas de servicio administradas | 4–7 | Sí: habilitar facturación solo al desplegar Functions | Sí: `functions/**` | Build, lint y función health local pasan |
| 9 | Secretos | Separar config pública y Secret Manager | 8 | Sí: cargar secretos reales | Sí: `.env.example`, docs | Ningún secreto aparece en artefactos frontend o Git |
| 10 | Hosting | Configurar tres sitios y rewrites | 3,4 | Sí: crear sitios/aceptar dominios | Sí: `firebase.json` | Cliente, admin y landing sirven localmente |

## Fases 11–20: datos, seguridad y base Flutter

| # | Etapa | Objetivo y trabajo | Dependencias | Manual | Código / archivos | Resultado y criterio verificable |
|---:|---|---|---|---|---|---|
| 11 | Contratos | Enums, validaciones, dinero, timestamps y contratos TS/Dart | 6 | No | Sí: `packages/contracts`, modelos Flutter | Contratos compilan y fixtures coinciden |
| 12 | Modelo de datos | Implementar colecciones, repositorios y consultas por tenant | 11 | No | Sí: repositorios/converters | CRUD del emulador conserva tipos y aislamiento lógico |
| 13 | Índices | Diseñar consultas e índices compuestos | 12 | Validación controlada en dev | Sí: `firestore.indexes.json` | Consultas verificadas en desarrollo real; el emulador no exige índices compuestos |
| 14 | Reglas Firestore | Autorización por membresía/sesión y campos inmutables | 12 | No | Sí: `firestore.rules` | Tests positivos/negativos pasan |
| 15 | Reglas Storage | Límites MIME/tamaño y membresía | 7,14 | No | Sí: `storage.rules`, tests | Carga cruzada y archivos inválidos se deniegan |
| 16 | Seed seguro | Datos demo, usuarios/roles, 10 mesas, 18 productos, pedidos/pagos | 11–14 | No en emulador; credencial dev solo si se solicita | Sí: `firebase/seeds` | Se niega producción y carga dataset idempotente |
| 17 | App Flutter | Crear proyecto web/PWA con flavors dev/prod | 1,3 | Sí: `flutterfire configure` con login | Sí: `apps/customer` | `flutter run -d chrome` muestra shell de marca |
| 18 | Design system | Tema MesaFlow, Poppins/Inter, spacing, inputs, cards, badges, errores | 17 | No | Sí: theme/widgets/assets | Catálogo y tests visuales básicos pasan responsive |
| 19 | Routing | Deep links QR y guards de sesión | 17 | No | Sí: router/screens | Recarga directa conserva `/e/:slug/table/:id` |
| 20 | Canje QR | Token hash, Anonymous Auth, callable exchange y sesión local segura | 8,14,19 | No | Sí: Function/servicio/pantallas/tests | Token válido abre sesión; alterado/repetido/rotado falla |

## Fases 21–30: recorrido del cliente y pago

| # | Etapa | Objetivo y trabajo | Dependencias | Manual | Código / archivos | Resultado y criterio verificable |
|---:|---|---|---|---|---|---|
| 21 | Menú | Categorías/productos activos, búsqueda y disponibilidad | 12,18–20 | No | Sí: repositorios/UI | Cliente ve solo menú publicable del tenant correcto |
| 22 | Producto | Detalle, imagen, notas y cantidad con validaciones | 21 | No | Sí: pantalla/widgets | No permite cantidades/precios inválidos |
| 23 | Carrito | Estado persistente por sesión y cálculo entero | 22 | No | Sí: providers/tests | Totales, edición y vaciado son deterministas |
| 24 | Crear pedido | Function transaccional recalcula precios y crea snapshot | 8,12,23 | No | Sí: Function/repositorio/tests | Manipular precio cliente no altera total servidor |
| 25 | Seguimiento | Listener de estado, timeline y recuperación | 24 | No | Sí: UI/realtime | Cambios del panel aparecen sin recargar |
| 26 | Asistencia | Crear/cancelar solicitud y estados operativos | 20 | No | Sí: Function/UI/tests | Una sesión válida no puede generar spam ilimitado |
| 27 | Consumo/cuenta | Sumar pedidos válidos, mostrar saldo y solicitar cuenta | 24–26 | No | Sí: Functions/UI | Total coincide con pedidos menos pagos aprobados |
| 28 | Mercado Pago config | Crear aplicación sandbox y credenciales | 8 | Sí: cuenta, términos y credenciales | Sí: guía/secrets | Credenciales test cargadas sin estar en Git |
| 29 | Preferencia/retorno | Function idempotente, Checkout Pro y rutas de retorno | 27,28 | Sí: URL pública en proveedor | Sí: backend/UI | Se abre checkout sandbox y retorno no marca aprobado |
| 30 | Webhook de pago | Verificación, consulta al proveedor, idempotencia, conciliación y reintentos | 29 | Sí: registrar webhook | Sí: endpoint/tests | Solo confirmación verificada actualiza pago/venta |

## Fases 31–40: panel, operación, métricas e integraciones

| # | Etapa | Objetivo y trabajo | Dependencias | Manual | Código / archivos | Resultado y criterio verificable |
|---:|---|---|---|---|---|---|
| 31 | Panel base | React/TS, design system, Firebase, login/logout/reset y guards | 1,5,18 | No | Sí: `apps/admin` | Usuario no autenticado no accede a rutas privadas |
| 32 | Selección tenant/RBAC | Membresías, tenant activo y permisos en UI | 14,31 | No | Sí: auth/permissions | UI oculta acciones y reglas bloquean bypass |
| 33 | Pedidos operativos | Tablero realtime, detalle y máquina de estados | 24,32 | No | Sí: UI/Function/tests | Solo transiciones válidas y autorizadas prosperan |
| 34 | Mesas y QR | CRUD, sesiones, rotación y exportación imprimible | 20,32 | No | Sí: UI/Functions | 10 QR abren su mesa y el anterior falla tras rotar |
| 35 | Categorías/productos | CRUD, orden, imagen y disponibilidad | 7,21,32 | No | Sí: UI/repositorios | Cambios se reflejan en cliente según permisos |
| 36 | Usuarios/roles | Invitación, activación y matriz de roles | 5,32 | Sí: destinatario acepta alta/restablece clave | Sí: Functions/UI | Manager no puede otorgarse owner ni cruzar tenant |
| 37 | Asistencia operativa | Cola, acknowledge/resolve y alertas visuales | 26,32 | No | Sí: UI/tests | Personal atiende y cliente ve resultado |
| 38 | Ventas/métricas | Agregados transaccionales diarios y dashboard | 30,33 | No | Sí: triggers/UI/tests | Métricas coinciden con fixtures sin scans globales |
| 39 | Configuración | Marca, horarios, contacto y flags públicos/privados | 32 | No | Sí: formularios/reglas | Solo owner/manager actualiza campos permitidos |
| 40 | WhatsApp | Alerta opt-in de asistencia con Cloud API, límite y logs | 26,37 | Sí: Meta app, número, token/template si aplica | Sí: Function/docs | Mensaje test o mock exitoso; fallo no bloquea asistencia |

## Fases 41–50: comercial, calidad, despliegue y entrega

| # | Etapa | Objetivo y trabajo | Dependencias | Manual | Código / archivos | Resultado y criterio verificable |
|---:|---|---|---|---|---|---|
| 41 | Landing | Astro responsive, secciones comerciales y CTAs | 18 | No | Sí: `apps/landing` | Lighthouse y breakpoints cumplen objetivo acordado |
| 42 | SEO/accesibilidad | Metadata, OG, favicon, semántica, teclado/contraste | 41 | Sí: dominio/imagen social finales opcionales | Sí: assets/tests | Auditoría sin errores críticos |
| 43 | Unit/widget/component | Lógica crítica Flutter/TS y componentes | Módulos previos | No | Sí: tests | Suite rápida verde y umbral acordado |
| 44 | Emuladores/integración | Auth, Firestore, Functions, Storage, Hosting y E2E | 10–40 | No | Sí: scripts/Playwright | Flujo QR→pedido→estado→pago simulado pasa |
| 45 | Seguridad | Threat model, reglas cruzadas, abuso, CORS, XSS, dependencias y logs | 44 | No | Sí: correcciones/docs | Checklist sin hallazgos críticos/altos abiertos |
| 46 | CI | Checks por PR y builds reproducibles | 43–45 | Sí: conectar GitHub/secrets de deploy | Sí: workflows | PR de prueba ejecuta lint/test/build |
| 47 | Deploy dev | Rules, indexes, Functions y tres sitios | 46 | Sí: login, plan Blaze para Functions, consentimiento | Sí: scripts/docs | Smoke tests en URLs dev pasan |
| 48 | Producción/dominio | Proyectos/secretos prod, dominios, DNS y rollback | 47 | Sí: cuentas, DNS y posibles costos | Sí: config/docs | HTTPS, webhooks y rutas profundas prod pasan |
| 49 | Documentación/demo | README, arquitectura, esquema, seguridad, pruebas, deploy, usuario y guion | 48 | Sí: validar datos/marca de presentación | Sí: `docs/**` | Persona nueva reproduce demo con la guía |
| 50 | QA/DoD | Regresión final de los 20 puntos, backups y checklist | 49 | Sí: aceptación final | Sí: reporte/correcciones | Los 20 puntos Definition of Done tienen evidencia |

## Estado de ejecución

| Etapa | Estado | Evidencia |
|---:|---|---|
| 1 | Completa | `docs/stage-01-environment.md` |
| 2 | Completa; remoto público configurado, protecciones de GitHub pendientes de verificación manual | `docs/stage-02-repository.md` |
| 3 | Completa; proyectos y acceso CLI confirmados por el usuario en Etapa 4 | `docs/stage-03-firebase-environments.md` |
| 4 | Completa: 17 tests, smoke test, UI HTTP 200 y apagado comprobados; acceso CLI confirmado por el usuario | `docs/stage-04-emulators.md` |
| 5 | En curso: 26 tests locales pasan; lectura remota detectó Anonymous, contraseñas y dominios prod pendientes; plantillas requieren revisión | `docs/stage-05-authentication.md` |

## Acciones manuales inmediatas — Etapa 1

### ACCIÓN MANUAL: comprobar Flutter

**Objetivo:** confirmar que el SDK puede compilar para web.

**Dónde hacerlo:** PowerShell en la raíz de MesaFlow.

**Pasos exactos:**

1. Ejecutá `Set-ExecutionPolicy -Scope Process Bypass`.
2. Ejecutá `.\scripts\check-environment.ps1`.
3. Si Flutter informa licencias Android pendientes y también querés compilar la
   aplicación nativa, ejecutá `flutter doctor --android-licenses` y aceptá las
   licencias. Esto no es necesario para la demo web.

**Qué opción seleccionar:** mantené Chrome/Web como destino obligatorio; Android
es opcional para este MVP.

**Qué valor copiar/guardar:** la salida completa si aparece un estado `FALTA` o
`ERROR`.

**Dónde se utilizará después:** diagnóstico de la Etapa 1.

**Cómo verificar:** `flutter doctor` no muestra bloqueos para Chrome/web.

### ACCIÓN MANUAL: instalar Firebase CLI

**Objetivo:** disponer de emuladores y despliegue Firebase.

**Dónde hacerlo:** PowerShell.

**Pasos exactos:**

1. Confirmá que `node --version` corresponde a una versión LTS compatible con la
   versión de Firebase CLI que vaya a instalarse.
2. Ejecutá `npm install -g firebase-tools`.
3. Ejecutá `firebase --version`.
4. No ejecutes `firebase login` todavía; se hará en la Etapa 4 al existir el
   proyecto de desarrollo.

**Qué opción seleccionar:** instalación global oficial mediante npm.

**Qué valor copiar/guardar:** la versión informada; no hay secretos en este paso.

**Dónde se utilizará después:** inicialización de emuladores y deploy.

**Cómo verificar:** `firebase --version` termina con código 0.

## Intervención futura del usuario

El usuario deberá intervenir únicamente para cuentas externas, aceptación de
términos, secretos, facturación, DNS y decisiones comerciales finales: crear los
proyectos Firebase dev/prod; autenticarse en Firebase/GitHub; crear aplicaciones
Mercado Pago y Meta; cargar secretos; habilitar Blaze antes de desplegar Functions;
y configurar dominios. Todo el código, reglas, índices, seed, tests, CI,
documentación y scripts de despliegue será generado y verificado en el repositorio.

## Cierre de Etapa 1

- [x] Git detectado.
- [x] Flutter detectado en PATH.
- [x] Node/npm detectados.
- [x] Java detectado.
- [x] Firebase CLI 15.28.2 instalada.
- [x] `flutter doctor` confirmado sin bloqueos web.
- [x] Base documental y verificador creados.

Android SDK y Visual Studio no están instalados. No bloquean Flutter Web/PWA;
solo serán necesarios si se amplía el alcance a binarios Android o Windows.

Commit sugerido: `chore(repo): bootstrap MesaFlow architecture and environment checks`.
