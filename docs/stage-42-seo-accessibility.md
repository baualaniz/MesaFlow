# Etapa 42 — SEO, accesibilidad y rendimiento de la landing

Estado: **completa localmente**. La landing publica metadatos consistentes para
buscadores y redes, admite navegación por teclado y supera los umbrales de calidad
automatizados definidos para el MVP.

## SEO técnico y presentación social

El layout genera por página:

- título, descripción, autor, robots y URL canónica absoluta;
- Open Graph en español de Argentina;
- Twitter Card con imagen amplia;
- favicon SVG y manifiesto web;
- datos estructurados `WebSite` y `SoftwareApplication` en JSON-LD;
- `robots.txt` y `sitemap.xml` con URL absoluta.

La URL base se obtiene de `PUBLIC_LANDING_URL`. El valor local canónico es
`http://127.0.0.1:5106`; al desplegar se debe proporcionar la URL HTTPS definitiva
durante el build. La página 404 publica `noindex, nofollow` y queda fuera del
sitemap.

La imagen social actual reutiliza la fotografía gastronómica del demo. Es una
opción funcional para el MVP; una pieza de marca de 1200 × 630 y el dominio final
pueden reemplazarse en las Etapas 47–48 sin cambiar la estructura SEO.

## Accesibilidad

- idioma del documento `es-AR` y landmarks semánticos;
- un único encabezado principal y jerarquía de secciones;
- enlace visible al enfocar para saltar al contenido;
- foco de alto contraste en enlaces, botones y preguntas desplegables;
- menú móvil con nombre y estado accesibles;
- cierre del menú con `Escape`, devolución del foco y cierre al cambiar de tamaño;
- ilustraciones internas retiradas del árbol accesible cuando duplican el texto;
- respeto de la preferencia de movimiento reducido;
- colores secundarios reforzados hasta eliminar los fallos de contraste.

## Rendimiento

La fotografía principal se conserva visualmente pero se entrega como WebP de
1024 píxeles y aproximadamente 101 KiB, frente a los 3045 KiB del PNG fuente. La
landing carga una única variante de Poppins y usa la tipografía del sistema para
el cuerpo. El presupuesto automatizado rechaza una imagen WebP mayor a 120 KiB.

## Auditoría reproducible

```powershell
npm.cmd run landing:check
npm.cmd run landing:audit
```

`landing:check` construye cinco rutas/recursos y ejecuta nueve pruebas estáticas.
`landing:audit` inicia una vista previa y Chrome sin interfaz, ejecuta Lighthouse
y cierra ambos procesos. Los mínimos exigidos son 80 para rendimiento y 95 para
accesibilidad, buenas prácticas y SEO.

Resultado final observado en modo móvil simulado:

| Categoría | Resultado |
|---|---:|
| Rendimiento | 98 |
| Accesibilidad | 100 |
| Buenas prácticas | 100 |
| SEO | 100 |

La medición registró 0 ms de bloqueo total y 0 de cambio acumulado de layout. El
resultado puede variar levemente según el equipo, por eso el umbral de rendimiento
queda en 80 y no en el valor puntual observado.

No se realizó despliegue cloud ni se activó facturación.
