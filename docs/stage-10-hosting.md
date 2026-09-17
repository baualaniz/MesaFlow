# Etapa 10 — Firebase Hosting local multi-sitio

## Objetivo y alcance

Configurar tres destinos independientes —cliente, panel y landing— con rutas,
encabezados y pruebas reproducibles. La etapa se cierra localmente: no crea sitios
remotos, no publica contenido, no acepta dominios y no activa facturación.

## Destinos

| Target | Contenido actual | Directorio | Comportamiento |
|---|---|---|---|
| `customer` | Build Flutter Web funcional | `apps/customer/build/web` | SPA; toda ruta inexistente sirve `index.html` |
| `admin` | Página provisional honesta | `apps/admin/hosting` | SPA; preparada para el build React de Etapa 31 |
| `landing` | Presentación provisional | `apps/landing/hosting` | Sitio estático; rutas inexistentes responden 404 |

El build Flutter está ignorado por Git y se regenera mediante
`npm.cmd run hosting:build`. Las páginas provisionales sí se versionan para que un
clon limpio pueda iniciar los tres destinos antes de construir React y Astro.

## Ejecución local

Desde la raíz:

```powershell
npm.cmd run emulators
```

El comando compila primero el cliente y Functions, y luego inicia todo con el ID
ficticio `demo-mesaflow`. Esperá el mensaje `All emulators ready`. Firebase usa:

- cliente: `http://127.0.0.1:5100`;
- panel: `http://127.0.0.1:5105`;
- landing: `http://127.0.0.1:5106`;
- consola de emuladores: `http://127.0.0.1:4000`.

Los dos puertos adicionales los reserva Firebase CLI a partir del puerto base;
la salida de la consola es la referencia definitiva si el entorno cambia. Se
detiene todo con `Ctrl+C`.

La vista previa anterior en el puerto 7357 sigue disponible, pero Hosting local
es ahora el camino integrado y además prueba las rutas profundas.

## Verificación

Validación rápida sin iniciar servicios:

```powershell
npm.cmd run hosting:check
npm.cmd run test:hosting-config
```

Prueba integrada:

```powershell
npm.cmd run test:emulators
```

La prueba descubre los puertos a través del Hub local y comprueba:

- raíz y ruta `/e/casa-demo/table/mesa-01` del cliente;
- fallback del panel en `/operacion/pedidos`;
- raíz, encabezados y respuesta 404 de la landing;
- Functions, Auth, Firestore y reglas Storage ya cubiertos por etapas previas.

## Seguridad y caché

Los tres destinos escuchan únicamente en `127.0.0.1` y envían `nosniff`, bloqueo
de iframes, política de referer y desactivación de cámara, micrófono y ubicación.
No existe CORS global ni rewrite a Functions/Cloud Run. Durante esta fase de
desarrollo se aplica `no-store` a todo el contenido para evitar builds obsoletos;
la caché de assets con hash se optimizará cuando React y Astro generen sus builds.

Una Content Security Policy estricta se definirá después de construir React y
Astro y de auditar el runtime generado por Flutter; anticiparla ahora podría
romper el arranque sin representar la aplicación final.

## Sitios cloud diferidos

`firebase/hosting-policy.json` registra nombres propuestos para dev y prod, pero
`.firebaserc` solo asocia targets del proyecto ficticio. Los sitios reales deben
crearse y asociarse recién en la Etapa 47, después de listar los existentes y
confirmar nombres globalmente disponibles. En ese momento se ejecutarán comandos
explícitos con `--project dev` y luego, tras validar, con `--project prod`.

No ejecutar todavía `firebase deploy`, `hosting:sites:create` ni `target:apply`
contra los proyectos reales. Publicar contenido estático y desplegar Functions
son operaciones separadas; esta configuración no despliega el backend.

## Criterio de aceptación

- [x] Tres destinos Hosting declarados y aislados.
- [x] Cliente Flutter se construye automáticamente.
- [x] Panel y landing tienen páginas provisionales versionadas.
- [x] Rutas profundas de cliente y panel funcionan.
- [x] Landing conserva una respuesta 404 real.
- [x] Seis pruebas estáticas de configuración pasan.
- [x] Smoke test de los tres destinos pasa en emuladores.
- [x] No se creó ni modificó ningún recurso cloud.

## Commit sugerido

`chore(hosting): configure three local sites and route checks`

## Fuentes oficiales

- [Compartir recursos entre varios sitios](https://firebase.google.com/docs/hosting/multisites).
- [Probar aplicaciones con el emulador Hosting](https://firebase.google.com/docs/emulator-suite/use_hosting).
- [Configurar rewrites y encabezados](https://firebase.google.com/docs/hosting/full-config).
