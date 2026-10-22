# Estrategia de pruebas

MesaFlow usa controles rápidos, pruebas de reglas y un recorrido integral con
Firebase Emulator Suite.

## Capas

| Capa | Cobertura principal | Comando |
|---|---|---|
| Repositorio/configuración | Estructura, ambientes, secretos, Hosting y deploy | `npm.cmd run check` |
| Contratos | Enums, dinero, timestamps y estados TS/Dart | `npm.cmd run contracts:check` |
| Cliente | Unit, widgets, rutas, carrito, pedidos y cobertura | `npm.cmd run customer:coverage` |
| Panel | Unit/componentes, RBAC, páginas y cobertura | `npm.cmd run admin:check` |
| Functions | Validación, transacciones, pagos y proveedores | `npm.cmd run functions:check` |
| Seguridad | App Check, CSP, CORS, reglas y sinks | `npm.cmd run test:security` |
| Dependencias | Auditoría online del registro npm | `npm.cmd run security:audit` |
| Integración/E2E | QR → pedido → operación → pago simulado | `npm.cmd run test:e2e` |

## Validación rápida

```powershell
npm.cmd ci --ignore-scripts
npm.cmd run check
```

`check` no consulta servicios remotos. Ejecuta 380 pruebas, lint, builds y
umbrales de cobertura. El panel exige la cobertura configurada por Vitest;
Flutter exige al menos 75% global y 80% en lógica/widgets críticos.

## Regresión integral

```powershell
npm.cmd run test:e2e
```

El comando compila, inicia Auth, Firestore, Functions, Storage y tres Hosting
emulados, carga dos veces el seed para demostrar idempotencia, usa Chrome para
las tres interfaces y ejecuta el flujo de negocio. Al finalizar elimina fixtures
dinámicos y apaga los procesos incluso ante fallos.

Casos de seguridad obligatorios:

- un tenant no puede leer ni escribir otro;
- staff y kitchen no pueden elevar permisos;
- el cliente no puede alterar estados ni totales;
- una firma falsa no registra pagos;
- un reintento no duplica pedido, pago o métricas;
- un QR rotado, manipulado o repetido se rechaza.

## Smoke cloud

```powershell
npm.cmd run deploy:smoke:dev
npm.cmd run deploy:smoke:prod
```

Comprueba raíces, rutas profundas, 404, CSP y caché de los tres sitios. No crea ni
modifica documentos.

Después de un futuro despliegue pago del backend, el control adicional es:

```powershell
npm.cmd run deploy:smoke:functions:prod
```

Enumera las 14 Functions esperadas y consulta únicamente el endpoint `health`.

## Criterio ante fallos

No se publica ni se cierra una etapa si falla un control obligatorio. Primero se
conserva la salida, se corrige la causa y se repite el comando completo afectado.
Warnings documentados de tamaño de bundle o dependencias de tooling no equivalen
a vulnerabilidades de producción, pero se mantienen visibles para revisión.

