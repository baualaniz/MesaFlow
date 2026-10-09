# Etapa 43 — Pruebas unitarias, de widgets y componentes

Estado: **completa localmente**. La lógica crítica del cliente Flutter y del panel
React tiene una suite rápida, límites de cobertura automáticos y pruebas de
interacción sobre componentes reales.

## Panel administrativo

La suite Vitest pasó de 61 a 76 pruebas. Además de los modelos, permisos y guards
existentes, ahora comprueba:

- marca, iconos y pantalla de carga con semántica accesible;
- inicio de sesión, visibilidad de contraseña, redirección y recuperación;
- mensajes de error y reactivación de formularios ante fallas de Firebase;
- navegación visible según el rol de cocina;
- cambio de establecimiento, cierre de sesión y menú móvil;
- estados de pedido visibles para cocina y para los demás roles.

Vitest usa V8 para medir la capa crítica del panel. El comando falla si baja de
85% en sentencias, funciones o líneas, o de 80% en ramas. Resultado observado:

| Métrica | Resultado | Mínimo |
|---|---:|---:|
| Sentencias | 88,34% | 85% |
| Ramas | 85,42% | 80% |
| Funciones | 95,20% | 85% |
| Líneas | 90,15% | 85% |

El alcance incluye modelos, permisos, guards, componentes compartidos, layouts y
las páginas de autenticación. Repositorios Firebase y páginas operativas extensas
se validan en la Etapa 44 con emuladores y recorridos integrados.

## Cliente Flutter

Las 78 pruebas Dart cubren contratos, rutas, carrito, sesiones, menú, pedidos,
seguimiento, asistencia, consumo, pago, diseño responsive y widgets completos.
El informe LCOV aplica dos límites:

- aplicación propia, excluyendo únicamente opciones Firebase generadas: mínimo
  75%; resultado 77,13% (1760/2282 líneas);
- lógica y widgets críticos bajo `lib/src`, excluyendo adaptadores cuyo nombre
  comienza con `firebase_`: mínimo 80%; resultado 83,53% (1755/2101 líneas).

Los adaptadores excluidos del segundo límite no quedan sin validar: sus contratos,
repositorios Firestore y flujos reales se prueban mediante dobles, reglas y
emuladores. La separación evita que código generado o límites de plataforma
distorsionen la cobertura de la lógica mantenida por el equipo.

## Comandos

La suite rápida de esta etapa se ejecuta desde la raíz:

```powershell
npm.cmd run test:critical
```

También puede comprobarse cada aplicación por separado:

```powershell
npm.cmd run admin:coverage
npm.cmd run customer:coverage
```

`npm.cmd run check` incluye ambos límites y ejecuta 318 pruebas en total. Los
informes `coverage/` son salidas locales ignoradas por Git. No se consulta la
nube, no se despliega y no se requieren credenciales.

## Criterio de cierre

- 76/76 pruebas del panel aprobadas;
- 78/78 pruebas Flutter aprobadas;
- cuatro umbrales TypeScript superados;
- dos umbrales Flutter superados;
- lint y build del panel aprobados;
- verificación principal preparada para impedir regresiones de cobertura.

La integración y el E2E sobre los emuladores completos quedaron aprobados en la
Etapa 44.
