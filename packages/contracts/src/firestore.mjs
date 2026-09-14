export const FIRESTORE_DATABASE_ID = "(default)";
export const FIRESTORE_LOCATION_ID = "southamerica-east1";

export const ROOT_COLLECTIONS = Object.freeze({
  users: "users",
  establishmentSlugs: "establishmentSlugs",
  establishments: "establishments",
  webhookEvents: "webhookEvents"
});

export const TENANT_COLLECTIONS = Object.freeze({
  members: "members",
  tables: "tables",
  tableSessions: "tableSessions",
  participants: "participants",
  categories: "categories",
  products: "products",
  orders: "orders",
  assistanceRequests: "assistanceRequests",
  payments: "payments",
  dailyMetrics: "dailyMetrics",
  settings: "settings",
  qrExchanges: "qrExchanges",
  auditLogs: "auditLogs"
});

const encoder = new TextEncoder();
const establishmentFields = Object.freeze([
  "name",
  "slug",
  "timezone",
  "currency",
  "active",
  "createdAt",
  "updatedAt"
]);

export function assertDocumentId(value, label = "documentId") {
  if (typeof value !== "string" || value.length === 0 || value === "." || value === ".." ||
      value.includes("/") || /^__.*__$/.test(value) || encoder.encode(value).length > 1500) {
    throw new TypeError(`${label} no es un ID de documento Firestore válido.`);
  }
  return value;
}

export function assertSlug(value) {
  if (typeof value !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) || value.length > 63) {
    throw new TypeError("slug debe usar minúsculas, números y guiones, sin superar 63 caracteres.");
  }
  return value;
}

export function tenantCollectionPath(establishmentId, collection) {
  assertDocumentId(establishmentId, "establishmentId");
  if (!Object.values(TENANT_COLLECTIONS).includes(collection) || collection === "participants") {
    throw new TypeError("Colección de tenant desconocida o anidada.");
  }
  return `${ROOT_COLLECTIONS.establishments}/${establishmentId}/${collection}`;
}

export function tenantDocumentPath(establishmentId, collection, documentId) {
  return `${tenantCollectionPath(establishmentId, collection)}/${assertDocumentId(documentId)}`;
}

export function participantDocumentPath(establishmentId, sessionId, uid) {
  return `${tenantDocumentPath(establishmentId, TENANT_COLLECTIONS.tableSessions, sessionId)}/${TENANT_COLLECTIONS.participants}/${assertDocumentId(uid, "uid")}`;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isTimestampLike(value) {
  return isPlainObject(value) && (
    typeof value.toDate === "function" ||
    (Number.isInteger(value.seconds) && Number.isInteger(value.nanoseconds))
  );
}

export function parseEstablishment(value) {
  if (!isPlainObject(value)) throw new TypeError("Establishment debe ser un objeto.");
  const keys = Object.keys(value).sort();
  const expected = [...establishmentFields].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new TypeError("Establishment contiene campos ausentes o desconocidos.");
  }
  if (typeof value.name !== "string" || value.name.trim().length < 2 || value.name.trim().length > 120) {
    throw new TypeError("name debe tener entre 2 y 120 caracteres.");
  }
  assertSlug(value.slug);
  try {
    new Intl.DateTimeFormat("es-AR", { timeZone: value.timezone }).format();
  } catch {
    throw new TypeError("timezone debe ser una zona IANA válida.");
  }
  if (typeof value.currency !== "string" || !/^[A-Z]{3}$/.test(value.currency)) {
    throw new TypeError("currency debe ser un código ISO 4217 de tres letras.");
  }
  if (typeof value.active !== "boolean") throw new TypeError("active debe ser booleano.");
  if (!isTimestampLike(value.createdAt) || !isTimestampLike(value.updatedAt)) {
    throw new TypeError("createdAt y updatedAt deben ser Timestamp.");
  }
  return Object.freeze({ ...value, name: value.name.trim() });
}

export const establishmentConverter = Object.freeze({
  toFirestore(value) {
    return parseEstablishment(value);
  },
  fromFirestore(snapshot, options) {
    if (!snapshot || typeof snapshot.data !== "function") {
      throw new TypeError("Snapshot Firestore inválido.");
    }
    return parseEstablishment(snapshot.data(options));
  }
});
