# Etapa 3 — Ambientes Firebase

## Objetivo

Separar desarrollo y producción en proyectos Firebase independientes y guardar
los alias del equipo de manera consistente y testeable.

## Resultado al finalizar

| Ambiente | Alias de CLI | ID exacto | Uso |
|---|---|---|---|
| Desarrollo | `dev` | `mesaflow-desarrollo` | Integraciones y pruebas controladas |
| Producción | `prod` | `mesaflow-produccion` | Despliegue final aprobado |
| Predeterminado | `default` | `mesaflow-desarrollo` | Fallback de configuración local |

El usuario confirmó la creación de ambos proyectos. Esta etapa comprueba los
archivos locales; todavía no verifica mediante la CLI el acceso de la cuenta
Google ni qué servicios están habilitados en la nube.

## Dependencias y alcance

- Etapas 1 y 2 completas y repositorio sincronizado al comenzar.
- Dos proyectos creados por el usuario y sus IDs confirmados.
- Node.js disponible; las pruebas utilizan su ejecutor incorporado.
- Cero dependencias adicionales, secretos o cambios de facturación.

No se registran aplicaciones, activan servicios, crean bases de datos, cargan
secrets ni despliegan recursos en esta etapa. Tampoco se ejecuta `firebase init`:
`firebase.json` y los emuladores se prepararán en la Etapa 4.

## Decisiones de implementación

1. Se crea `.firebaserc` directamente con los IDs reales proporcionados, en lugar
   del `.firebaserc.example` provisional del plan. No hace falta copiar una
   plantilla ni volver a crear los proyectos.
2. Se versiona este archivo porque es la configuración del equipo MesaFlow y
   contiene únicamente IDs, no credenciales. Este repositorio público es una
   aplicación concreta, no una plantilla para terceros. Quien haga un fork debe
   usar sus propios proyectos; clonar el código no otorga permisos en Firebase.
3. Desarrollo queda como `default`. Sin embargo, una selección activa guardada
   por la CLI o `--project` puede prevalecer. Esto NO bloquea un despliegue
   accidental ni sustituye permisos IAM, reglas o revisiones.
4. Los futuros comandos operativos del proyecto especificarán el destino con
   `--project dev` o `--project prod`. Producción requiere aprobación expresa.
5. Las credenciales y datos no se compartirán entre ambientes. Los clientes web
   deberán inicializar el SDK con la configuración de su ambiente: cambiar un
   alias de CLI no cambia automáticamente el Firebase usado por una aplicación.
6. La demo local usará emuladores en la Etapa 4; el ID `dev` identifica un proyecto
   real y no significa que las llamadas estén emuladas.

## Archivos creados y modificados

```text
MesaFlow/
├── .firebaserc
├── package.json
├── README.md
├── docs/
│   ├── architecture.md
│   ├── master-plan.md
│   └── stage-03-firebase-environments.md
└── scripts/
    ├── check-repository.mjs
    ├── firebase-projects.test.mjs
    └── lib/
        └── firebase-projects.mjs
```

### .firebaserc

```json
{
  "projects": {
    "default": "mesaflow-desarrollo",
    "dev": "mesaflow-desarrollo",
    "prod": "mesaflow-produccion"
  }
}
```

- `.firebaserc`: correspondencia usada por Firebase CLI. No tiene secretos.
- `scripts/lib/firebase-projects.mjs`: comprueba IDs, alias separados y fallback
  de desarrollo. No contacta a Firebase.
- `scripts/firebase-projects.test.mjs`: ocho casos de prueba, incluyendo ausencia
  de alias, mezcla de ambientes, IDs inválidos y producción como predeterminado.
- `scripts/check-repository.mjs`: integra la validación de los alias al chequeo
  existente.
- `package.json`: hace que `check` también ejecute las pruebas de configuración.
- Documentos: registran los IDs, las limitaciones y los pasos restantes.

## ACCIÓN MANUAL — validar la configuración local

**Objetivo:** comprobar los alias y las pruebas en tu terminal.

**Dónde hacerlo:** PowerShell, dentro de la carpeta MesaFlow.

**Pasos exactos:**

1. Ejecutá `npm.cmd run check`.
2. Confirmá que se imprimen ambos IDs correctamente.
3. Confirmá que las ocho pruebas pasan y no hay fallos.

**Qué opción seleccionar:** ninguna; no se abre una sesión ni se elige una cuenta.

**Qué valor copiar/guardar:** solo la salida del error si alguna prueba falla.

**Dónde se utilizará después:** base de la Etapa 4 y de los comandos de despliegue.

**Cómo verificar:** el comando termina con código 0, muestra los dos IDs y ocho
pruebas aprobadas.

## ACCIÓN MANUAL — guardar la etapa en GitHub

**Objetivo:** publicar la configuración y su documentación en el repositorio.

**Dónde hacerlo:** PowerShell, dentro de MesaFlow.

**Pasos exactos:**

1. Ejecutá `git status` y revisá los archivos de esta etapa.
2. Ejecutá:

   ```powershell
   git add .firebaserc package.json README.md docs/architecture.md docs/master-plan.md docs/stage-03-firebase-environments.md scripts/check-repository.mjs scripts/firebase-projects.test.mjs scripts/lib/firebase-projects.mjs
   git commit -m "chore(firebase): configure development and production aliases"
   git push
   git status
   ```

**Qué opción seleccionar:** la rama actual `main`; no hace falta crear otro remote.

**Qué valor copiar/guardar:** ninguno; los IDs publicados no son credenciales.

**Dónde se utilizará después:** otros clones del repositorio y la futura CI.

**Cómo verificar:** `working tree clean` y rama sincronizada con `origin/main`.

## Cómo ejecutar y probar

```powershell
npm.cmd run check
npm.cmd run test:config
```

El segundo comando ejecuta solo las pruebas de esta etapa y es opcional porque
el primero ya las incluye. No se necesita `npm install`: no se agregaron paquetes.

## Errores frecuentes

- PowerShell bloquea `npm.ps1`: usar `npm.cmd` evita ese script sin cambiar
  políticas del equipo.
- IDs con espacios o HTML copiado: `.firebaserc` debe contener exactamente los
  valores de la tabla, sin barras ni `&#x20;`.
- `firebase use` indica que no encuentra un directorio de proyecto: la
  inicialización de `firebase.json` pertenece a la Etapa 4; no usar `firebase init`
  para resolverlo todavía.
- Un proyecto no aparece en la CLI más adelante: comprobar la cuenta Google y
  sus permisos. No crear otro proyecto como solución automática.

## Criterio de aceptación

- [x] El usuario confirmó dos proyectos separados.
- [x] `dev` y `prod` guardan los IDs suministrados sin espacios.
- [x] `default` apunta a desarrollo.
- [x] La configuración y ocho pruebas automatizadas pasan localmente.
- [x] No se activaron servicios, facturación ni despliegues.
- [ ] Verificación del acceso remoto mediante Firebase CLI: Etapa 4.

## Próxima etapa

Etapa 4 — autenticación de Firebase CLI y Emulator Suite. Allí se solicitará
`firebase.cmd login`, se verificará `firebase.cmd projects:list` y se preparará la
configuración local de emuladores. No compartas contraseñas, códigos OAuth ni
tokens en el chat.

## Commit sugerido

`chore(firebase): configure development and production aliases`

## Referencias oficiales

- [Alias de proyectos y selección explícita](https://firebase.google.com/docs/cli#project_aliases).
- [Separación de ambientes Firebase](https://firebase.google.com/docs/projects/dev-workflows/general-best-practices).
