# Etapa 49 — Documentación y demostración

Estado: **completa**. La documentación técnica existente quedó conectada con un
manual operativo y un guion de presentación que permiten a una persona nueva
iniciar, recorrer y reiniciar la demo sin tocar desarrollo o producción.

## Identidad y datos de presentación

- producto: **MesaFlow**;
- tenant ficticio: **Bistró MesaFlow**;
- moneda: ARS;
- diez mesas, dieciocho productos y cuatro roles;
- correos reservados bajo `.example.invalid`;
- pagos, teléfonos y actividad sin relación con personas reales.

Esta identidad coincide con el seed canónico y con las interfaces. Puede
reemplazarse más adelante sin cambiar la arquitectura.

## Mapa documental

| Necesidad | Fuente principal |
|---|---|
| Estado y comienzo rápido | `README.md` |
| Alcance funcional | `docs/product-spec.md` |
| Arquitectura, stack y modelo Firestore | `docs/architecture.md` |
| Esquema ejecutable | `firebase/schema/firestore-schema.json` |
| Riesgos y controles | `docs/threat-model.md`, `SECURITY.md` |
| Pruebas unitarias e integración | `docs/stage-43-unit-widget-component-tests.md`, `docs/stage-44-emulators-integration-e2e.md` |
| Seguridad final | `docs/stage-45-security-hardening.md` |
| Integración continua | `docs/stage-46-continuous-integration.md` |
| Despliegues y rollback | `docs/stage-47-development-deployment.md`, `docs/stage-48-production-domain.md` |
| Uso del sistema | `docs/user-guide.md` |
| Presentación paso a paso | `docs/demo-script.md` |
| Estado ejecutivo | `docs/informe-avance-presentacion.md` |

## Flujo reproducible

El manual establece una única secuencia segura:

1. `npm.cmd run emulators`;
2. esperar a que los servicios estén listos;
3. `npm.cmd run firebase:seed:demo` en otra terminal;
4. recorrer landing, cliente, panel y Firebase local;
5. detener con `Ctrl+C`.

El seed rechaza proyectos cloud, solo admite loopback y es idempotente. Las
credenciales documentadas pertenecen exclusivamente a Authentication Emulator.

## Control automático de la documentación

`npm.cmd run test:documentation` comprueba que:

- las guías requeridas existen y están enlazadas desde el README;
- comandos, puertos y usuarios de la demo coinciden entre los documentos;
- el guion declara el alcance productivo real y el límite de Functions;
- el mapa cubre arquitectura, esquema, seguridad, pruebas, despliegue y uso;
- el plan maestro registra la etapa como completa.

Este control forma parte de `npm.cmd run check` y de CI.

## Criterio de cierre

- [x] README y plan maestro actualizados.
- [x] Arquitectura, esquema, seguridad, pruebas y despliegue referenciados.
- [x] Manual de usuario reproducible creado.
- [x] Guion de demo con tiempos, relato y contingencias creado.
- [x] Informe ejecutivo actualizado al estado productivo real.
- [x] Identidad ficticia y ausencia de datos personales documentadas.
- [x] Consistencia documental protegida por pruebas automáticas.

La Etapa 50 realizará la regresión final y reunirá evidencia para cada punto de
la Definition of Done.

