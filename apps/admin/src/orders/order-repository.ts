import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type Unsubscribe
} from "firebase/firestore";

import { adminFirestore } from "../firebase/firebase";
import type { AdminRole } from "../tenant/tenant-model";
import { parseAdminOrder, type AdminOrder } from "./order-model";
import { visibleOperationalStatuses } from "./order-visibility";

export function subscribeOperationalOrders(
  establishmentId: string,
  role: AdminRole,
  onOrders: (orders: readonly AdminOrder[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const reference = collection(adminFirestore, "establishments", establishmentId, "orders");
  const ordersQuery = query(
    reference,
    where("status", "in", [...visibleOperationalStatuses(role)]),
    orderBy("createdAt", "asc"),
    limit(100)
  );
  return onSnapshot(ordersQuery, (snapshot) => {
    try {
      onOrders(Object.freeze(snapshot.docs.map((document) =>
        parseAdminOrder(document.id, document.data(), establishmentId)
      )));
    } catch (error) {
      onError(error instanceof Error ? error : new Error("Pedido inválido."));
    }
  }, (error) => onError(error));
}
