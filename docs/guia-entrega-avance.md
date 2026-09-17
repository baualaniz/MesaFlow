# Guía de entrega del avance

## Elemento 1 — código fuente

Entregar este enlace:

<https://github.com/baualaniz/MesaFlow>

Antes de enviarlo, comprobar que GitHub muestre **Public**, la rama `main` y el
commit más reciente. No entregar `node_modules`, builds generados, archivos `.env`,
credenciales ni cuentas de servicio.

## Elemento 2 — capturas de Firebase

Usar únicamente el proyecto **`mesaflow-desarrollo`**. No cargar ejemplos ni
abrir documentos en `mesaflow-produccion`.

Tomar estas cuatro capturas:

1. **Base y colecciones raíz:** Firebase Console → `mesaflow-desarrollo` →
   **Firestore Database** → **Data/Datos**. Deben quedar visibles el nombre del
   proyecto, la base `(default)` y las colecciones `users`,
   `establishmentSlugs` y `establishments`.
2. **Tenant y subcolecciones:** abrir `establishments` y seleccionar el documento
   `mesa-flow-demo`. Deben verse `name: Bistró MesaFlow`, `currency: ARS`,
   `active: true` y la lista de subcolecciones: `assistanceRequests`, `auditLogs`,
   `categories`, `dailyMetrics`, `members`, `orders`, `payments`, `products`,
   `settings`, `tableSessions` y `tables`.
3. **Datos del menú:** desde el mismo documento abrir `products`. Deben verse los
   documentos `burger-casa`, `ravioles-espinaca`, `bowl-estacion` y
   `torta-chocolate`. Seleccionar `burger-casa` para mostrar nombre, precio,
   categoría, disponibilidad y moneda.
4. **Flujo operativo:** volver a `mesa-flow-demo` y abrir `orders`. Seleccionar
   `pedido-presentacion`; deben verse `tableId: mesa-01`, `status: created`,
   `currency: ARS` y el array `items`. El campo `notes` aclara que es una
   demostración no enviada a cocina.

Si la consola ya estaba abierta antes de la carga, actualizar la pestaña del
navegador para que aparezcan las colecciones.

Buenas prácticas para las imágenes:

- mantener visible el selector con `mesaflow-desarrollo`;
- ocultar o recortar correos personales si la interfaz los muestra;
- no abrir credenciales, configuración web, tokens ni claves;
- usar nombres de archivo claros: `01-firestore-raiz.png`,
  `02-firestore-estructura.png`, `03-firestore-productos.png` y
  `04-firestore-pedido.png`;
- verificar que el texto sea legible antes de subirlas.

## Elemento 3 — informe breve

Entregar `docs/informe-avance-presentacion.md`, convirtiéndolo a PDF si la
plataforma lo exige. El documento distingue las funciones operativas actuales de
las integraciones planificadas.

## Comprobación final

- [ ] El repositorio abre sin iniciar sesión y figura como público.
- [ ] `main` contiene el último avance.
- [ ] Las capturas pertenecen a `mesaflow-desarrollo`.
- [ ] Se ven la base y las colecciones principales.
- [ ] Producción permanece sin datos de demostración.
- [ ] El informe distingue lo funcional de lo planificado.
- [ ] No se adjuntaron secretos ni datos personales.
