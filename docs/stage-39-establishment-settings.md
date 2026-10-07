# Etapa 39 — Configuración del establecimiento

Estado: **completa localmente**. Propietarios y encargados pueden administrar
desde el panel la marca, el contacto, los horarios y las opciones públicas y
privadas del establecimiento activo.

## Pantalla administrativa

La ruta `/configuracion` se incorpora al shell del panel únicamente para los
roles `owner` y `manager`. El formulario carga y guarda en conjunto:

- nombre de marca;
- correo, teléfono y dirección de contacto;
- apertura, cierre o día cerrado para los siete días de la semana;
- pedidos desde la mesa y solicitudes de asistencia;
- habilitación interna de Mercado Pago y WhatsApp.

La interfaz diferencia claramente qué datos son públicos y cuáles son internos,
incluye carga, error recuperable, confirmación y diseño responsive. El guardado
usa un batch de Firestore: los documentos `settings/public` y
`settings/private` cambian juntos o no cambia ninguno.

## Contrato y seguridad

El modelo TypeScript exige campos exactos, tenant coherente, timestamps nativos,
correo válido, textos acotados y horarios `HH:mm`. Puede leer el documento
público anterior para migrarlo al guardar, pero toda escritura nueva utiliza el
contrato completo.

Firestore Rules vuelve a validar el contrato independientemente de la interfaz:

- `settings/public` continúa legible por el cliente;
- `settings/private` solo es legible por owner/manager;
- solo owner/manager puede crear o actualizar ambos documentos;
- staff, kitchen, miembros inactivos y otros tenants no pueden escribir;
- campos adicionales, tenant modificado, horarios inválidos y borrado se niegan;
- `updatedAt` debe ser el tiempo del servidor.

No se guardan credenciales, tokens ni secretos en estos documentos. Los flags de
integración solo habilitan comportamiento; las credenciales continúan fuera del
frontend y del repositorio.

## Efecto en el cliente y backend

El canje o restauración QR usa `brandName` de la configuración pública como el
nombre visible del establecimiento. La creación transaccional de pedidos lee
`orderingEnabled` y rechaza pedidos nuevos con `ordering-disabled` cuando la
administración los pausa. El cliente muestra un mensaje específico y conserva
el carrito. `assistanceEnabled` ya era aplicado por el backend de asistencia.

Los horarios y datos de contacto quedan versionados y disponibles para ampliar
la presentación del cliente sin cambiar el modelo. `whatsappEnabled` queda listo
para la integración opt-in de la Etapa 40.

## Evidencia

- 60 pruebas del panel aprobadas;
- 54 pruebas de Functions aprobadas;
- 78 pruebas Flutter aprobadas;
- build React/Vite y build Flutter Web aprobados;
- suite completa de emuladores aprobada;
- owner y manager guardan configuración pública/privada;
- staff recibe `permission-denied` y un anónimo no puede leer datos privados;
- marca pública aplicada al acceso QR;
- pausa de pedidos respetada por el backend;
- reglas rechazan campos, tenant, horarios y borrados inválidos;
- el smoke restaura los documentos originales al finalizar.

No se necesita una acción manual ni activar facturación para esta etapa.
