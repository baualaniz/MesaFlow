# Etapa 16 — Seed demo seguro

## Resultado

MesaFlow dispone de un dataset local completo, determinista e idempotente para
desarrollo, pruebas y demostraciones. Se carga exclusivamente en Firebase
Emulator Suite y no requiere login, credenciales, facturación ni conexión con los
proyectos `mesaflow-desarrollo` o `mesaflow-produccion`.

El seed anterior de presentación se conserva sin cambios porque ya fue usado para
la entrega académica y constituye una excepción controlada en desarrollo real.

## Contenido

El archivo `firebase/seeds/demo-emulator.json` genera 61 documentos:

| Recurso | Cantidad / estado |
|---|---:|
| Usuarios y membresías | 4: owner, manager, staff y kitchen |
| Categorías | 4 |
| Productos | 18 |
| Mesas | 10 |
| Sesiones y participantes | 3 y 3 |
| Pedidos | 4 en distintos estados |
| Solicitudes de asistencia | 2 |
| Pagos | 3: pendiente, aprobado y rechazado |
| Métricas | 1 día consistente con la actividad |
| Configuración | Pública y privada |
| Auditoría | Entrada `demo.seed.applied` |

Los correos terminan en `.example.invalid`, los hashes QR son marcadores sin token
real y no hay contraseñas, datos personales ni credenciales de proveedores.

## Barreras de seguridad

- El destino declarado debe ser `emulator`.
- El proyecto debe ser exactamente `demo-mesaflow`.
- Firestore debe estar en `127.0.0.1:8080`.
- Se rechazan `FIREBASE_TOKEN`, cuentas de servicio, URLs Firestore y proyectos
  alternativos heredados del entorno.
- No se aceptan argumentos para cambiar destino o proyecto.
- Las rutas se generan bajo `mesa-flow-demo`; no se reciben paths arbitrarios.
- IDs, referencias, roles, mesas, importes y timestamps se validan antes de
  escribir.
- No se borran documentos ni colecciones ajenas al seed.

## Idempotencia

Los IDs y timestamps son fijos. El cargador compara cada documento, escribe solo
los que faltan o difieren y verifica el estado final. A continuación repite la
carga: la segunda pasada debe informar cero cambios o el comando falla.

## Uso interactivo

En una primera terminal, desde la raíz del repositorio:

```powershell
npm.cmd run emulators
```

Cuando Firebase indique que está listo, en una segunda terminal:

```powershell
npm.cmd run firebase:seed:demo
```

El contenido puede inspeccionarse en `http://127.0.0.1:4000/firestore`. Repetir el
comando no duplica usuarios, mesas, pedidos ni pagos. Al detener los emuladores
con `Ctrl+C`, los datos locales desaparecen porque no se exportan.

## Verificación automática

```powershell
npm.cmd run check
npm.cmd run test:emulators
```

La validación rápida incluye siete pruebas del contrato del seed. La prueba de
emuladores realiza la carga real, valida los 61 documentos y comprueba una segunda
aplicación sin cambios antes de continuar con las reglas de seguridad.

## Criterios de aceptación

- [x] Cuatro usuarios/membresías con todos los roles.
- [x] Diez mesas numeradas sin duplicados.
- [x] Dieciocho productos relacionados con categorías válidas.
- [x] Sesiones, participantes, pedidos, asistencia y pagos coherentes.
- [x] Totales e importes validados.
- [x] Dataset determinista e idempotente.
- [x] Producción y desarrollo inaccesibles para este comando.
- [x] Siete pruebas estáticas y carga real en emulador aprobadas.
- [x] Sin credenciales, datos personales, despliegue ni facturación.

## Próximo paso

La Etapa 17 retoma la aplicación Flutter Web/PWA y conecta el shell visual ya
creado con configuración Firebase separada para desarrollo y producción.

## Commit sugerido

`feat(data): add safe idempotent emulator demo seed`
