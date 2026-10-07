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
  parseAdminTable,
  parseAdminTableSession,
  type AdminTable,
  type AdminTableSession
} from "./table-model";

export interface TableFeed {
  readonly tables: readonly AdminTable[];
  readonly sessions: ReadonlyMap<string, AdminTableSession>;
}

export function subscribeTables(
  establishmentId: string,
  onData: (feed: TableFeed) => void,
  onError: (error: Error) => void
): Unsubscribe {
  let tables: readonly AdminTable[] | null = null;
  let sessions: ReadonlyMap<string, AdminTableSession> | null = null;
  const emit = () => {
    if (tables !== null && sessions !== null) onData(Object.freeze({ tables, sessions }));
  };
  const tablesQuery = query(
    collection(adminFirestore, "establishments", establishmentId, "tables"),
    orderBy("number", "asc"),
    limit(100)
  );
  const sessionsQuery = query(
    collection(adminFirestore, "establishments", establishmentId, "tableSessions"),
    where("status", "in", ["open", "payment_pending", "paid"]),
    limit(100)
  );
  const unsubscribeTables = onSnapshot(tablesQuery, (snapshot) => {
    try {
      tables = Object.freeze(snapshot.docs.map((document) =>
        parseAdminTable(document.id, document.data(), establishmentId)));
      emit();
    } catch (error) {
      onError(error instanceof Error ? error : new Error("Mesa inválida."));
    }
  }, onError);
  const unsubscribeSessions = onSnapshot(sessionsQuery, (snapshot) => {
    try {
      sessions = new Map(snapshot.docs.map((document) => {
        const session = parseAdminTableSession(document.id, document.data(), establishmentId);
        return [session.id, session];
      }));
      emit();
    } catch (error) {
      onError(error instanceof Error ? error : new Error("Sesión inválida."));
    }
  }, onError);
  return () => {
    unsubscribeTables();
    unsubscribeSessions();
  };
}
