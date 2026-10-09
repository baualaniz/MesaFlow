# Etapa 45 — Seguridad y endurecimiento

Estado: **completa localmente**. Se modelaron amenazas y se agregaron controles
automáticos para autorización, abuso, navegador, endpoints, dependencias y logs.
No se desplegó ni modificó ningún recurso cloud.

## Hallazgos corregidos

1. Las nueve callables declaraban `enforceAppCheck: false`. Ahora usan una opción
   central que exige App Check fuera del emulador y solo permite el bypass cuando
   Firebase fija `FUNCTIONS_EMULATOR=true`.
2. Las callables registraban objetos `Error` completos. El log interno conserva
   únicamente un `errorName` validado; mensaje, stack, payload y posibles tokens
   no se serializan.
3. El JSON-LD de Astro usaba `set:html` con `JSON.stringify` directo. Todo `<` se
   neutraliza como `\u003c`, evitando que una futura configuración cierre el
   elemento `script`.
4. Los tres sitios ahora publican una Content-Security-Policy específica además
   de las protecciones contra MIME sniffing, framing, referrer y permisos. El
   build Flutter usa `--csp --no-web-resources-cdn`, evitando código dinámico y
   empaquetando CanvasKit y el fallback Roboto en el mismo origen. Solo permite
   los hashes exactos de los inicializadores generados. FlutterFire
   carga sus módulos Firebase versionados desde `www.gstatic.com`, único origen
   externo de scripts permitido para el cliente.
5. Se añadieron pruebas para impedir listados de tenants, consultas globales y
   participants forjados bajo otra ruta.

## Verificación automatizada

La política versionada vive en `firebase/security-policy.json`. Ocho pruebas
locales comprueban que:

- todas las callables comparten el control App Check;
- no vuelvan los logs crudos ni sinks frontend ejecutables;
- CSP esté presente y no use un `default-src *`;
- health y webhook mantengan CORS cerrado y métodos limitados;
- Firestore y Storage terminen en denegación por defecto;
- el único aviso dev aceptado conserve su cadena exacta.

El backend suma tres pruebas de App Check y redacción. La landing suma una prueba
de neutralización JSON-LD. Las reglas Firestore pasan de 16 a 18 escenarios y
Storage conserva nueve.

## Dependencias

Firebase CLI se actualizó al último parche comprobado, 15.33.0. La auditoría de
dependencias de producción devuelve **0 vulnerabilidades**. La auditoría completa
mantiene tres entradas que representan una sola causa: `GHSA-vfj7-8cjw-p6xm` en
`firebase-tools → chokidar → braces`.

No existe una versión corregida de `braces` ni una actualización compatible
propuesta por npm. El paquete se ejecuta únicamente como herramienta local, no se
empaqueta en Functions ni en las aplicaciones, y no recibe patrones de usuarios.
El riesgo queda aceptado y allowlisted de forma exacta; cualquier aviso nuevo
hace fallar el control.

## Comandos

Controles locales sin red:

```powershell
npm.cmd run test:security
npm.cmd run check
```

Auditoría contra el registro npm:

```powershell
npm.cmd run security:audit
```

Recorrido completo con reglas y navegador:

```powershell
npm.cmd run test:e2e
```

## Condición previa al despliegue

App Check ya es obligatorio en Functions cloud, pero los clientes todavía no
tienen una clave pública de reCAPTCHA porque no hay sitios desplegados. Antes de
la Etapa 47 se deberán registrar las apps Web en Firebase App Check, configurar
las claves públicas en ambos builds y verificar sus métricas. Desplegar Functions
sin completar ese paso dejaría las callables correctamente cerradas, pero los
clientes no podrían utilizarlas.

## Criterio de cierre

- threat model versionado y riesgos residuales explícitos;
- ningún hallazgo crítico o alto sin analizar en código de aplicación/runtime;
- dependencias de producción sin vulnerabilidades conocidas;
- App Check cloud, CSP, CORS, XSS y logs cubiertos por pruebas;
- aislamiento de Firestore y Storage reforzado en Emulator Suite;
- aviso alto dev sin parche acotado, aceptado y vigilado automáticamente.

La Etapa 46 continuará con integración continua en GitHub Actions.
