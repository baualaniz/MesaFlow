# Modelo de amenazas de MesaFlow

Versión: 1.0 — 9 de octubre de 2026.

## Alcance y supuestos

Este modelo cubre el cliente Flutter Web, el panel React, la landing Astro,
Firebase Authentication, Firestore, Storage, Cloud Functions y los proveedores
Mercado Pago y WhatsApp. El repositorio es público y la configuración Web de
Firebase se considera pública. Las cuentas de servicio, tokens de proveedor y
secretos de webhook nunca se consideran controles de frontend.

El entorno desplegado todavía no existe: las conclusiones actuales están
verificadas sobre Emulator Suite. Registrar App Check, configurar sus claves
públicas y comprobar métricas antes de desplegar es una puerta obligatoria de la
Etapa 47.

## Activos y actores

Activos principales:

- separación de datos y permisos entre establecimientos;
- identidad y roles del personal;
- token QR, participación y vigencia de una sesión de mesa;
- pedido, importe, estado operativo y saldo;
- credenciales, firmas y confirmaciones de proveedores;
- datos de contacto privados y logs operativos.

Actores contemplados: visitante anónimo, comensal legítimo, personal de cada rol,
propietario/encargado, proveedor externo, atacante remoto sin cuenta, miembro
malicioso y operador con acceso al repositorio o al entorno local.

## Límites de confianza

1. **Navegador → Firebase:** todo campo del cliente es no confiable. Auth identifica
   al usuario; Rules y Functions vuelven a resolver tenant, sesión, rol y precios.
2. **QR → sesión:** el token solo acredita el canje inicial. Se almacena su hash,
   se elimina de la URL y luego se usa UID + participant activo.
3. **Panel → operación:** ocultar un botón no autoriza. Cada transición se valida
   nuevamente en el backend y queda auditada.
4. **Functions → proveedor:** tokens únicamente desde Secret Manager. Las URLs,
   importes y estados recibidos se validan contra contratos y dominios previstos.
5. **Proveedor → webhook:** Internet no es confiable. Se exige POST, firma oficial,
   coincidencia de identificadores y consulta autoritativa al proveedor.
6. **Repositorio → ejecución:** el código es público; secretos locales, exports y
   credenciales permanecen ignorados y se auditan antes del commit.

## Amenazas y controles

| Amenaza | Impacto | Controles comprobados | Riesgo residual / condición |
|---|---|---|---|
| Suplantar personal o comensal | Acceso o acciones indebidas | Email/Password o Auth anónima, membresía/participant activo, App Check cloud | Registrar proveedores App Check antes del deploy |
| Cruzar de tenant | Fuga o modificación de datos | Rutas ancladas, IDs internos revalidados, Rules, 18 casos Firestore y 9 Storage | Repetir pruebas al agregar una colección |
| Manipular precio/total/rol/estado | Fraude o corrupción | Contratos exactos, precios y permisos releídos en transacciones servidor | Ninguno conocido en el alcance actual |
| Repetir pedido/pago/webhook | Duplicados y saldo incorrecto | IDs deterministas, transacciones, eventos idempotentes y auditoría | Monitorizar reintentos anómalos en cloud |
| Fuerza bruta o spam | Costo/indisponibilidad | QR de 128 bits en producción, antirreplay, cooldown, límites por canal, App Check, `maxInstances` | Cuotas por tenant y alertas antes de uso comercial |
| Falsificar webhook | Acreditar un pago inexistente | Firma, método POST, IDs concordantes y consulta directa a Mercado Pago | Rotación y monitoreo del secreto en operación |
| XSS o navegación inyectada | Robo de sesión/acciones | Render seguro React/Flutter, redirects internos, URLs externas validadas, JSON-LD escapado y CSP | Landing permite script inline por build Astro; solo usa contenido controlado y JSON-LD neutralizado |
| CORS/clickjacking | Invocación o embebido no deseado | HTTP público con CORS desactivado, `frame-ancestors 'none'`, `X-Frame-Options: DENY`; callables requieren Auth/RBAC/App Check | CORS no reemplaza autenticación |
| Exponer secretos en logs | Compromiso de proveedores | Logs internos reducidos a `errorName`; teléfono hasheado; sin payload/token/stack | Revisar nuevos logs con el control estático |
| Dependencia vulnerable | Ejecución o DoS | Lockfile, auditoría producción en cero y allowlist exacta para tooling | `braces` mantiene un aviso alto sin parche dentro de Firebase CLI local |

## Decisiones de riesgo

### App Check

Todas las callables lo exigen cuando `FUNCTIONS_EMULATOR` no vale exactamente
`true`. El bypass existe solo para la Emulator Suite local. El despliegue queda
bloqueado hasta registrar ambas aplicaciones Web y entregar una clave pública de
reCAPTCHA al cliente y al panel.

### Aviso `braces`

`GHSA-vfj7-8cjw-p6xm` llega exclusivamente por
`firebase-tools → chokidar → braces`. La versión más reciente de Firebase CLI
consultada (15.33.0) todavía usa la rama afectada y npm no ofrece una reparación
compatible; `audit fix --force` propone una CLI obsoleta. MesaFlow no entrega esa
cadena en producción ni acepta patrones glob remotos: solo observa archivos
locales controlados por el desarrollador. El riesgo se acepta temporalmente y un
script falla si aparece otro aviso o cambia la cadena.

### CSP de la landing

Cliente y panel no permiten JavaScript inline. La landing estática conserva
`'unsafe-inline'` porque Astro empaqueta su pequeño controlador de navegación y
los datos estructurados dentro del HTML. No procesa contenido de usuarios; el
único `set:html` serializa un objeto controlado y escapa `<` como `\u003c`. Esta
excepción deberá retirarse si la landing incorpora contenido administrable.

Flutter se compila con `--csp --no-web-resources-cdn`: desactiva generación
dinámica de código y sirve CanvasKit desde el mismo Hosting. Roboto se empaqueta
como fallback y los únicos scripts inline aceptados corresponden a hashes
SHA-256 exactos de los inicializadores Flutter/FlutterFire. El cliente permite además únicamente
`https://www.gstatic.com` para los módulos Firebase versionados que FlutterFire
carga en Web; no existe un comodín de orígenes de scripts.

## Reglas para cambios futuros

- una colección nueva nace cerrada y agrega pruebas positivas, negativas y entre
  tenants;
- una callable nueva usa `CALLABLE_SECURITY_OPTIONS`, valida Auth y no registra
  errores crudos;
- una URL de retorno o proveedor se compara contra una allowlist, nunca por
  substring;
- ningún campo de autorización, precio o confirmación de pago se confía al
  navegador;
- un aviso nuevo de dependencias bloquea la auditoría hasta corregirse o quedar
  documentado con alcance y vencimiento de revisión.
