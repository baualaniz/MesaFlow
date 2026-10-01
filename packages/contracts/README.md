# Contratos compartidos

Enums, esquemas de validación, tipos y utilidades de dinero compartidos por el
panel, Functions y herramientas de prueba. La implementación TypeScript estricta
vive en `src/domain.ts`; Flutter mantiene su equivalente en
`apps/customer/lib/src/contracts/domain_contracts.dart`.

`fixtures/contract-spec.json` es la fuente canónica de enums y límites, mientras
que `fixtures/domain-fixtures.json` contiene casos válidos e inválidos que ambas
plataformas ejecutan. Los contratos rechazan campos desconocidos, importes
fraccionarios o negativos, timestamps sin UTC/milisegundos, enums ajenos y totales
de pedido inconsistentes.

Validación completa desde la raíz:

```powershell
npm.cmd run contracts:check
```

El primer tramo compila y prueba TypeScript; el segundo ejecuta los mismos
fixtures con Flutter/Dart. El build generado en `lib/` no se versiona.

Desde la Etapa 12, `src/firestore.d.mts` tipa las rutas históricas de
`src/firestore.mjs`. Los converters que dependen del SDK administrativo viven en
`functions/src/data`, evitando acoplar este paquete compartido a Firebase Admin.
