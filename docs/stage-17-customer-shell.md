# Adelanto de Etapa 17 — shell visual del cliente

## Motivo

Se adelantó únicamente el shell visual para que MesaFlow pueda evaluarse antes de
tomar decisiones de facturación. Las etapas 8–16 siguen siendo necesarias para el
backend, secretos, contratos, reglas finales y datos de demostración.

## Implementado

- Proyecto Flutter Web/PWA real en `apps/customer`.
- Paleta MesaFlow y base responsive para celular, tablet y escritorio.
- Menú demostrativo con búsqueda y filtros por categoría.
- Detalle de producto y carrito local con total en centavos.
- Fotografía original empaquetada, sin red, bucket ni tarjeta.
- Dos pruebas de widgets para render, carrito y búsqueda.
- Metadata PWA y título de navegador de MesaFlow.

No se presenta este adelanto como el flujo final: el botón de confirmación todavía
no crea pedidos y el catálogo aún no proviene de Firestore. Esas conexiones se
implementarán en las etapas previstas del plan.

## Ejecutar

```powershell
cd apps/customer
flutter.bat pub get
flutter.bat build web
cd ../..
npm.cmd run preview:customer
```

La URL es `http://127.0.0.1:7357`; Ctrl+C detiene la vista previa.

## Verificar

```powershell
flutter.bat analyze
flutter.bat test
flutter.bat build web
```

## Criterio de este adelanto

- [x] La aplicación web abre sin Firebase Storage.
- [x] La imagen forma parte del bundle.
- [x] Buscar, filtrar, abrir productos y sumar al pedido funcionan localmente.
- [ ] Firebase dev/prod y rutas QR se incorporan al completar la Etapa 17.
