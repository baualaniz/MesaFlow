# Seguridad de MesaFlow

Este resumen operativo complementa `SECURITY.md` y el análisis detallado de
`docs/threat-model.md`.

## Límites de confianza

- Flutter, React y Astro son clientes no confiables.
- Firestore Rules controla cada acceso directo a datos.
- Cloud Functions concentra precios, pedidos, transiciones, QR, permisos,
  métricas, pagos, webhooks y alertas externas.
- Mercado Pago y WhatsApp son sistemas externos; sus respuestas se validan y sus
  fallos no otorgan permisos ni confirman pagos.

## Controles implementados

- Firebase Authentication Email/Password para personal y Anonymous Auth para la
  mesa.
- Membresía activa, rol y tenant comprobados en reglas y backend.
- QR con token aleatorio, hash, versión, canje único, rotación y antirreplay.
- Precios y totales recalculados desde Firestore.
- Máquina de estados e idempotencia para pedidos, asistencia y pagos.
- Webhook con firma validada y consulta autoritativa al proveedor.
- Secretos solo en backend; ejemplos y placeholders no operativos en Git.
- App Check obligatorio para callables cloud; enforcement gradual aún apagado.
- CSP por sitio, rechazo de CORS global y ausencia de HTML/JavaScript inyectable.
- Logs sin tokens, contraseñas, teléfonos completos ni errores internos.
- Reglas Firestore/Storage con denegación final por defecto.
- Dependencias, sinks frontend y configuración CI auditados automáticamente.

## Matriz resumida

| Actor | Alcance |
|---|---|
| Cliente de mesa | Catálogo y datos de su sesión vigente |
| Salón | Pedidos y asistencia operativa permitida |
| Cocina | Estados de preparación, sin ventas ni usuarios |
| Encargado | Operación, catálogo, configuración y métricas acotadas |
| Propietario | Administración completa de su establecimiento |
| Backend | Operaciones privilegiadas y conciliación externa |

Ningún rol puede cruzar el límite de otro establecimiento.

## Verificación

```powershell
npm.cmd run test:security
npm.cmd run security:audit
npm.cmd run test:e2e
```

La prueba E2E incluye reglas negativas: aislamiento entre tenants, rol
insuficiente, transiciones inválidas y prohibición de acreditar pagos desde el
cliente.

## Riesgos aceptados para el MVP

- Functions no está desplegado para evitar activar Blaze; el flujo integral se
  demuestra en emuladores.
- App Check productivo está registrado pero sin enforcement hasta disponer del
  backend cloud y observabilidad suficiente.
- Storage dinámico es opcional; las imágenes del MVP están empaquetadas.
- Las credenciales sandbox externas permanecen locales e ignoradas por Git.

No se deben cargar datos reales ni secretos productivos hasta resolver esos
puntos y revisar costos, retención y respuesta a incidentes.

## Reporte de vulnerabilidades

Seguir `SECURITY.md`. No abrir issues públicos con tokens, datos personales o
detalles explotables; revocar primero cualquier credencial comprometida.

