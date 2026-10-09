# Seguridad de MesaFlow

## Reportar una vulnerabilidad

No publiques vulnerabilidades, credenciales ni datos sensibles en un issue.
Utilizá **Security → Advisories → Report a vulnerability** en el repositorio para
enviar un reporte privado cuando esa opción esté habilitada.

Incluí una descripción, el componente afectado, pasos mínimos de reproducción y
el impacto estimado. No pruebes una vulnerabilidad contra establecimientos o datos
de terceros.

## Secretos

Este repositorio público solo admite configuración frontend identificadora y
placeholders explícitos. Nunca se versionan:

- tokens de Mercado Pago o WhatsApp;
- secretos o payloads privados de webhooks;
- archivos `.env` reales;
- claves `.pem`/`.key`;
- cuentas de servicio de Firebase/Google Cloud;
- exports de Firestore o datos personales;
- secretos de GitHub Actions.

Si un secreto se publica, eliminarlo del último commit no es suficiente: debe
revocarse o rotarse inmediatamente, revisar su uso y luego limpiar el historial si
corresponde.

## Configuración pública de Firebase

Los identificadores del SDK web de Firebase (`apiKey`, `projectId`, `appId`) no se
usan como mecanismo de autorización y pueden formar parte del build frontend. La
seguridad depende de Authentication, App Check en el entorno cloud, Firestore y
Storage Rules, y validaciones de backend. Las credenciales administrativas y los
tokens de proveedores nunca son configuración frontend.

## Clasificación y almacenamiento

| Clase | Ejemplos | Ubicación |
|---|---|---|
| Pública frontend | Firebase Web API key, project ID, URLs públicas | Build de la aplicación; placeholders en `.env.example` |
| Privada no secreta | ID de número de WhatsApp | Parámetro backend; ejemplo en `functions/.env.example` |
| Secreta | Access tokens y firmas de webhooks | Secret Manager; `.secret.local` solo para emulador |

Las funciones reciben secretos por lista explícita. Una función que no declara un
secreto no debe poder leerlo. `health`, por ejemplo, no tiene ninguno vinculado.
No usar `functions.config()`, archivos `.runtimeconfig.json` ni variables `.env`
comunes para credenciales.

Antes de cada commit ejecutar `npm.cmd run check`. El verificador revisa archivos
versionados y no ignorados, nombres peligrosos y formatos de tokens conocidos. No
imprime valores detectados.

## Controles de aplicación

- todas las callables exigen Firebase App Check fuera de Emulator Suite;
- Firestore y Storage niegan por defecto y validan tenant, identidad y rol;
- health y webhook no habilitan CORS; el webhook exige firma y consulta al
  proveedor antes de acreditar;
- los tres sitios publican CSP y bloquean framing;
- los errores internos registran solo el tipo validado, nunca mensaje, stack,
  token ni payload;
- pedidos, preferencias y webhooks son idempotentes y la asistencia limita spam.

El modelo completo, los límites de confianza y los riesgos aceptados están en
`docs/threat-model.md`. Antes de desplegar se deben registrar las aplicaciones en
Firebase App Check y configurar las claves públicas de reCAPTCHA.

La auditoría online se ejecuta con `npm.cmd run security:audit`. Producción debe
mantener cero avisos. El único riesgo dev aceptado actualmente es
`GHSA-vfj7-8cjw-p6xm`, limitado a la cadena local de Firebase CLI y vigilado por
una allowlist exacta; no se admite automáticamente ningún aviso nuevo.

## Versiones soportadas

Durante el MVP solo se mantiene la rama `main`. Los reportes deben reproducirse
contra el commit más reciente de esa rama.
