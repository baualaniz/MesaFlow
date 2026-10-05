# Etapa 28 — Mercado Pago de prueba y secretos

## Estado

Etapa completa. El usuario creó **MesaFlow Desarrollo**, guardó su **Access Token
de prueba** exclusivamente en `functions/.secret.local` y el verificador confirmó
una identidad de vendedor de prueba argentino. Producción continúa deshabilitada
y ningún dato de la cuenta ni credencial ingresó a Git.

## Decisión para el MVP

MesaFlow usará **Checkout Pro vía Preferences API**, país Argentina y credenciales
de prueba. El checkout queda alojado por Mercado Pago; la credencial privada solo
será consumida por Functions en la Etapa 29.

Para la demostración se usa un único vendedor de prueba. Esto permite probar el
recorrido de un restaurante sin dinero ni tarjetas reales. No representa todavía
el modelo financiero de un SaaS multiestablecimiento en producción: si cada
restaurante debe cobrar en su propia cuenta, se implementará OAuth por
establecimiento antes de salir a producción. Un token global nunca deberá cobrar
por múltiples comercios reales.

## Acción manual: crear la aplicación

1. Entrá a [Tus integraciones](https://www.mercadopago.com.ar/developers/panel/app)
   con tu cuenta de Mercado Pago.
2. Elegí **Crear aplicación**.
3. Usá el nombre **MesaFlow Desarrollo**.
4. Seleccioná **Pagos online** y **Checkout Pro**. Para este MVP de demostración,
   elegí el modelo que cobra en tu propia cuenta; no Marketplace.
5. Aceptá únicamente los términos necesarios para crear la aplicación.
6. Abrí **Pruebas → Credenciales de prueba** y copiá el **Access Token**. No uses
   Credenciales de producción, Client Secret ni Public Key en esta etapa.

Las credenciales de prueba se generan con la aplicación y no requieren activar
producción. El Access Token de prueba comienza con `APP_USR`, igual que uno de
producción; por eso es importante copiarlo específicamente desde la sección
**Pruebas**.

## Acción manual: guardarlo sin exponerlo

Desde la raíz del repositorio, ejecutá:

```powershell
Copy-Item functions/.secret.local.example functions/.secret.local
notepad functions/.secret.local
```

En el Bloc de notas reemplazá únicamente el valor de
`MERCADO_PAGO_ACCESS_TOKEN`. Conservá los demás placeholders y guardá el archivo.

No pegues el token en este chat, GitHub, capturas, documentación ni comandos de
PowerShell. El archivo real está protegido por `.gitignore`.

Luego ejecutá:

```powershell
npm.cmd run mercado-pago:check
```

El verificador:

- confirma que el archivo está ignorado por Git;
- exige un token con formato de Access Token;
- realiza solamente una consulta autenticada de identidad;
- comprueba que sea un usuario de prueba del sitio argentino;
- nunca imprime el token, el ID, el correo ni el nombre de la cuenta.

La salida correcta contiene tres líneas `[OK]`. Si falla, solo muestra una causa
sanitizada.

## Sin tarjeta y sin facturación Firebase

Esta etapa no necesita una tarjeta bancaria real. Mercado Pago proporciona
cuentas y tarjetas de prueba para simular los resultados. Tampoco se crea todavía
un secreto en Google Secret Manager ni se despliegan Functions, así que no exige
activar Blaze. El token permanece local hasta que el usuario decida publicar el
backend en una etapa posterior.

## Seguridad

- Solo se necesita el Access Token; la Public Key no se usará para crear la
  preferencia en el backend.
- `MERCADO_PAGO_WEBHOOK_SECRET` queda como placeholder hasta la Etapa 30.
- Producción permanece deshabilitada en `firebase/mercado-pago-policy.json`.
- La Function futura recibirá únicamente `MERCADO_PAGO_ACCESS_TOKEN` mediante su
  binding explícito.
- Si el token se expone, debe renovarse inmediatamente desde Mercado Pago.

## Verificación local

```powershell
npm.cmd run test:mercado-pago-config
npm.cmd run secrets:check
npm.cmd run check
```

Resultados de cierre:

- 5 pruebas específicas de configuración aprobadas;
- 113 pruebas generales del repositorio aprobadas;
- Access Token validado mediante una consulta de identidad de solo lectura;
- vendedor de prueba argentino confirmado sin imprimir datos de la cuenta;
- archivo local confirmado como ignorado por Git;
- producción, Secret Manager y facturación Firebase sin activar.

## Criterios de aceptación

- [x] Checkout Pro, Preferences API, Argentina y modo test están fijados.
- [x] Producción y tarjetas reales permanecen fuera de alcance.
- [x] El secreto ya está declarado para la Function futura.
- [x] Existe un verificador que no filtra identidad ni credenciales.
- [x] El modelo demo y la futura evolución OAuth están documentados.
- [x] La aplicación **MesaFlow Desarrollo** fue creada por el usuario.
- [x] El Access Token de prueba está en el archivo local ignorado.
- [x] La identidad de vendedor de prueba fue validada correctamente.

## Próximo paso

La Etapa 29 implementará la creación idempotente de preferencias de Checkout Pro,
las URLs de retorno y la apertura segura del checkout. Un retorno del navegador
no marcará un pago como aprobado: la confirmación autoritativa quedará reservada
al webhook verificado de la Etapa 30.

## Fuentes oficiales

- [Crear una aplicación y acceder a credenciales de prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/create-application?scope=prod).
- [Tipos y seguridad de credenciales](https://www.mercadopago.com.ar/developers/es/docs/credentials).
- [Cuentas de prueba de Checkout Pro](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-preferences/test-accounts).
- [Compras con tarjetas de prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/integration-test/test-purchase-with-card?scope=prod).
