# Etapa 44 — Emuladores, integración y E2E

Estado: **completa localmente**. Auth, Firestore, Functions, Storage y los tres
sitios Hosting se levantan juntos sobre `demo-mesaflow`; el dataset se carga de
forma determinista y un único comando verifica tanto los contratos de backend
como las interfaces reales en Chrome.

## Recorrido en navegador

La prueba usa Playwright Core con una instalación local de Chrome, por lo que no
descarga otro navegador. Obtiene los puertos asignados desde Emulator Hub y
comprueba:

- landing: título principal y CTA que abre la aplicación del cliente;
- panel: login real del owner contra Auth Emulator, resolución del perfil,
  membresía y establecimiento, y presentación del dashboard;
- cliente en viewport móvil: deep link con token QR, Auth anónima, canje del
  token, limpieza de la URL y catálogo leído desde Firestore.

Durante esta verificación se detectó y corrigió una carrera del panel: el router
podía volver a `/login` después de que Firebase aceptara las credenciales, antes
de que el contexto React publicara al usuario. La navegación ahora ocurre cuando
ese estado autenticado está disponible y cuenta con una prueba de regresión.

## Recorrido integrado de negocio

La misma ejecución crea una identidad anónima y canjea el QR temporal. Con esa
sesión:

1. crea un pedido mediante la callable, usando precio y total recalculados en el
   servidor;
2. reintenta la solicitud y confirma que no duplica pedido ni consumo;
3. mueve **esa misma orden** por `created → confirmed → preparing → ready →
   delivered → completed`, autenticando staff, kitchen y owner según cada
   permiso y comprobando la auditoría;
4. crea una preferencia de pago simulada, valida su idempotencia y procesa un
   webhook firmado;
5. confirma el pago aprobado, el saldo final en cero, la sesión pagada y las
   métricas sin duplicación;
6. elimina todos los fixtures temporales.

También permanecen cubiertos los recorridos de asistencia, mesas y QR, catálogo,
equipo, configuración, dashboard y WhatsApp simulado, además de los casos
negativos de autenticación, roles y aislamiento entre establecimientos.

## Reglas y superficies verificadas

- 16 casos de reglas Firestore aprobados;
- 9 casos de reglas Storage aprobados;
- builds de cliente, panel, landing y Functions servidos por Hosting Emulator;
- Functions invocadas por HTTP/callable y triggers procesados en el emulador;
- seed completo aplicado dos veces sin duplicar documentos;
- ningún acceso a los proyectos `mesaflow-desarrollo` o
  `mesaflow-produccion`.

## Comando reproducible

Desde la raíz del repositorio, con Chrome instalado:

```powershell
npm.cmd run test:e2e
```

El comando construye las aplicaciones, inicia los emuladores en puertos libres,
carga los datos, ejecuta todos los recorridos y apaga los procesos aunque una
prueba falle. No requiere credenciales cloud, tarjeta, plan Blaze ni secretos
reales. La primera ejecución puede descargar los binarios oficiales de los
emuladores de Firebase.

## Criterio de cierre

- recorrido visual landing → cliente aprobado;
- login y dashboard administrativos aprobados con Firebase real emulado;
- QR → menú → pedido → operación → pago simulado aprobado de extremo a extremo;
- Firestore y Storage sin fallas de reglas;
- fixtures dinámicos eliminados y Emulator Suite apagada correctamente;
- comando integral finalizado con código de salida 0.

La Etapa 45 continuará con el threat model y el endurecimiento de seguridad.
