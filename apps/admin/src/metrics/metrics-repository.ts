import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe
} from "firebase/firestore";

import { adminFirestore } from "../firebase/firebase";
import { parseAdminDailyMetric, type AdminDailyMetric } from "./metrics-model";

export function subscribeRecentMetrics(
  establishmentId: string,
  onMetrics: (metrics: readonly AdminDailyMetric[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const reference = collection(
    adminFirestore,
    "establishments",
    establishmentId,
    "dailyMetrics"
  );
  const metricsQuery = query(reference, orderBy("date", "desc"), limit(7));
  return onSnapshot(metricsQuery, (snapshot) => {
    try {
      onMetrics(Object.freeze(snapshot.docs.map((document) =>
        parseAdminDailyMetric(document.id, document.data(), establishmentId)
      )));
    } catch (error) {
      onError(error instanceof Error ? error : new Error("Métrica inválida."));
    }
  }, (error) => onError(error));
}
