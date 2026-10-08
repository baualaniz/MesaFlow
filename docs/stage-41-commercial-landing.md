# Etapa 41 — Landing comercial responsive

Estado: **completa localmente**. MesaFlow cuenta con un sitio comercial propio,
estático y responsive que presenta el producto sin depender de servicios pagos ni
recursos visuales remotos.

## Experiencia implementada

La portada conduce al visitante desde el problema hasta la acción con una
narrativa breve:

1. propuesta de valor y acceso inmediato a la experiencia del cliente;
2. recorrido QR → pedido → operación;
3. funcionalidades para cliente, salón y administración;
4. beneficios operativos;
5. planes Básico, Profesional y Empresarial sin inventar precios;
6. preguntas frecuentes, contacto y acceso al panel.

La dirección visual combina marfil, verde profundo y acentos cálidos con las
tipografías Poppins e Inter ya incluidas en el repositorio. La fotografía del menú
demo también se reutiliza localmente. Esto mantiene coherencia con las aplicaciones
y evita llamadas a CDNs de imágenes o fuentes.

## Implementación

La aplicación vive en `apps/landing` y utiliza Astro para generar HTML estático en
`apps/landing/hosting`. Firebase Hosting conserva una página 404 real, URLs limpias
y encabezados de seguridad; a diferencia de cliente y panel, no necesita fallback
SPA.

El JavaScript entregado al navegador se limita a la navegación móvil y al cierre
del menú al elegir una sección. El contenido principal sigue disponible sin esa
mejora. Los enlaces a cliente y panel pueden configurarse con
`PUBLIC_CUSTOMER_URL` y `PUBLIC_ADMIN_URL`; en el entorno local apuntan a los
puertos 5100 y 5105.

## Responsive y accesibilidad base

- estructura semántica con encabezado, navegación, contenido principal y pie;
- enlace para saltar al contenido;
- foco visible y nombres accesibles en controles;
- menú adaptable y composiciones específicas para escritorio, tablet y móvil;
- soporte para `prefers-reduced-motion`;
- contraste y tamaños de interacción preparados para la auditoría de la Etapa 42.

## Comprobación

Desde la raíz:

```powershell
npm.cmd run landing:check
npm.cmd run test:emulators
```

El primer comando construye el sitio y ejecuta cuatro pruebas sobre identidad,
secciones, enlaces, breakpoints, movimiento reducido y la página 404. La suite de
emuladores vuelve a construir los tres destinos y comprueba la landing en
`http://127.0.0.1:5106`.

Para verla durante el desarrollo:

```powershell
npm.cmd run dev --workspace @mesaflow/landing
```

Luego se abre `http://127.0.0.1:4321`.

## Alcance diferido

No se publicó ningún sitio ni se activó facturación. Los metadatos sociales,
datos estructurados, auditoría Lighthouse formal y endurecimiento adicional de
accesibilidad corresponden a la Etapa 42. Los dominios y el despliegue cloud se
mantienen reservados para la Etapa 47.
