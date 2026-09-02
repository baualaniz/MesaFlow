# Contribuir a MesaFlow

## Flujo de trabajo

El MVP usa un flujo deliberadamente simple:

1. `main` debe permanecer ejecutable y representa el estado integrable.
2. Cada cambio se desarrolla en una rama corta creada desde `main`.
3. La rama se valida localmente antes de integrarla.
4. Para trabajo individual se puede integrar mediante pull request o merge local;
   para colaboración, se requiere pull request.
5. Los despliegues de producción se etiquetan como `v0.x.y` durante el MVP.

El repositorio es público. No se deben incluir datos reales de clientes,
credenciales, capturas con información privada ni exportaciones de producción en
issues, pull requests, commits o fixtures.

Nombres recomendados de ramas:

- `feat/customer-menu`
- `feat/admin-orders`
- `fix/payment-idempotency`
- `docs/firebase-setup`

No se mantendrán ramas permanentes `develop`, `release` o `staging`: los ambientes
Firebase son proyectos separados y el pipeline seleccionará el destino.

## Commits

Se utilizan mensajes Conventional Commits:

```text
feat(customer): add table session exchange
fix(functions): reject invalid order transitions
test(rules): prevent cross-tenant reads
docs(deploy): document production smoke test
chore(repo): update workspace tooling
```

Tipos aceptados: `feat`, `fix`, `test`, `docs`, `refactor`, `perf`, `build`,
`ci` y `chore`. El scope identifica el módulo cuando aporta claridad.

## Validación previa

Desde la raíz:

```powershell
npm run check
```

Cuando existan las aplicaciones, el comando se ampliará para invocar sus
validaciones. No se deben integrar secretos, archivos `.env`, cuentas de servicio,
salidas de build ni datos exportados de Firebase.

## Revisión

Cada cambio debe confirmar:

- que las rutas y nombres coincidan con la arquitectura documentada;
- que no reduzca el aislamiento multiestablecimiento;
- que las operaciones privilegiadas sigan detrás de reglas o backend;
- que incluya pruebas proporcionales al riesgo;
- que actualice la documentación cuando cambie una decisión.
