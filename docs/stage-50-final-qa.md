# Etapa 50 — QA final y Definition of Done

Estado: **completa para el MVP demostrable y el alcance gratuito autorizado**.
La regresión final del 22 de octubre de 2026 cubre código, reglas, interfaces,
integración, seguridad, documentación, sitios productivos y recuperación.

## Alcance de la aceptación

Los 20 puntos funcionales se ejecutan de punta a punta en Firebase Emulator
Suite, incluyendo Functions, Mercado Pago y WhatsApp simulados. En cloud están
publicados Rules, índices y los tres sitios; Functions y los webhooks no se
desplegaron porque requieren Blaze. Por lo tanto, este cierre acepta el **MVP
funcional y demostrable**, no una operación comercial productiva con pagos reales.

## Definition of Done — 20 puntos

- [x] **1. El administrador inicia sesión.** Auth Emulator y el navegador validan
  login, perfil, membresía, tenant y rutas privadas (`stage-31`, `stage-44`).
- [x] **2. Configura categorías y productos.** El panel ofrece CRUD, orden,
  imágenes empaquetadas y disponibilidad con permisos (`stage-35`).
- [x] **3. Existen mesas con QR.** Hay diez mesas demo, sesiones, impresión,
  rotación y revocación segura (`stage-34`).
- [x] **4. El cliente escanea el QR.** El deep link canjea un token con Auth
  anónima, hash, antirreplay y limpieza de URL (`stage-20`, `stage-44`).
- [x] **5. Abre MesaFlow sin instalar.** Flutter Web/PWA funciona en navegador
  móvil y conserva rutas profundas (`stage-17`, `stage-19`).
- [x] **6. Ve el menú.** Lee categorías y productos publicados del tenant con
  búsqueda, filtros y estados recuperables (`stage-21`).
- [x] **7. Agrega productos.** Detalle, cantidad, nota y subtotal validado se
  incorporan al carrito persistente (`stage-22`, `stage-23`).
- [x] **8. Confirma el carrito.** La interfaz muestra el resumen y bloquea datos
  inválidos antes de enviar (`stage-23`, `stage-24`).
- [x] **9. Genera un pedido.** La Function recalcula precios, crea el snapshot y
  aplica idempotencia transaccional (`stage-24`, `stage-44`).
- [x] **10. El panel recibe el pedido en tiempo real.** La cola por rol escucha
  Firestore y abre el detalle de la comanda (`stage-33`, `stage-44`).
- [x] **11. El personal cambia estados.** La máquina de estados controla rol,
  transición, timestamp, reintento y auditoría (`stage-33`).
- [x] **12. El cliente ve los cambios.** El timeline escucha la misma orden y
  recupera su estado tras recargar (`stage-25`, `stage-44`).
- [x] **13. Visualiza su consumo.** El backend reconstruye pedidos, pagos y saldo
  de la sesión y permite pedir la cuenta (`stage-27`).
- [x] **14. Realiza el flujo de Mercado Pago.** Checkout Pro sandbox/preference y
  retornos informativos están implementados; E2E usa proveedor simulado
  (`stage-28`, `stage-29`, `stage-44`).
- [x] **15. El backend verifica el resultado.** Firma, consulta al proveedor,
  discordancias y reintentos están validados (`stage-30`).
- [x] **16. El pago queda registrado.** La conciliación transaccional e idempotente
  actualiza pago, saldo, sesión y auditoría (`stage-30`, `stage-44`).
- [x] **17. El administrador visualiza la venta.** Pagos aprobados alimentan los
  agregados accesibles a owner/manager (`stage-38`).
- [x] **18. El dashboard refleja los datos.** Ventas, pedidos, pagos y productos
  destacados se leen desde agregados diarios acotados (`stage-38`, `stage-44`).
- [x] **19. Las reglas aíslan establecimientos.** Pruebas positivas y negativas de
  Firestore/Storage, RBAC y backend rechazan acceso cruzado (`stage-14`,
  `stage-15`, `stage-44`, `stage-45`).
- [x] **20. Todo se ejecuta siguiendo el README.** El manual, seed, credenciales
  ficticias, puertos, guion y contingencias están verificados automáticamente
  (`stage-49`).

Las referencias `stage-N` corresponden a `docs/stage-NN-*.md` y se complementan
con `docs/testing.md` y `docs/user-guide.md`.

## Regresión final

Comandos obligatorios ejecutados desde el repositorio controlado:

```powershell
npm.cmd run check
npm.cmd run test:e2e
npm.cmd run security:audit
npm.cmd run deploy:smoke:prod
```

Resultado esperado y aprobado:

- 367 pruebas locales, lint y builds sin fallas;
- 77 pruebas del panel con 88,58% de statements;
- 81 pruebas Flutter con 77,01% global y 83,57% crítica;
- 62 pruebas de Functions;
- E2E completo QR → pedido → estados → pago simulado;
- reglas Firestore/Storage y aislamiento multi-tenant aprobados;
- auditoría sin vulnerabilidades de producción no aceptadas;
- seis smoke checks productivos aprobados.

Los warnings de tamaño del bundle administrativo y la dependencia transitiva de
desarrollo documentada no bloquean el MVP, pero permanecen visibles para futuras
optimizaciones.

## Estado cloud verificado

Las comprobaciones remotas son de solo lectura salvo el smoke HTTP:

```powershell
npm.cmd run auth:check -- all
npm.cmd run firestore:check -- all
npm.cmd run firestore:indexes:check:dev
npm.cmd run deploy:smoke:prod
```

Authentication, Firestore, índices de desarrollo y las seis rutas/cabeceras de
Hosting productivo deben continuar en estado aprobado antes de cada demo externa.

## Respaldo y recuperación

`docs/backup-recovery.md` documenta Git/GitHub, rollback independiente de los
tres sitios, recuperación de reglas desde un commit estable y recreación de la
demo. Los backups, PITR y export/import de datos reales quedan deliberadamente
pendientes porque requieren Blaze; deberán aprobarse antes de la primera carga
operativa en producción.

## Hallazgos y riesgos residuales

- **Críticos/altos abiertos:** ninguno en el alcance probado.
- **Functions productivas:** diferidas por costo; no hay flujo cloud completo.
- **App Check enforcement:** diferido hasta desplegar backend y observar tráfico.
- **Datos productivos:** no cargar datos reales sin backup/restore aprobado.
- **Rendimiento panel:** el bundle admite futura división de código; no impide la
  demo ni la cobertura funcional.

## Criterio de cierre

- [x] Los 20 puntos tienen evidencia y recorrido reproducible.
- [x] Suite rápida y E2E aprobadas.
- [x] Seguridad y dependencias revalidadas.
- [x] Hosting productivo revalidado.
- [x] Documentación canónica completada.
- [x] Estrategia de backup/rollback documentada sin activar costos.
- [x] Límites productivos comunicados sin afirmar capacidades no desplegadas.

MesaFlow queda listo para entrega y demostración. Cualquier paso hacia operación
real —Blaze, secretos, Functions, webhooks, datos personales o pagos reales— es
una ampliación posterior y requiere autorización independiente.

