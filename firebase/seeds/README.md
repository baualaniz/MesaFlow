# Seeds

El seed completo, seguro e idempotente se implementará en la Etapa 16 y usará el
emulador por defecto.

`presentation-dev.json` es una excepción acotada para la entrega académica de
avance. Contiene únicamente datos ficticios, declara de forma fija
`mesaflow-desarrollo` y se carga con:

```powershell
npm.cmd run firebase:seed:presentation:dev
```

El script rechaza producción, credenciales alternativas, argumentos y colisiones;
escribe todos los documentos en un único commit atómico. Si el conjunto completo
ya existe y conserva su entrada de auditoría, solo lo verifica. No elimina datos.
