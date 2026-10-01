import type {
  CollectionReference,
  Firestore,
  FirestoreDataConverter,
  Query
} from "firebase-admin/firestore";

import {
  TENANT_COLLECTIONS,
  assertDocumentId,
  tenantCollectionPath,
  type TenantCollection
} from "@mesaflow/contracts/firestore";
import {
  ORDER_STATUSES,
  type OrderContract,
  type OrderStatus,
  type ProductContract
} from "@mesaflow/contracts";

import { orderConverter, productConverter } from "./firestore-converters.js";

export interface TenantOwned {
  readonly establishmentId: string;
}

export interface TenantDocument<T> {
  readonly id: string;
  readonly data: T;
}

export function assertTenantOwnership<T extends TenantOwned>(
  expectedEstablishmentId: string,
  value: T
): T {
  assertDocumentId(expectedEstablishmentId, "establishmentId");
  if (value.establishmentId !== expectedEstablishmentId) {
    throw new TypeError("El documento no pertenece al tenant del repositorio.");
  }
  return value;
}

export class TenantRepository<T extends TenantOwned> {
  protected readonly collection: CollectionReference<T>;

  constructor(
    firestore: Firestore,
    readonly establishmentId: string,
    collection: TenantCollection,
    converter: FirestoreDataConverter<T>
  ) {
    assertDocumentId(establishmentId, "establishmentId");
    this.collection = firestore
      .collection(tenantCollectionPath(establishmentId, collection))
      .withConverter(converter);
  }

  async create(id: string, value: T): Promise<TenantDocument<T>> {
    const documentId = assertDocumentId(id);
    const owned = assertTenantOwnership(this.establishmentId, value);
    await this.collection.doc(documentId).create(owned);
    return Object.freeze({ id: documentId, data: owned });
  }

  async get(id: string): Promise<TenantDocument<T> | null> {
    const documentId = assertDocumentId(id);
    const snapshot = await this.collection.doc(documentId).get();
    if (!snapshot.exists) return null;
    const data = snapshot.data();
    if (!data) throw new TypeError("Firestore devolvió un documento sin datos.");
    return Object.freeze({
      id: snapshot.id,
      data: assertTenantOwnership(this.establishmentId, data)
    });
  }

  async replace(id: string, value: T): Promise<TenantDocument<T>> {
    const documentId = assertDocumentId(id);
    const owned = assertTenantOwnership(this.establishmentId, value);
    await this.collection.doc(documentId).set(owned);
    return Object.freeze({ id: documentId, data: owned });
  }

  async list(): Promise<readonly TenantDocument<T>[]> {
    return this.collect(this.collection);
  }

  protected async collect(query: Query<T>): Promise<readonly TenantDocument<T>[]> {
    const snapshot = await query.get();
    return Object.freeze(snapshot.docs.map((document) => {
      const data = assertTenantOwnership(this.establishmentId, document.data());
      return Object.freeze({ id: document.id, data });
    }));
  }

  async remove(id: string): Promise<void> {
    await this.collection.doc(assertDocumentId(id)).delete();
  }
}

export class ProductRepository extends TenantRepository<ProductContract> {
  constructor(firestore: Firestore, establishmentId: string) {
    super(
      firestore,
      establishmentId,
      TENANT_COLLECTIONS.products,
      productConverter
    );
  }

  async listPublishedByCategory(
    categoryId: string
  ): Promise<readonly TenantDocument<ProductContract>[]> {
    return this.collect(
      this.collection
        .where("categoryId", "==", assertDocumentId(categoryId, "categoryId"))
        .where("active", "==", true)
        .where("available", "==", true)
        .orderBy("sortOrder", "asc")
    );
  }
}

export class OrderRepository extends TenantRepository<OrderContract> {
  constructor(firestore: Firestore, establishmentId: string) {
    super(
      firestore,
      establishmentId,
      TENANT_COLLECTIONS.orders,
      orderConverter
    );
  }

  async listOperational(
    statuses: readonly OrderStatus[]
  ): Promise<readonly TenantDocument<OrderContract>[]> {
    const uniqueStatuses = [...new Set(statuses)];
    if (uniqueStatuses.length === 0 || uniqueStatuses.length !== statuses.length ||
        uniqueStatuses.some((status) => !ORDER_STATUSES.includes(status))) {
      throw new TypeError("statuses debe contener estados únicos y válidos.");
    }
    return this.collect(
      this.collection
        .where("status", "in", uniqueStatuses)
        .orderBy("createdAt", "asc")
    );
  }

  async listBySession(
    sessionId: string
  ): Promise<readonly TenantDocument<OrderContract>[]> {
    return this.collect(
      this.collection
        .where("sessionId", "==", assertDocumentId(sessionId, "sessionId"))
        .orderBy("createdAt", "asc")
    );
  }

  async listRecentByTable(
    tableId: string,
    resultLimit = 50
  ): Promise<readonly TenantDocument<OrderContract>[]> {
    if (!Number.isSafeInteger(resultLimit) || resultLimit < 1 || resultLimit > 100) {
      throw new TypeError("resultLimit debe ser un entero entre 1 y 100.");
    }
    return this.collect(
      this.collection
        .where("tableId", "==", assertDocumentId(tableId, "tableId"))
        .orderBy("createdAt", "desc")
        .limit(resultLimit)
    );
  }
}
