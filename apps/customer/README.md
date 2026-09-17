# Cliente MesaFlow

Aplicación Flutter Web/PWA que se abre desde el QR de la mesa. Este primer shell
visual permite recorrer el menú demo, buscar, filtrar, abrir un producto y armar
un pedido local. Todavía no escribe en Firebase.

Las fotografías están empaquetadas en `assets/images`: la aplicación puede verse
sin Cloud Storage, tarjeta de crédito ni conexión a un CDN.

## Ejecutar

Desde esta carpeta, en PowerShell:

```powershell
flutter.bat pub get
flutter.bat build web
cd ../..
npm.cmd run preview:customer
```

Abrí `http://127.0.0.1:7357` y detené el servidor con Ctrl+C.

Para comprobar el código y generar el build web:

```powershell
flutter.bat analyze
flutter.bat test
flutter.bat build web
```

Los datos actuales son demostrativos. Las etapas de contratos, seed y menú
reemplazarán este catálogo local por Firestore sin cambiar el diseño base.
