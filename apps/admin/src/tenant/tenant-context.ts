import { createContext, useContext } from "react";

import type { TenantAccess } from "./tenant-model";

export type TenantStatus = "idle" | "loading" | "ready" | "empty" | "error";

export interface TenantContextValue {
  readonly status: TenantStatus;
  readonly accesses: readonly TenantAccess[];
  readonly activeAccess: TenantAccess | null;
  selectEstablishment(establishmentId: string): void;
  reload(): Promise<void>;
}

export const TenantContext = createContext<TenantContextValue | null>(null);

export function useTenant(): TenantContextValue {
  const value = useContext(TenantContext);
  if (value === null) throw new Error("TenantProvider no está disponible.");
  return value;
}

export function useActiveTenant(): TenantAccess {
  const { activeAccess } = useTenant();
  if (activeAccess === null) throw new Error("No hay un establecimiento activo.");
  return activeAccess;
}
