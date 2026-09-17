# Etapa 9 — configuración y secretos

## Objetivo

Separar identificadores públicos, parámetros exclusivos del backend y credenciales
reales; preparar Secret Manager y el emulador con mínimo privilegio sin crear
secretos cloud, aceptar costos ni pedir valores privados al usuario.

## Clasificación aplicada

| Clase | Archivo versionado | Mecanismo futuro |
|---|---|---|
| Pública frontend | `.env.example` | Configuración web/Flutter por ambiente |
| Backend no secreta | `functions/.env.example` | `defineString` y `.env.local` ignorado |
| Secreta | `functions/.secret.local.example` contiene solo placeholders | `defineSecret`, Secret Manager y `.secret.local` ignorado |

La lista canónica está en `firebase/secrets-policy.json`. Incluye cuatro secretos:

- `MERCADO_PAGO_ACCESS_TOKEN`.
- `MERCADO_PAGO_WEBHOOK_SECRET`.
- `WHATSAPP_ACCESS_TOKEN`.
- `WHATSAPP_VERIFY_TOKEN`.

`WHATSAPP_PHONE_NUMBER_ID` es un identificador privado del backend, no una
credencial. Ninguno de estos valores se necesita todavía.

## Mínimo privilegio

`functions/src/config/runtime.ts` declara parámetros pero no llama `.value()`.
Cada integración futura deberá vincular únicamente sus secretos mediante la opción
`secrets` de la función. La matriz prevista es:

| Función futura | Acceso |
|---|---|
| Crear preferencia de pago | Access token de Mercado Pago |
| Webhook Mercado Pago | Access token y secreto de firma |
| Enviar asistencia por WhatsApp | Access token de WhatsApp |
| Verificar webhook WhatsApp | Verify token |
| `health` | Ninguno |

## Desarrollo local futuro

No copies ni completes archivos ahora. Cuando se implementen las integraciones de
prueba, se crearán archivos ignorados:

```powershell
Copy-Item functions/.env.example functions/.env.local
Copy-Item functions/.secret.local.example functions/.secret.local
```

Solo se usarán credenciales sandbox o de prueba y se reemplazarán los placeholders
localmente. No se compartirán por chat, commits, capturas ni logs. El emulador
reconoce oficialmente `.secret.local` y evita consultar secretos de producción.

## Secret Manager futuro

Crear versiones en Secret Manager puede implicar facturación, aunque el servicio
tenga una franquicia gratuita. Por eso `firebase functions:secrets:set` no se
ejecuta en esta etapa. Se hará solo cuando exista la cuenta del proveedor, el
usuario autorice Blaze y esté lista la función consumidora.

No se descargarán cuentas de servicio. En cloud, Firebase asigna la identidad
administrada y el despliegue concede acceso únicamente a las funciones que declaran
el secreto.

## Verificación

```powershell
npm.cmd run secrets:check
npm.cmd run test:secrets-config
npm.cmd run check
```

El verificador utiliza la lista de archivos versionados y no ignorados de Git. Un
`.secret.local` legítimo queda fuera de la revisión porque también queda fuera del
commit. Se rechazan archivos de credenciales, claves privadas y formatos conocidos
de tokens; los valores nunca se imprimen.

## Incidente de exposición

Si una credencial llega a Git, un log o una captura:

1. Revocar o rotar primero en el proveedor.
2. Revisar accesos y uso desde la última rotación.
3. Retirar el valor del código y del historial cuando corresponda.
4. Actualizar Secret Manager y redesplegar solo las funciones consumidoras.
5. Documentar el incidente sin copiar el secreto.

Eliminar únicamente el último commit no invalida una credencial expuesta.

## Criterio de aceptación

- [x] Frontend contiene solo nombres `PUBLIC_*` y placeholders.
- [x] Parámetros backend no secretos están separados.
- [x] Cuatro secretos están declarados con `defineSecret` sin leer valores.
- [x] `health` no recibe secretos.
- [x] `.secret.local`, dotenv reales, runtimeconfig y credenciales están ignorados.
- [x] Cuatro pruebas de política pasan.
- [x] El escaneo no encuentra valores sensibles versionables.
- [x] No se creó ningún secreto, recurso cloud ni costo.

## Commit sugerido

`chore(security): separate public config and backend secrets`

## Fuentes oficiales

- [Configuración y parámetros de Functions](https://firebase.google.com/docs/functions/config-env).
- [Referencia `defineSecret`](https://firebase.google.com/docs/reference/functions/2nd-gen/node/firebase-functions.params).
