# Etapa 35 — Categorías y productos

Estado: **completa localmente**. El panel incorpora `/catalogo` para administrar
la carta del establecimiento activo y el cliente recibe los cambios publicados
mediante sus consultas realtime existentes.

## Gestión del catálogo

Propietario y encargado pueden:

- crear, editar, publicar, despublicar y eliminar categorías vacías;
- ordenar categorías y productos con movimientos seguros entre vecinos;
- crear, editar y eliminar productos;
- definir nombre, descripción, categoría, precio, publicación y disponibilidad;
- seleccionar una de cuatro imágenes empaquetadas en el repositorio;
- buscar productos y filtrar la vista por categoría.

Los precios se escriben como enteros en la unidad mínima de la moneda. Los
formularios respetan los mismos límites que los contratos y las reglas. Cada
escritura conserva `createdAt` y usa `updatedAt` como control de concurrencia;
si otro dispositivo cambió el registro, el panel pide revisar la versión nueva.

## Imágenes sin facturación

La Etapa 7 definió que el MVP no depende de Firebase Storage. El panel reutiliza
`apps/customer/assets/images/mesa-demo.png` y ofrece cuatro recortes identificados
por `imagePath`:

- `menu.burger-casa`;
- `menu.ravioles-espinaca`;
- `menu.bowl-estacion`;
- `menu.torta-chocolate`.

Vite incluye el mismo archivo en el build del panel y Flutter ya conoce esos
identificadores. No se solicita tarjeta, bucket ni carga dinámica. Storage queda
como extensión futura y opcional.

## Roles y seguridad

Owner y manager, con `menu.manage`, realizan el CRUD completo. Staff puede abrir
la carta y cambiar únicamente `available`, para marcar un producto disponible o
agotado durante el servicio. Kitchen conserva el acceso mínimo de su operación.

La interfaz aplica esta matriz para no ofrecer acciones indebidas, pero Firestore
Rules es la autoridad final: staff solo puede modificar `available` y `updatedAt`;
no puede cambiar nombre, precio, categoría, publicación ni borrar documentos.
Todas las rutas permanecen bajo `establishments/{establishmentId}`.

Un producto aparece en el cliente únicamente cuando la categoría está activa y
el producto está activo y disponible. Al marcarlo agotado, deja de formar parte
de la consulta pública; al restaurarlo, reaparece sin reconstruir la aplicación.

## Evidencia

- 42 pruebas del panel aprobadas, incluidas validación estricta, permisos,
  ordenamiento e inventario de imágenes.
- Lint TypeScript y build Vite de emulador aprobados.
- Smoke integrado con reglas reales: owner crea y elimina; staff cambia solo
  disponibilidad y su cambio de nombre es rechazado; el cliente anónimo ve el
  producto publicado y deja de verlo al agotarse.
- El build empaqueta localmente la imagen compartida y no depende de Storage.

## Cómo probarlo

En una PowerShell desde la raíz:

```powershell
npm.cmd run emulators
```

En otra, cargar el dataset si todavía no está disponible:

```powershell
npm.cmd run firebase:seed:demo
```

Abrir `http://127.0.0.1:5105/catalogo` e ingresar como propietario o encargado
con `MesaFlowDemo31!`. Abrir también el cliente en
`http://127.0.0.1:5100/e/mesa-flow-demo/table/mesa-01`; una mesa requiere una
sesión válida para llegar al menú. Staff puede probar el interruptor
**Disponible/Agotado**, pero no verá acciones de edición.

## Siguiente etapa

La Etapa 36 incorporará la administración segura de usuarios, activación y roles,
sin permitir que un manager otorgue owner ni acceda a otro establecimiento.
