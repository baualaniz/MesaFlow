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
import {
  parseAdminAssistanceRequest,
  type AdminAssistanceRequest
} from "./assistance-model";

export function subscribeOperationalAssistance(
  establishmentId: string,
  onRequests: (requests: readonly AdminAssistanceRequest[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const reference = collection(
    adminFirestore,
    "establishments",
    establishmentId,
    "assistanceRequests"
  );
  const assistanceQuery = query(
    reference,
    where("status", "in", ["pending", "acknowledged"]),
    orderBy("createdAt", "asc"),
    limit(100)
  );
  return onSnapshot(assistanceQuery, (snapshot) => {
    try {
      onRequests(Object.freeze(snapshot.docs.map((document) =>
        parseAdminAssistanceRequest(document.id, document.data(), establishmentId)
      )));
    } catch (error) {
      onError(error instanceof Error ? error : new Error("Solicitud inválida."));
    }
  }, (error) => onError(error));
}
