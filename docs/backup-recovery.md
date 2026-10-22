# Respaldo y recuperación

El objetivo actual es proteger el código y poder volver a una versión estática
estable sin activar facturación. Producción todavía no contiene datos reales de
operación ni recibe pedidos porque Functions permanece sin desplegar.

## Cobertura actual sin costo

| Activo | Respaldo | Recuperación |
|---|---|---|
| Código, reglas, índices y documentación | Git local y repositorio público GitHub | Revertir a un commit verificado y repetir checks/deploy protegido |
| Hosting | Historial de releases por cada sitio | Rollback desde Firebase Console y smoke cloud |
| Esquema y configuración | JSON, Rules y políticas versionadas | Restaurar desde Git y validar antes de desplegar |
| Demo local | Seed determinista sin datos reales | Reiniciar emuladores y repetir el seed |
| Datos cloud productivos | Sin datos operativos por ahora | No aplica hasta habilitar el backend productivo |

Firebase Hosting conserva versiones anteriores del canal live para permitir
rollback. La operación crea una nueva release que vuelve a servir una versión
anterior.

## Firestore cuando existan datos reales

Las copias administradas, PITR, restore y export/import requieren facturación y
generan cargos. No se habilitarán sin autorización expresa. Antes de incorporar
el primer establecimiento real se deberá:

1. aprobar Blaze, presupuesto y alertas de costo;
2. elegir backup diario o semanal y retención según requisitos legales;
3. asignar roles mínimos para administrar backups y restores;
4. ejecutar una restauración de prueba hacia una base nueva;
5. documentar RPO/RTO, responsables y frecuencia de simulacro;
6. comprobar que los secretos y datos personales no entren en Git ni en el seed.

El export administrado también requiere Blaze, usa Cloud Storage y cobra lecturas
por documento exportado. No se presenta como una alternativa gratuita.

## Procedimiento ante una incidencia

1. Detener nuevas publicaciones y registrar hora/alcance sin copiar secretos.
2. Si es visual, hacer rollback del sitio afectado y ejecutar smoke.
3. Si afecta Rules, volver al commit estable, ejecutar reglas/E2E y redesplegar.
4. Si afecta datos reales, impedir escrituras cuando sea seguro y usar el plan de
   restore aprobado; nunca importar sobre producción por ensayo.
5. Validar integridad, permisos, pedidos, pagos y métricas antes de reabrir.
6. Documentar causa, impacto, corrección y prevención.

## Verificación trimestral futura

- repositorio remoto accesible y commit de release identificable;
- rollback de Hosting conocido por al menos dos responsables;
- política de retención vigente;
- restauración de Firestore ensayada en un destino aislado;
- secretos rotables y contactos de incidentes actualizados.

Fuentes oficiales:

- [Backups y restore de Firestore](https://firebase.google.com/docs/firestore/backups)
- [Exportación e importación administrada](https://firebase.google.com/docs/firestore/manage-data/export-import)
- [Historial y rollback de Firebase Hosting](https://firebase.google.com/docs/hosting/manage-hosting-resources)

