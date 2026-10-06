import { RouterProvider } from "@tanstack/react-router";

import { useAuth } from "./auth/auth-context";
import { LoadingScreen } from "./components/loading-screen";
import { router } from "./routing/router";

export function App() {
  const auth = useAuth();
  if (auth.loading) return <LoadingScreen />;
  return <RouterProvider router={router} context={{ auth }} />;
}
