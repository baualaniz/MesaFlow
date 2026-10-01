# Etapa 19 — rutas QR y guardas de contexto

## Resultado

La aplicación cliente ya interpreta enlaces directos de mesa, conserva la ruta
en la barra del navegador y muestra una recuperación segura ante URLs inválidas.
La ruta canónica es:

```text
/e/:slug/table/:tableId
```

El ejemplo local, alineado con el seed del emulador, es:

```text
/e/mesa-flow-demo/table/mesa-01
```

## Comportamiento por ambiente

- `emulator`: abrir `/` redirige a la mesa demo para facilitar el desarrollo.
- `dev` y `prod`: abrir `/` solicita escanear el QR; no inventa una mesa.
- Una URL desconocida o con parámetros inválidos muestra “Este enlace no es
  válido” y no monta el menú.
- La etiqueta de la cabecera se deriva de la URL: `mesa-12` se ve como “Mesa 12”.

El router usa estrategia de rutas limpias, sin `#`. Firebase Hosting ya tenía el
fallback SPA hacia `index.html`, por lo que una recarga directa conserva el path.

## Guarda de contexto

`CustomerSessionRouteGuard` exige `slug` y `tableId` antes de construir la
pantalla de mesa. Ambos segmentos deben:

- usar minúsculas ASCII, números y guiones internos;
- comenzar y terminar con letra o número;
- tener como máximo 64 caracteres;
- estar presentes como segmentos separados de la ruta.

Esta validación evita montar pantallas con un contexto ausente o mal formado,
pero no confunde una URL válida con una autorización. El slug y el ID de mesa no
son secretos. La Etapa 20 agregará token QR, Anonymous Auth, canje backend,
antirreplay y sesión local segura antes de permitir operaciones privadas.

## Probar en Chrome

Con los emuladores abiertos:

```powershell
npm.cmd run emulators
```

abrir directamente:

```text
http://127.0.0.1:5100/e/mesa-flow-demo/table/mesa-01
```

Actualizar la pestaña debe mantener exactamente esa URL y volver a mostrar el
menú de Mesa 1. Para comprobar la recuperación:

```text
http://127.0.0.1:5100/e/URL-INVALIDA/table/mesa-01
```

También puede usarse la vista previa del bundle en el puerto `7357` después de
`npm.cmd run hosting:build` y `npm.cmd run preview:customer`.

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
- 26 pruebas Flutter aprobadas;
- pruebas de generación, validación y etiqueta de rutas;
- pruebas de entrada directa, raíz cloud, raíz local y recuperación inválida;
- fallback de Hosting comprobado sobre la ruta canónica.

## Criterios de aceptación

- [x] `/e/:slug/table/:tableId` abre el menú con la mesa correcta.
- [x] La URL profunda permanece en la barra del navegador.
- [x] La recarga directa se sirve mediante el fallback SPA de Hosting.
- [x] La raíz cloud no asigna una mesa ficticia.
- [x] Segmentos inválidos y rutas desconocidas no montan el menú.
- [x] La guarda no se presenta como autorización real de sesión.
- [x] Las pruebas previas de menú, diseño y Firebase siguen pasando.

## Próximo paso

La Etapa 20 implementará el canje seguro del token QR y la identidad anónima.

## Fuentes oficiales

- [Navegación y routing de Flutter](https://docs.flutter.dev/ui/navigation).
- [Estrategias de URL para Flutter Web](https://docs.flutter.dev/ui/navigation/url-strategies).
- [`go_router` publicado por flutter.dev](https://pub.dev/packages/go_router).
