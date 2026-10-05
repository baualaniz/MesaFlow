# Etapa 26 — asistencia desde la mesa

## Resultado

El comensal ya puede abrir **Asistencia en tu mesa**, elegir el motivo del
llamado, ver su estado en tiempo real y cancelarlo mientras todavía está
pendiente. La operación queda asociada al establecimiento, la mesa, la sesión QR
y la identidad anónima ya validados.

```text
Sesión QR activa
  → createAssistanceRequest / cancelAssistanceRequest
  → validación de Auth, tenant, mesa, sesión, participante y flag público
  → transacción sobre assistanceRequests/{sessionId}
  → snapshot Firestore en tiempo real
  → contrato estricto y estado visible en Flutter
```

## Límite contra abuso

Cada sesión de mesa usa un único documento estable
`assistanceRequests/{sessionId}`. Mientras esté `pending` o `acknowledged`, una
nueva invocación devuelve la solicitud activa y no crea otra. Después de
`resolved` o `cancelled`, el backend exige 60 segundos antes de reemplazarla por
un nuevo llamado.

La restricción se aplica dentro de una transacción de Firestore. No depende de
que el botón esté deshabilitado ni de datos enviados por el navegador, por lo
que recargar, abrir otra pestaña o repetir la petición no genera spam ilimitado.

## Seguridad

Las dos callable Functions exigen Firebase Auth y vuelven a comprobar:

- establecimiento activo;
- mesa activa y enlazada a la sesión indicada;
- sesión `open` o `payment_pending`;
- participante activo cuyo UID coincide con la llamada;
- configuración pública con `assistanceEnabled: true`;
- campos exactos y enums canónicos.

Firestore Rules mantiene todas las escrituras directas denegadas. El cliente
solo observa el documento de su sesión; crear y cancelar siempre atraviesa el
backend. La cancelación se admite únicamente en `pending`: una solicitud ya
reconocida por el personal no puede desaparecer desde el cliente.

## Experiencia del cliente

El nuevo botón con campana aparece junto a **Tus pedidos** y muestra un indicador
cuando existe un llamado activo. La hoja ofrece:

- **Llamar al mozo**;
- **Pedir la cuenta**;
- **Otra consulta**;
- estados enviada, en camino, atendida y cancelada;
- cancelación segura mientras está pendiente;
- carga, reconexión y errores comprensibles;
- diseño verificado desde 320 px de ancho.

Los cambios a `acknowledged` y `resolved` ya se reflejan en tiempo real. La cola
del personal y las transiciones operativas se implementarán en la Etapa 37.

## Datos demo

El seed usa IDs de solicitud iguales al ID de sesión. La Mesa 1 conserva una
solicitud histórica resuelta para que el comensal pueda crear una nueva; la Mesa
2 muestra un pedido de cuenta reconocido. Al volver a cargar el seed desde cero
no se crean documentos paralelos para una misma sesión.

## Verificación

```powershell
npm.cmd run functions:check
cd apps/customer
flutter.bat analyze
flutter.bat test
flutter.bat build web --release --dart-define=MESAFLOW_ENV=emulator
cd ../..
npm.cmd run check
```

Resultados de cierre:

- 70 pruebas Flutter aprobadas;
- 19 pruebas de Functions aprobadas;
- contratos TypeScript y Dart sincronizados;
- creación, visualización y cancelación cubiertas por widgets;
- conversión de timestamps y rechazo de documentos cruzados cubiertos;
- backend compilado y sin observaciones de lint;
- smoke de emuladores cubre creación, deduplicación, cancelación y cooldown;
- acceso directo de escritura continúa denegado por reglas.

## Criterios de aceptación

- [x] Solo una sesión QR válida puede solicitar asistencia.
- [x] El backend no confía en tenant, mesa, participante ni estado del cliente.
- [x] Existe como máximo una solicitud activa por sesión.
- [x] Hay una espera de 60 segundos después de cerrar una solicitud.
- [x] El cliente ve los cambios sin recargar.
- [x] Una solicitud pendiente puede cancelarse.
- [x] Una solicitud ya reconocida no puede cancelarse desde el cliente.
- [x] Los tres tipos y los cuatro estados usan enums canónicos.
- [x] La interfaz no desborda a 320 px.

## Próximo paso

La Etapa 27 calculará el consumo de la sesión con pedidos válidos y pagos
aprobados, mostrará el saldo y conectará el pedido de cuenta con ese resumen.
