# Etapa 2 — Repositorio y monorepo

## Objetivo

Establecer una estructura única y predecible para el cliente Flutter, panel,
landing, backend, contratos, Firebase, documentación y automatización, junto con
un flujo Git sencillo para un MVP estudiantil mantenible.

## Resultado al finalizar

- Repositorio Git inicializado sobre la rama `main`.
- Monorepo reservado por responsabilidades, sin duplicar modelos de negocio.
- npm workspaces para los módulos TypeScript; Flutter permanece administrado por
  `pub` dentro de `apps/customer`.
- Versiones locales de Node/npm declaradas y lockfile raíz reproducible.
- Finales de línea y formato básico consistentes entre Windows y CI.
- Convenciones de ramas, commits, revisión y secretos documentadas.
- Comprobación automática de estructura y nombres de archivos sensibles.
- Repositorio remoto público configurado en `https://github.com/baualaniz/MesaFlow`.

## Estructura

```text
MesaFlow/
├── apps/
│   ├── customer/          # Flutter Web/PWA
│   ├── admin/             # React + TypeScript
│   └── landing/           # Astro
├── functions/             # Cloud Functions TypeScript
├── packages/
│   └── contracts/         # Tipos y validadores compartidos TS
├── firebase/
│   ├── seeds/
│   └── tests/
├── docs/
├── scripts/
├── .editorconfig
├── .gitattributes
├── .gitignore
├── .npmrc
├── .nvmrc
├── CONTRIBUTING.md
├── package.json
└── package-lock.json
```

## Dependencias

- Etapa 1 terminada.
- Git, Node.js y npm disponibles.
- No requiere todavía una cuenta Firebase ni GitHub.

## Decisiones

1. **Monorepo:** permite cambiar reglas, backend y clientes de forma atómica.
2. **npm workspaces:** ya viene con Node y evita sumar un gestor adicional.
3. **Sin rama `develop`:** `main` integrable y ramas cortas reducen ceremonia.
4. **Sin código temporal:** los módulos reservan su ubicación mediante README y
   se generan en la etapa donde pueden compilar y probarse.
5. **Sin Git hooks por ahora:** la CI de la Etapa 46 será la autoridad; los hooks
   locales suelen dificultar el onboarding en Windows.

## Comandos

```powershell
npm install --package-lock-only --ignore-scripts
npm run check
git status --short --branch
```

## ACCIÓN MANUAL COMPLETADA: crear el repositorio remoto en GitHub

**Objetivo:** conservar una copia remota y habilitar colaboración/CI más adelante.

**Dónde hacerlo:** sitio web de GitHub, en la cuenta u organización elegida.

**Pasos exactos:**

1. Iniciá sesión en GitHub.
2. Abrí el menú para crear un repositorio nuevo.
3. Usá `MesaFlow` como nombre.
4. Elegí visibilidad pública, según la decisión vigente del proyecto.
5. No agregues README, `.gitignore` ni licencia desde GitHub: ya existen localmente.
6. Creá el repositorio y copiá la URL HTTPS mostrada.
7. En PowerShell, dentro de MesaFlow, ejecutá:

   ```powershell
   git remote add origin URL_HTTPS_COPIADA
   git add .
   git commit -m "chore(repo): bootstrap MesaFlow monorepo"
   git push -u origin main
   ```

8. Si GitHub solicita autenticación, utilizá el inicio de sesión del navegador o
   Git Credential Manager. No pegues un token dentro de ningún archivo del repo.

**Qué opción seleccionar:** repositorio público, sin inicialización automática.

**Qué valor copiar/guardar:** URL HTTPS del repositorio. Git la guarda como remote;
no es un secreto.

**Dónde se utilizará después:** backups, pull requests y GitHub Actions.

**Cómo verificar:** `git remote -v` muestra `origin` y GitHub muestra la rama
`main` con los archivos del monorepo.

El remote local `origin` ya apunta a `https://github.com/baualaniz/MesaFlow.git`.

## ACCIÓN MANUAL: activar protecciones del repositorio público

**Objetivo:** reducir filtraciones de secretos y cambios accidentales en `main`.

**Dónde hacerlo:** GitHub → repositorio MesaFlow → Settings. Si la interfaz cambia,
buscá los conceptos **Advanced Security**, **Secret Protection**, **Push
protection** y **Rulesets**.

**Pasos exactos:**

1. En **Settings → Advanced Security**, confirmá que Secret Protection/secret
   scanning esté habilitado.
2. Habilitá **Push protection** para bloquear credenciales conocidas antes de que
   entren al repositorio.
3. Habilitá **Private vulnerability reporting** si aparece disponible, para que
   `SECURITY.md` pueda dirigir reportes a un canal privado.
4. En **Settings → Rules → Rulesets**, creá un ruleset para la rama por defecto
   `main`.
5. Activá bloqueo de force pushes y eliminación de la rama.
6. Cuando la CI exista en la Etapa 46, agregá sus checks como obligatorios antes
   de integrar. No selecciones checks inexistentes ahora.
7. Si trabajás solo y todavía necesitás commits directos, no exijas pull request en
   esta fase; podremos activarlo cuando haya colaboradores.

**Qué opción seleccionar:** enforcement activo para `main`; sin excepciones
innecesarias y sin checks obligatorios hasta que existan.

**Qué valor copiar/guardar:** ninguno. Estas son configuraciones del repositorio,
no secretos.

**Dónde se utilizará después:** protección continua del código público y CI.

**Cómo verificar:** la pestaña Security no muestra configuración pendiente de
Secret Protection y `https://github.com/baualaniz/MesaFlow/rules` muestra el
ruleset activo para `main`.

## Cómo ejecutar y probar

```powershell
npm run check
```

El comando falla si falta una ruta canónica, si el paquete raíz deja de ser
privado, si desaparece un workspace o si encuentra archivos con nombres típicos
de secretos. La protección definitiva también depende de `.gitignore`, revisión
y escaneo de CI.

## Errores frecuentes

- `EBADENGINE`: usar Node 22, 23 o 24 y npm 10 u 11; la versión comprobada es
  Node 24.19.0/npm 11.17.0.
- `dubious ownership` dentro de Codex: es una separación del sandbox. En una
  terminal normal del usuario no debería ocurrir; no es necesario debilitar la
  configuración global.
- `remote origin already exists`: revisar `git remote -v` antes de agregar otro.
- Git solicita identidad al confirmar: configurar `user.name` y `user.email` en
  Git según la identidad que quieras publicar.

## Criterio de aceptación

- [x] Existe una ubicación única para cada componente.
- [x] `package.json` es privado y declara los workspaces correctos.
- [x] Existe un lockfile sin dependencias de producción todavía.
- [x] `npm run check` finaliza correctamente.
- [x] Git usa la rama `main`.
- [x] No hay secretos ni artefactos generados en el estado versionable.
- [x] Remoto GitHub público configurado.
- [ ] Secret Protection, push protection y ruleset de `main` verificados en GitHub.

## Commit sugerido

`chore(repo): establish monorepo structure and conventions`
