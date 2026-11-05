# Etapa 53 — Persistencia Firebase y QR reales para la presentación

Estado: **completa y publicada en desarrollo**.

Esta etapa reemplaza la memoria temporal de la demo pública por datos reales en
`mesaflow-desarrollo`. No usa Cloud Functions, Blaze ni una tarjeta: el modo
`academic` trabaja con Firebase Authentication, Firestore y reglas dedicadas al
tenant académico. `mesaflow-produccion` no fue modificado.

## Direcciones publicadas

- Cliente/PWA: `https://mesaflow-desarrollo.web.app`
- Panel: `https://mesaflow-desarrollo-admin.web.app`
- Mesas: `https://mesaflow-desarrollo-admin.web.app/operacion/mesas`
- Pedidos: `https://mesaflow-desarrollo-admin.web.app/operacion/pedidos`

El acceso del panel y los enlaces con token no se guardan en Git. Están en:

- `dist/academic-firebase/acceso-panel.txt`
- `dist/academic-firebase/enlaces-qr.txt`
- `dist/academic-firebase/mesa-01.png` a `mesa-03.png`

## Comportamiento comprobado

1. Cada QR contiene establecimiento, mesa y un token aleatorio de 256 bits.
2. Firestore conserva solamente SHA-256 del token; no guarda el token original.
3. Authentication crea una identidad anónima para el comensal.
4. Las reglas vinculan esa identidad a mesa, sesión, versión y hash del QR.
5. Cliente y panel escuchan las mismas colecciones cloud en tiempo real.
6. Un pedido enviado desde el QR aparece en el panel y actualiza el consumo.
7. Rotar un QR invalida el anterior y corta inmediatamente las lecturas y
   escrituras de participantes unidos con la versión anterior.
8. Desactivar una mesa bloquea su QR; activarla vuelve a habilitar el QR vigente.

## Prueba manual para la presentación

1. Abrí `dist/academic-firebase/mesa-01.png` en otra pantalla o imprimilo.
2. Escanealo con la cámara del teléfono.
3. Verificá que se muestre **Mesa 1** y el menú.
4. Agregá un producto y tocá **Enviar pedido**.
5. Iniciá sesión en el panel con `dist/academic-firebase/acceso-panel.txt`.
6. Abrí **Operación → Pedidos** y comprobá el pedido nuevo.
7. Abrí **Operación → Mesas**, rotá el QR de Mesa 1 e imprimí/guardá el nuevo.
8. Intentá abrir la imagen vieja: debe indicar que el QR ya no es válido.
9. Escaneá el nuevo QR: debe abrir la misma mesa con la versión vigente.

## APK Android

La APK conectada al mismo Firebase está en:

`dist/MesaFlow-Academica-Firebase.apk`

SHA-256:

`A35AEB0F39F3236F560830C6BA685ECD5AA943099BD83D755B7029ED634D22F5`

El dominio publica `/.well-known/assetlinks.json`, por lo que Android puede
asociar los enlaces de mesa con `com.mesaflow.demo`. En iPhone el mismo QR abre
la PWA en Safari, sin instalar una IPA.

## Controles automatizados

```powershell
npm.cmd run academic:smoke:cloud
npm.cmd run academic:smoke:hosting
npm.cmd run academic:smoke:revocation
```

El último comando rota Mesa 1 y actualiza su PNG/enlace local. Todos están
limitados a `mesaflow-desarrollo`; producción no participa.
