import { RouterProvider } from "@tanstack/react-router";

import { useAuth } from "./auth/auth-context";
import { LoadingScreen } from "./components/loading-screen";
import { TenantAccessPage } from "./pages/tenant-access-page";
import { router } from "./routing/router";
import { useTenant } from "./tenant/tenant-context";

export function App() {
  const auth = useAuth();
  const tenant = useTenant();
  if (auth.loading || (auth.user !== null && tenant.status === "loading")) {
    return <LoadingScreen />;
  }
  if (auth.user !== null && (tenant.status === "empty" || tenant.status === "error")) {
    return <TenantAccessPage />;
  }
  return <RouterProvider router={router} context={{ auth, tenant }} />;
}
