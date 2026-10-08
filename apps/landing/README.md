# Landing MesaFlow

Sitio comercial estático y responsive construido con Astro. Presenta la propuesta
de MesaFlow, su funcionamiento, beneficios, funcionalidades, planes y accesos a
la experiencia del cliente y al panel administrativo.

## Comandos

Desde la raíz del repositorio:

```powershell
npm.cmd run dev --workspace @mesaflow/landing
npm.cmd run check --workspace @mesaflow/landing
```

El servidor de desarrollo queda en `http://127.0.0.1:4321`. El build estático se
genera en `hosting/`, que Firebase Hosting sirve como un destino independiente.
Las fuentes y la fotografía gastronómica se reutilizan desde los recursos locales
de la aplicación cliente; el build no depende de recursos visuales remotos.
