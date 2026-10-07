# Etapa 40 — Alertas de asistencia por WhatsApp

Estado: **completa localmente**. Una solicitud de asistencia pendiente puede
generar una alerta opt-in por WhatsApp sin convertir ese proveedor externo en un
requisito para atender al cliente.

## Flujo implementado

La Function `sendWhatsAppAssistance` observa las solicitudes de asistencia del
establecimiento. Solo procesa una versión nueva cuyo estado sea `pending` y
construye una identidad determinista para tolerar reintentos de Firestore.

Antes de enviar, una transacción verifica:

- que WhatsApp esté habilitado en `settings/private`;
- que propietario o encargado hayan confirmado el consentimiento del
  destinatario y guardado un número internacional de 8 a 15 dígitos;
- que la mesa siga perteneciendo al mismo establecimiento;
- que el evento no se haya procesado previamente;
- que hayan pasado 60 segundos desde el último intento del establecimiento.

El emulador usa un proveedor falso determinista y no accede a Internet. En cloud,
el proveedor preparado envía una plantilla mediante WhatsApp Cloud API. La
plantilla recibe exactamente dos variables: nombre de mesa y tipo de solicitud.
La versión de Graph API, el identificador del remitente, el nombre de plantilla y
el idioma son parámetros; el Access Token queda vinculado como secreto.

## Privacidad, seguridad y tolerancia a fallos

El teléfono del destinatario vive únicamente en el documento privado del tenant,
legible por owner/manager. Cada log de auditoría conserva solo su hash SHA-256,
el resultado y el identificador devuelto por el proveedor; nunca registra el
teléfono en claro ni el token. `notificationStates` es una colección exclusiva
del backend y Firestore Rules niega todo acceso directo desde los clientes.

Un rechazo, timeout o configuración inválida del proveedor queda registrado como
`failed`, pero no cambia ni elimina la solicitud de asistencia. El panel puede
seguir atendiéndola con normalidad. Los estados posibles permiten distinguir
envío real, mock local, duplicado, integración deshabilitada, configuración
incompleta y límite de frecuencia.

## Panel administrativo

En `/configuracion`, propietario y encargado pueden ingresar el destinatario con
código de país, confirmar expresamente que aceptó recibir estos avisos y recién
entonces habilitar la integración. Las reglas repiten esa condición, por lo que
no alcanza con alterar el formulario desde el navegador.

## Activación real posterior

El MVP local ya funciona y **no requiere tarjeta, cuenta Meta ni acción manual**.
Para enviar mensajes reales durante el despliegue de la Etapa 47 habrá que:

1. crear o seleccionar una app de Meta con el producto WhatsApp;
2. obtener el ID del número remitente y un token apropiado;
3. crear y aprobar una plantilla con dos variables de cuerpo, en este orden:
   mesa y tipo de solicitud;
4. elegir una versión de Graph API compatible y configurar nombre/idioma de la
   plantilla;
5. guardar el token en Secret Manager, nunca en Git ni en las aplicaciones;
6. cargar en el panel el número destinatario que dio consentimiento y habilitar
   la opción;
7. probar primero con un número autorizado y revisar el log de auditoría.

La configuración real puede implicar condiciones, límites o cargos definidos por
Meta. No se activó facturación ni se realizó ningún despliegue en esta etapa.

## Evidencia

- 61 pruebas del panel aprobadas;
- 59 pruebas de Functions aprobadas;
- suite completa de emuladores aprobada;
- mock exitoso sin red ni credenciales;
- segundo aviso dentro de 60 segundos limitado;
- integración deshabilitada omitida de forma explícita;
- solicitud original conservada en estado `pending`;
- teléfono ausente del log en claro;
- reglas, lint y builds aprobados.
