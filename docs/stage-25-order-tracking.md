# Etapa 25 — seguimiento de pedidos en tiempo real

## Resultado

El cliente ya puede abrir **Tus pedidos** y ver todos los pedidos de su sesión,
incluso después de recargar la aplicación. La vista se actualiza automáticamente
cuando Firestore cambia el estado y no necesita volver a consultar manualmente.

```text
Sesión QR validada
  → establishments/{establishmentId}/orders
  → filtro sessionId == sesión activa
  → orden por createdAt
  → snapshots en tiempo real
  → validación estricta de cada OrderContract
  → lista, detalle y timeline en Flutter
```

## Aislamiento y validación

La consulta recibe establecimiento y sesión desde el canje o restauración QR; no
confía en valores libres introducidos en la interfaz. Firestore Rules permite a
un participante leer únicamente recursos asociados a su sesión, y la consulta
incluye el filtro requerido por esas reglas.

Cada documento vuelve a validar:

- ID, establecimiento y sesión esperados;
- campos exactos del contrato;
- estado admitido y timestamps del historial;
- líneas, cantidades, importes, moneda y totales;
- fechas nativas de Firestore convertidas a UTC con milisegundos exactos.

El índice `orders: sessionId, createdAt` ya estaba versionado y fue verificado en
desarrollo durante la Etapa 13. Esta etapa no agrega índices ni cambia reglas.

## Experiencia del cliente

El botón con icono de recibo en el encabezado abre una hoja con:

- cantidad de pedidos de la sesión;
- referencia corta, hora, total y estado actual;
- snapshot de productos, cantidades, notas e importes;
- timeline de recibido, confirmado, en preparación, listo, entregado y completado;
- representación específica para pedidos cancelados;
- estados de carga, lista vacía, interrupción y reintento.

Después de enviar un pedido, la confirmación permite volver al menú o abrir el
seguimiento. Si la aplicación se recarga, la suscripción se reconstruye desde el
contexto restaurado y Firestore entrega nuevamente los pedidos. No se guardan
pedidos ni credenciales adicionales en el navegador.

Si la conexión se interrumpe después de haber recibido información, la pantalla
conserva el último snapshot y avisa que puede estar desactualizado. Una respuesta
tardía de una suscripción anterior se descarta al cambiar de sesión o reintentar.

## Alcance actual

El cliente es de solo lectura para estados. En los datos demo se pueden observar
distintos puntos del timeline, pero las transiciones reales desde el panel y su
máquina de estados se implementarán en la Etapa 33. No se desplegaron reglas,
Functions ni Hosting en la nube y esta etapa no requiere facturación.

## Verificación

```powershell
cd apps/customer
flutter.bat analyze
flutter.bat test
flutter.bat build web --release --dart-define=MESAFLOW_ENV=emulator
cd ../..
npm.cmd run check
```

Resultados de cierre:

- análisis Flutter sin observaciones;
- 63 pruebas Flutter aprobadas;
- prueba de actualización en tiempo real sin recargar;
- recuperación comprobada al reconstruir la aplicación;
- errores y reintento comprobados;
- conversión y rechazo de documentos inválidos comprobados;
- diseño verificado desde 320 px de ancho;
- build Web de emulador generado correctamente;
- suite raíz sin errores ni secretos detectados.

## Criterios de aceptación

- [x] La consulta queda anclada a establecimiento y sesión validados.
- [x] Los cambios de estado aparecen sin recargar.
- [x] La recarga recupera los pedidos desde Firestore.
- [x] El cliente muestra snapshot, total, estado y timeline.
- [x] Los documentos se validan antes de mostrarse.
- [x] Una reconexión no mezcla respuestas de otra suscripción.
- [x] La interfaz cubre carga, vacío, error, datos previos y reintento.
- [x] La vista no desborda en una pantalla de 320 px.

## Próximo paso

La Etapa 26 agregará solicitudes de asistencia del comensal, con creación,
cancelación, estados operativos y límites contra abuso.
