# Etapa 18 — Sistema visual MesaFlow

## Resultado

La aplicación cliente dispone de un sistema visual reutilizable, accesible y
responsive. La interfaz conserva la identidad sage/ivory/charcoal, pero deja de
depender de estilos aislados y fuentes ausentes.

## Tipografía offline

- Poppins: títulos, nombres de producto y jerarquías principales.
- Inter: cuerpo, formularios, etiquetas, precios y controles.
- Poppins incluye pesos 400, 600 y 700.
- Inter usa el archivo variable oficial.
- Las fuentes y sus licencias OFL viven en `apps/customer/assets/fonts`.
- No se realizan peticiones a Google Fonts en tiempo de ejecución.

Los archivos provienen del repositorio oficial de Google Fonts. Poppins e Inter
figuran allí bajo licencia OFL.

## Tokens

`mesaflow_theme.dart` centraliza:

- paleta de marca y superficies semánticas;
- éxito, advertencia, información y error;
- escala de espaciado de 4 a 48 px;
- radios de 10, 18, 24 px y formato píldora;
- tipografía y alturas de línea;
- estados activos, enfocados, deshabilitados y de error.

## Componentes tematizados

La configuración global cubre tarjetas, campos, botones filled/outlined/text,
botones de icono, chips, snackbars, bottom sheets, divisores, tooltips e
indicadores de progreso. Esto evita que cada pantalla decida colores, medidas y
estados por separado.

Se agregaron dos componentes reutilizables:

- `MesaFlowStatusBadge`: neutral, éxito, advertencia, error e información, con
  texto e icono opcional.
- `MesaFlowFeedbackPanel`: vacío, información, éxito, advertencia o error, con
  título, descripción y acción opcional.

La búsqueda sin resultados ya usa el panel estándar y las etiquetas Favorito y
Veggie usan el badge estándar.

## Accesibilidad y responsive

- Áreas táctiles mínimas de 48 px.
- Estados comunicados mediante texto/icono además de color.
- Mensajes de error anunciables como región viva.
- Contraste semántico sobre superficies claras.
- Paneles flexibles que no desbordan en 320 px.
- Menú verificado a 390 px y 1280 px.

## Verificación

```powershell
cd apps/customer
flutter.bat analyze
flutter.bat test
cd ../..
npm.cmd run hosting:build
```

Resultados:

- análisis Flutter sin observaciones;
- 18 pruebas Flutter aprobadas;
- pruebas responsive en 320, 390 y 1280 px;
- build Web release con fuentes locales;
- inspección en navegador correcta y sin warnings/errores de consola.

## Criterios de aceptación

- [x] Poppins e Inter realmente empaquetadas y licenciadas.
- [x] Colores, espaciado y radios centralizados.
- [x] Campos y botones cubren foco, deshabilitado y error.
- [x] Tarjetas, chips, snackbars y bottom sheets tematizados.
- [x] Badges y paneles de feedback reutilizables.
- [x] Estado vacío migrado al componente común.
- [x] Pruebas móviles y de escritorio sin overflow.
- [x] Verificación visual real en navegador.

## Próximo paso

La Etapa 19 implementará rutas profundas QR y guards de sesión, preservando una
recarga directa en `/e/:slug/table/:id`.

## Commit sugerido

`feat(ui): complete customer design system`

## Fuentes oficiales

- [Inter en Google Fonts](https://github.com/google/fonts/tree/main/ofl/inter).
- [Poppins en Google Fonts](https://github.com/google/fonts/tree/main/ofl/poppins).
