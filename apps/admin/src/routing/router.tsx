import {
  Outlet,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect
} from "@tanstack/react-router";

import type { AuthContextValue } from "../auth/auth-context";
import { AdminShell } from "../layouts/admin-shell";
import { DashboardPage } from "../pages/dashboard-page";
import { LoginPage } from "../pages/login-page";
import { OrdersPage } from "../pages/orders-page";
import { CatalogPage } from "../pages/catalog-page";
import { TablesPage } from "../pages/tables-page";
import { ResetPasswordPage } from "../pages/reset-password-page";
import { canAccess } from "../tenant/access-control";
import type { TenantContextValue } from "../tenant/tenant-context";
import { loginRedirectFor, safeInternalRedirect } from "./guards";

interface RouterContext {
  readonly auth: AuthContextValue;
  readonly tenant: TenantContextValue;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Outlet
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: safeInternalRedirect(search.redirect)
  }),
  beforeLoad: ({ context }) => {
    if (context.auth.user !== null) throw redirect({ to: "/" });
  },
  component: LoginPage
});

const resetRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/recuperar-clave",
  beforeLoad: ({ context }) => {
    if (context.auth.user !== null) throw redirect({ to: "/" });
  },
  component: ResetPasswordPage
});

const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "_authenticated",
  beforeLoad: ({ context, location }) => {
    const destination = loginRedirectFor(context.auth.user !== null, location.pathname);
    if (destination !== null) throw redirect(destination);
  },
  component: AdminShell
});

const dashboardRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/",
  component: DashboardPage
});

const ordersRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/operacion/pedidos",
  beforeLoad: ({ context }) => {
    const membership = context.tenant.activeAccess?.membership;
    if (membership === undefined || !canAccess(membership, "orders.view")) {
      throw redirect({ to: "/" });
    }
  },
  component: OrdersPage
});

const tablesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/operacion/mesas",
  beforeLoad: ({ context }) => {
    const membership = context.tenant.activeAccess?.membership;
    if (membership === undefined || !canAccess(membership, "tables.view")) {
      throw redirect({ to: "/" });
    }
  },
  component: TablesPage
});

const catalogRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/catalogo",
  beforeLoad: ({ context }) => {
    const membership = context.tenant.activeAccess?.membership;
    if (membership === undefined || !canAccess(membership, "menu.view")) {
      throw redirect({ to: "/" });
    }
  },
  component: CatalogPage
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  resetRoute,
  authenticatedRoute.addChildren([dashboardRoute, ordersRoute, tablesRoute, catalogRoute])
]);

export const router = createRouter({
  routeTree,
  context: { auth: undefined as never, tenant: undefined as never },
  defaultPreload: "intent"
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
