# Informe ejecutivo — MesaFlow

**Fecha:** 16 de octubre de 2026

**Repositorio público:** <https://github.com/baualaniz/MesaFlow>

**Aplicación cliente:** <https://mesaflow-produccion.web.app>

**Panel administrativo:** <https://mesaflow-produccion-admin.web.app>

**Landing:** <https://mesaflow-produccion-landing.web.app>

## 1. Descripción

MesaFlow es un MVP SaaS multiestablecimiento para digitalizar la atención en
locales gastronómicos. El cliente entra desde el QR de su mesa, consulta el menú,
arma pedidos, sigue su estado, pide asistencia y revisa su cuenta. El personal
opera pedidos, cocina, mesas, asistencia, catálogo, equipo, configuración y
métricas desde un panel separado por roles.

## 2. Estado funcional

- Cliente Flutter Web/PWA con QR, sesión anónima, menú dinámico, búsqueda,
  detalle, carrito persistente, pedidos, seguimiento, asistencia y cuenta.
- Panel React/TypeScript con autenticación, recuperación de contraseña, RBAC,
  pedidos en tiempo real, mesas/QR, catálogo, equipo, asistencia, métricas y
  configuración.
- Landing Astro responsive con SEO, accesibilidad, recursos locales y enlaces a
  los dos productos.
- Backend Functions 2nd gen con validaciones privilegiadas, transacciones,
  idempotencia, auditoría, Checkout Pro, webhook y alerta WhatsApp opcional.
- Reglas e índices Firestore, reglas Storage opcionales, App Check y aislamiento
  por establecimiento.
- Suite unitaria, de componentes, reglas, integración y E2E con cobertura
  automática y CI en GitHub Actions.

## 3. Arquitectura y datos

El frontend se divide en Flutter para clientes, React para operación y Astro para
la landing. Firebase aporta Authentication, Firestore, Functions, Hosting y App
Check. Los contratos críticos existen en TypeScript y Dart.

Las colecciones raíz son `users`, `establishmentSlugs`, `establishments` y
`webhookEvents`. Cada `establishments/{establishmentId}` contiene `members`,
`tables`, `tableSessions`, `categories`, `products`, `orders`,
`assistanceRequests`, `payments`, `dailyMetrics`, `settings`, `qrExchanges` y
`auditLogs`, entre otras colecciones técnicas. El esquema versionado está en
`firebase/schema/firestore-schema.json`.

## 4. APIs y servicios elegidos

| Servicio | Uso | Estado |
|---|---|---|
| Firebase Authentication | Personal Email/Password y clientes anónimos | Configurado en dev/prod y emulado |
| Cloud Firestore | Menú, operación, sesiones, pedidos, pagos y métricas | Bases, reglas e índices publicados |
| Cloud Functions 2nd gen | Lógica privilegiada y webhooks | Completo y probado en emulador; cloud diferido |
| Firebase Hosting | Cliente, panel y landing | Publicado en desarrollo y producción |
| Firebase App Check | Reducción de abuso en clientes web | Registrado; enforcement gradual pendiente |
| Mercado Pago Checkout Pro | Checkout alojado y conciliación por webhook | Sandbox/emulador completo; producción diferida |
| WhatsApp Cloud API | Aviso opt-in de asistencia | Adaptador y mock listos; credenciales diferidas |
| Firebase Storage | Extensión para imágenes dinámicas | No requerido; el MVP empaqueta imágenes |

## 5. Seguridad y calidad

El sistema combina reglas multi-tenant, membresías, permisos por rol, validación
de servidor, CSP, App Check, secretos fuera de Git, precios recalculados,
idempotencia y logs redactados. Los pagos solo se acreditan después de validar la
firma y consultar al proveedor; una URL de retorno no es autoritativa.

La validación local ejecuta 362 pruebas, lint, builds y umbrales de cobertura. El
recorrido E2E adicional inicia la Emulator Suite y atraviesa
QR → menú → pedido → operación → pago simulado sin acceder a los proyectos cloud.

## 6. Despliegue y límites actuales

Authentication, Firestore, Rules, índices, App Check y los tres sitios Hosting
están preparados o publicados en los proyectos separados de desarrollo y
producción. Las URLs productivas, rutas profundas, 404 y cabeceras de seguridad
fueron verificadas.

Cloud Functions, los secretos reales, el webhook público de Mercado Pago y el
envío real de WhatsApp no están desplegados. Firebase exige Blaze para Functions
y todavía no se autorizó facturación. Este límite no afecta la demostración
local completa, pero significa que los sitios productivos muestran las
interfaces y no ejecutan esos flujos privilegiados.

## 7. Demostración

La demo usa exclusivamente el proyecto local `demo-mesaflow`, el establecimiento
ficticio **Bistró MesaFlow**, diez mesas, dieciocho productos y cuatro usuarios
con correos `.example.invalid`.

Desde la raíz del repositorio:

```powershell
npm.cmd run emulators
```

En otra terminal:

```powershell
npm.cmd run firebase:seed:demo
```

Después se abren cliente en <http://127.0.0.1:5100>, panel en
<http://127.0.0.1:5105>, landing en <http://127.0.0.1:5106> y Firebase local en
<http://127.0.0.1:4000>. El manual completo está en `docs/user-guide.md` y el
relato de presentación en `docs/demo-script.md`.

## 8. Próximo paso

La Etapa 50 realizará la regresión final, consolidará evidencia para la
Definition of Done y corregirá cualquier hallazgo antes de declarar el MVP
cerrado.
