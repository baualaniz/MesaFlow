# Seeds

El seed completo de la Etapa 16 vive en `demo-emulator.json`. Contiene 61
documentos deterministas con cuatro perfiles/roles, 10 mesas, 18 productos,
sesiones, pedidos, asistencia, pagos, métricas y configuración.

Solo admite el proyecto ficticio `demo-mesaflow` y Firestore Emulator en
`127.0.0.1:8080`; rechaza credenciales, proyectos cloud y otros hosts. Con los
emuladores iniciados se carga mediante:

```powershell
npm.cmd run firebase:seed:demo
```

El ejecutor verifica todos los documentos y repite internamente la operación para
demostrar que la segunda aplicación no cambia nada. No elimina colecciones ni
documentos ajenos al dataset.

`presentation-dev.json` es una excepción acotada para la entrega académica de
avance. Contiene únicamente datos ficticios, declara de forma fija
`mesaflow-desarrollo` y se carga con:

```powershell
npm.cmd run firebase:seed:presentation:dev
```

El script rechaza producción, credenciales alternativas, argumentos y colisiones;
escribe todos los documentos en un único commit atómico. Si el conjunto completo
ya existe y conserva su entrada de auditoría, solo lo verifica. No elimina datos.
