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
seguridad depende de Authentication, App Check cuando se incorpore, Firestore y
Storage Rules, y validaciones de backend. Las credenciales administrativas y los
tokens de proveedores nunca son configuración frontend.

## Versiones soportadas

Durante el MVP solo se mantiene la rama `main`. Los reportes deben reproducirse
contra el commit más reciente de esa rama.

