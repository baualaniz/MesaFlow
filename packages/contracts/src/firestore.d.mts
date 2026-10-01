export const FIRESTORE_DATABASE_ID: "(default)";
export const FIRESTORE_LOCATION_ID: "southamerica-east1";

export const ROOT_COLLECTIONS: Readonly<{
  users: "users";
  establishmentSlugs: "establishmentSlugs";
  establishments: "establishments";
  webhookEvents: "webhookEvents";
}>;

export const TENANT_COLLECTIONS: Readonly<{
  members: "members";
  tables: "tables";
  tableSessions: "tableSessions";
  participants: "participants";
  categories: "categories";
  products: "products";
  orders: "orders";
  assistanceRequests: "assistanceRequests";
  payments: "payments";
  dailyMetrics: "dailyMetrics";
  settings: "settings";
  qrExchanges: "qrExchanges";
  auditLogs: "auditLogs";
}>;

export type TenantCollection = Exclude<
  typeof TENANT_COLLECTIONS[keyof typeof TENANT_COLLECTIONS],
  "participants"
>;

export function assertDocumentId(value: unknown, label?: string): string;
export function assertSlug(value: unknown): string;
export function tenantCollectionPath(
  establishmentId: string,
  collection: TenantCollection,
): string;
export function tenantDocumentPath(
  establishmentId: string,
  collection: TenantCollection,
  documentId: string,
): string;
export function participantDocumentPath(
  establishmentId: string,
  sessionId: string,
  uid: string,
): string;
export function isFirestoreTimestamp(value: unknown): boolean;

export interface EstablishmentDocument {
  readonly name: string;
  readonly slug: string;
  readonly timezone: string;
  readonly currency: string;
  readonly active: boolean;
  readonly createdAt: unknown;
  readonly updatedAt: unknown;
}

export function parseEstablishment(value: unknown): Readonly<EstablishmentDocument>;
export const establishmentConverter: Readonly<{
  toFirestore(value: unknown): Readonly<EstablishmentDocument>;
  fromFirestore(
    snapshot: { data(options?: unknown): unknown },
    options?: unknown,
  ): Readonly<EstablishmentDocument>;
}>;
