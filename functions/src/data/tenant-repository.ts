import type {
  CollectionReference,
  Firestore,
  FirestoreDataConverter
} from "firebase-admin/firestore";

import {
  TENANT_COLLECTIONS,
  assertDocumentId,
  tenantCollectionPath,
  type TenantCollection
} from "@mesaflow/contracts/firestore";
import type { OrderContract, ProductContract } from "@mesaflow/contracts";

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
    const snapshot = await this.collection.get();
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
}
