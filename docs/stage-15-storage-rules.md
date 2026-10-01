# Etapa 15 — Reglas Storage opcionales

## Objetivo

Mantener preparada una carga dinámica de imágenes segura por tenant sin convertir
Cloud Storage en requisito del MVP ni activar facturación. La estrategia activa
sigue siendo el catálogo de imágenes empaquetadas definido en la Etapa 7.

## Estado

La etapa está completa localmente. `storage.rules` y la política canónica cubren
creación, reemplazo y eliminación, y se verifican con Firebase Emulator Suite.
No se creó un bucket, no se desplegaron reglas y no se modificó ningún proyecto
cloud.

## Contrato de rutas

| Ruta | Lectura | Escritura/eliminación |
|---|---|---|
| `establishments/{eid}/products/{productId}/{fileName}` | Pública | Owner o manager activo del mismo tenant |
| `establishments/{eid}/branding/{fileName}` | Pública | Owner o manager activo del mismo tenant |
| Cualquier otra ruta | Denegada | Denegada |

La lectura pública es deliberada: son recursos visuales del menú y de marca, no
documentos privados. Conocer una URL no concede permisos de escritura.

## Validaciones de cada carga

- Identidad autenticada con membresía activa y rol `owner` o `manager`.
- Tenant de la ruta igual al de la membresía.
- Tamaño entre 1 byte y 5 MiB.
- Nombre seguro, en minúsculas para la extensión y de hasta 128 caracteres.
- JPEG únicamente con `.jpg` o `.jpeg`, PNG con `.png` y WebP con `.webp`.
- `productId` seguro de hasta 128 caracteres en rutas de producto.
- Metadata personalizada exacta: `establishmentId` y `uploadedByUid`, sin campos
  adicionales.
- Tenant y UID de la metadata iguales a la ruta y al usuario autenticado.

Las actualizaciones se evalúan con las mismas reglas que una primera carga. La
eliminación también requiere la membresía administrativa válida.

## Evidencia automatizada

Las ocho pruebas estáticas aseguran que la política versionada no pueda ampliarse
accidentalmente. Las nueve pruebas de emulador comprueban:

1. Carga, lectura pública y eliminación por owner.
2. Administración de branding por manager.
3. Denegación a staff, kitchen, miembros inactivos, desconocidos y anónimos.
4. Denegación de escritura cruzada entre tenants.
5. Rechazo de tipo, metadata, tamaño vacío o superior a 5 MiB.
6. Rechazo de nombres y rutas no previstas.
7. Coincidencia obligatoria entre MIME y extensión.
8. Metadata exacta y `productId` seguro.
9. Reemplazo válido por manager y denegación de reemplazo/eliminación inválidos.

Para repetir toda la verificación:

```powershell
npm.cmd run check
npm.cmd run test:emulators
```

Ambos comandos usan exclusivamente archivos locales y el proyecto fijo
`demo-mesaflow`. Los mensajes `PERMISSION_DENIED` de los casos negativos son el
resultado esperado.

## Criterio de aceptación

- [x] Lecturas limitadas a los recursos públicos previstos.
- [x] Escrituras y eliminaciones limitadas a owner/manager activo del tenant.
- [x] Cargas cruzadas denegadas.
- [x] MIME, extensión, tamaño, nombre e identificador validados.
- [x] Metadata exacta vinculada al tenant y al UID.
- [x] Creación y reemplazo sujetos al mismo contrato.
- [x] Ocho pruebas estáticas y nueve pruebas de emulador aprobadas.
- [x] Sin bucket, despliegue, facturación ni tarjeta.

## Próximo paso

La Etapa 16 prepara un seed demo seguro, repetible e idempotente para roles,
mesas, catálogo, pedidos y pagos. La carga dinámica de archivos seguirá opcional.

## Commit sugerido

`feat(storage): harden optional tenant asset rules`
