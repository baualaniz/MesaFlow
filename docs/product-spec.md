# Especificación consolidada del MVP

## Fuente y alcance

Esta especificación consolida el único documento adjunto disponible al iniciar
el repositorio. No se recibió un documento funcional adicional. Cuando aparezca,
se realizará un análisis de brechas sin invalidar decisiones compatibles.

MesaFlow será un SaaS multiestablecimiento que digitaliza la experiencia de una
mesa gastronómica. Su definición de terminado exige un recorrido demostrable de
punta a punta, desde la configuración del menú hasta el pago verificado y su
reflejo en métricas.

## Requisitos funcionales

### Cliente

1. Abrir desde un QR sin instalación obligatoria.
2. Validar establecimiento y mesa mediante un identificador no adivinable.
3. Navegar categorías, productos y detalles.
4. Administrar un carrito y confirmar un pedido.
5. Seguir en tiempo real el estado del pedido.
6. Pedir asistencia cuando la sesión de mesa lo permita.
7. Ver el consumo acumulado y solicitar la cuenta.
8. Iniciar un pago con Mercado Pago y ver su confirmación verificada por backend.

### Administración y operación

1. Autenticación, recuperación de contraseña y cierre de sesión.
2. Gestión de establecimiento, miembros, roles y permisos.
3. Gestión de mesas, activación/revocación de QR y sesiones.
4. Gestión de categorías, productos, imágenes y disponibilidad.
5. Recepción de pedidos en tiempo real y transición controlada de estados.
6. Gestión de solicitudes de asistencia.
7. Consulta de pagos, ventas y configuración.
8. Dashboard con ventas, pedidos, ticket promedio, pedidos activos, mesas
   ocupadas y productos más vendidos.

### Comercial

Landing responsive con propuesta de valor, funcionamiento, beneficios,
funcionalidades, planes Básico/Profesional/Empresarial, CTA, contacto y SEO.

## Requisitos no funcionales

- Aislamiento estricto entre establecimientos en reglas y backend.
- Principio de mínimo privilegio y secretos solo en backend.
- Experiencia responsive, accesible y observable, con estados de carga y error.
- Costos bajos y uso de datos agregados para métricas frecuentes.
- Entornos separados de desarrollo y producción.
- Emuladores, pruebas unitarias, de widgets/componentes, integración y reglas.
- Despliegue repetible, documentación y datos de demo seguros.

## Decisiones y ambigüedades resueltas

| Tema | Decisión del MVP | Motivo |
|---|---|---|
| Flutter móvil vs. uso sin instalar | Flutter Web PWA como experiencia principal; el mismo código podrá compilar Android/iOS, sin publicar tiendas en el MVP | Satisface el QR inmediato y conserva Flutter obligatorio |
| Identidad del cliente | Firebase Anonymous Auth al abrir una sesión válida de mesa | Permite reglas por UID sin alta ni fricción |
| Seguridad del QR | URL con `establishmentSlug`, `tableId` y token aleatorio de 128 bits; una callable function canjea el token por una sesión limitada | El ID visible por sí solo no concede acceso y el token puede rotarse |
| Unidad de consumo | `tableSessions` agrupa pedidos, asistencia y pagos durante una ocupación de mesa | Evita mezclar clientes sucesivos y permite cerrar la cuenta |
| Panel | React + TypeScript + Vite | Ecosistema web directo para tablas, formularios y panel en tiempo real |
| Landing | Astro estático | Excelente rendimiento/SEO y muy poco JavaScript |
| Backend | Cloud Functions 2nd gen en TypeScript | Protege pagos, webhooks, transiciones y operaciones privilegiadas |
| Región | `southamerica-east1` cuando el servicio concreto lo admita; Firestore en `southamerica-east1` | Menor latencia regional para Argentina y residencia consistente |
| Imágenes | Firebase Storage con rutas por establecimiento | Binarios fuera de Firestore y reglas por tenant |
| WhatsApp | Aviso opt-in al dueño/encargado ante solicitud de asistencia pendiente | Uso concreto, pequeño y demostrable; el producto no depende del canal |
| Pago | Checkout Pro sandbox, preferencia creada por backend y webhook autoritativo | Menor complejidad y ningún secreto en el cliente |
| Roles | `owner`, `manager`, `staff`, `kitchen`; el cliente es una identidad anónima ligada a sesión | Separa administración, salón, cocina y consumidor |
| Borrado | Desactivación/archivado para entidades con historial | Conserva integridad contable y trazabilidad |
| Moneda e impuestos | Un establecimiento usa una moneda (`ARS` por defecto); precios enteros en centavos y total capturado al pedir | Evita errores de coma flotante y cambios retroactivos |

## Fuera del MVP inicial

- Publicación en App Store/Play Store.
- Facturación fiscal, división compleja de cuenta y propinas avanzadas.
- Inventario por ingredientes, reservas y delivery.
- Suscripciones SaaS cobradas automáticamente.
- Automatizaciones masivas de marketing por WhatsApp.

Estas exclusiones no impiden una arquitectura extensible hacia esas funciones.

