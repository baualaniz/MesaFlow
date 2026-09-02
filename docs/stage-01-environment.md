# Etapa 1 — Preparación del entorno

## Objetivo

Dejar una computadora Windows lista para desarrollar y probar el MVP web/PWA de
MesaFlow, sin exigir toolchains nativos fuera del alcance inicial.

## Resultado al finalizar

| Herramienta | Resultado comprobado el 2026-09-02 |
|---|---|
| Git | 2.53.0.windows.2 |
| Flutter | 3.41.5 stable |
| Dart | 3.11.3 |
| Node.js | 24.19.0 |
| npm | 11.17.0 |
| Firebase CLI | 15.28.2 |
| Java | Temurin 21.0.12 LTS |
| Chrome | Detectado por Flutter; desarrollo web habilitado |

`flutter doctor -v` confirmó Flutter, Windows, Chrome, dispositivos web y red.
Reportó dos toolchains opcionales ausentes:

- Android SDK: necesario solo para compilar/ejecutar Android.
- Visual Studio con C++: necesario solo para compilar una aplicación Windows.

Ninguno bloquea la PWA accesible por QR ni las tres interfaces web previstas.

## Acción manual pendiente

No hay ninguna acción manual obligatoria pendiente en esta etapa. Después de
abrir una nueva terminal, `firebase --version` debe resolver desde el PATH del
usuario. Si la terminal ya estaba abierta durante la instalación, cerrala y abrí
otra para que Windows refresque el PATH.

### ACCIÓN MANUAL OPCIONAL: habilitar Android

**Objetivo:** compilar el mismo cliente Flutter como aplicación Android más
adelante.

**Dónde hacerlo:** Android Studio y PowerShell.

**Pasos exactos:**

1. Descargá Android Studio desde el sitio oficial de Android Developers.
2. En el instalador mantené seleccionados Android SDK, Platform Tools y Emulator.
3. Abrí Android Studio y completá el Setup Wizard con una versión estable del SDK.
4. En PowerShell ejecutá `flutter doctor --android-licenses` y revisá/aceptá las
   licencias.
5. Ejecutá `flutter doctor -v`.

**Qué opción seleccionar:** instalación Standard; un dispositivo virtual moderno
solo si querés probar sin teléfono físico.

**Qué valor copiar/guardar:** ninguno. No agregues rutas locales del SDK al repo.

**Dónde se utilizará después:** build Android opcional posterior al MVP web.

**Cómo verificar:** el bloque Android toolchain de `flutter doctor -v` aparece
con una marca verde.

## Archivos creados o modificados

- `.gitignore`
- `.env.example`
- `README.md`
- `docs/product-spec.md`
- `docs/architecture.md`
- `docs/master-plan.md`
- `docs/stage-01-environment.md`
- `scripts/check-environment.ps1`

## Cómo ejecutar y probar

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\check-environment.ps1
```

El verificador es de solo lectura. Debe listar las herramientas requeridas y
terminar con el diagnóstico de Flutter. Una advertencia de Android o Visual
Studio no invalida la aceptación web.

## Errores frecuentes

- `firebase` no se reconoce justo después de instalar: abrir una terminal nueva.
- Flutter tarda en su primera ejecución: está inicializando caché; permitir que
  escriba dentro de la carpeta de su SDK.
- PowerShell bloquea scripts locales: usar la política `Process`, que se descarta
  al cerrar esa terminal.

## Criterio de aceptación

- [x] Git y repositorio `main` inicializados.
- [x] Flutter/Dart ejecutan y Chrome está disponible.
- [x] Node/npm ejecutan.
- [x] Firebase CLI está instalada.
- [x] Java está disponible para emuladores.
- [x] Secretos y artefactos locales están excluidos de Git.

## Commit sugerido

`chore(repo): bootstrap MesaFlow architecture and environment checks`

