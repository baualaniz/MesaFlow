import { useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../auth/auth-context";
import { TenantContext, type TenantContextValue } from "./tenant-context";
import { chooseTenantAccess } from "./tenant-model";
import { loadTenantAccesses } from "./tenant-repository";

const STORAGE_PREFIX = "mesaflow.admin.active-establishment.v1";

function storageKey(uid: string): string {
  return `${STORAGE_PREFIX}:${uid}`;
}

export function TenantProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [selection, setSelection] = useState<{
    readonly uid: string;
    readonly establishmentId: string;
  } | null>(null);
  const uid = user?.uid ?? null;
  const query = useQuery({
    enabled: uid !== null,
    queryFn: () => loadTenantAccesses(uid as string),
    queryKey: ["admin", "tenant-accesses", uid],
    retry: 1,
    staleTime: 60_000
  });

  const accesses = query.data ?? Object.freeze([]);
  const preferredId = selection?.uid === uid
    ? selection.establishmentId
    : uid === null
      ? null
      : window.localStorage.getItem(storageKey(uid));
  const activeAccess = chooseTenantAccess(accesses, preferredId);

  useEffect(() => {
    if (uid !== null && activeAccess !== null) {
      window.localStorage.setItem(storageKey(uid), activeAccess.establishment.id);
    }
  }, [activeAccess, uid]);

  const value = useMemo<TenantContextValue>(() => ({
    accesses,
    activeAccess,
    status: uid === null
      ? "idle"
      : query.isPending
        ? "loading"
        : query.isError
          ? "error"
          : activeAccess === null
            ? "empty"
            : "ready",
    selectEstablishment(establishmentId) {
      if (!accesses.some((access) => access.establishment.id === establishmentId)) {
        throw new TypeError("El establecimiento seleccionado no pertenece a la cuenta.");
      }
      setSelection({ uid: uid as string, establishmentId });
    },
    async reload() {
      await query.refetch();
    }
  }), [accesses, activeAccess, query, uid]);

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}
