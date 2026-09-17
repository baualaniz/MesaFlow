# Recursos locales de Firebase

Esta carpeta contiene únicamente herramientas y datos locales de Firebase:

- `seeds/`: dataset reproducible para emuladores y desarrollo autorizado.
- `tests/`: pruebas de Firestore y Storage Rules.
- `hosting-policy.json`: destinos locales y nombres cloud solamente propuestos.

La configuración desplegable (`firebase.json`, reglas e índices) vive en la raíz,
como espera Firebase CLI.

La suite local ejecuta Auth, Firestore, Storage, Functions y Hosting sobre
`demo-mesaflow`. Incluye reglas Firestore cerradas, un catálogo de índices aún
vacío, pruebas de imágenes por tenant, una función de salud y tres sitios web.
Esto no activa servicios en los proyectos reales. Ejecutar
`npm.cmd run test:emulators` desde la raíz.
