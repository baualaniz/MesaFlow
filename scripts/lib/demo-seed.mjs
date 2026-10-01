import { isDeepStrictEqual } from "node:util";

import { DEMO_PROJECT_ID, EMULATOR_HOST, EMULATOR_PORTS } from "./emulator-config.mjs";

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/u;
const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const ROLES = ["owner", "manager", "staff", "kitchen"];
const ORDER_STATUSES = ["created", "confirmed", "preparing", "ready", "delivered", "completed", "cancelled"];
const SESSION_STATUSES = ["open", "payment_pending", "paid", "closed", "cancelled"];
const PAYMENT_STATUSES = ["pending", "approved", "rejected", "cancelled", "refunded", "charged_back"];
const SECTION_NAMES = [
  "users", "members", "categories", "products", "tables", "sessions", "participants",
  "orders", "assistanceRequests", "payments", "dailyMetrics", "settings", "auditLogs"
];

function requireIds(items, section) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(`El seed demo requiere la sección ${section}.`);
  }
  const ids = new Set();
  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item) || !ID_PATTERN.test(item.id ?? "")) {
      throw new Error(`El seed demo contiene un ID inválido en ${section}.`);
    }
    if (ids.has(item.id)) throw new Error(`ID duplicado en ${section}: ${item.id}`);
    ids.add(item.id);
  }
  return ids;
}

function timestamp(value, field) {
  if (!ISO_TIMESTAMP_PATTERN.test(value ?? "") || Number.isNaN(Date.parse(value))) {
    throw new Error(`Timestamp inválido en ${field}.`);
  }
  return value;
}

function assertOrder(order, productIds, sessionIds, tableIds) {
  if (!sessionIds.has(order.sessionId) || !tableIds.has(order.tableId) ||
      !ORDER_STATUSES.includes(order.status) || !Array.isArray(order.items) ||
      order.items.length === 0 || order.items.length > 50) {
    throw new Error(`Pedido demo inválido: ${order.id}`);
  }
  let subtotal = 0;
  for (const item of order.items) {
    if (!productIds.has(item.productId) || !Number.isSafeInteger(item.unitPriceMinor) ||
        item.unitPriceMinor < 0 || !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1 || item.quantity > 99 ||
        item.lineTotalMinor !== item.unitPriceMinor * item.quantity) {
      throw new Error(`Línea inválida en el pedido demo ${order.id}.`);
    }
    subtotal += item.lineTotalMinor;
  }
  if (subtotal !== order.subtotalMinor || order.totalMinor !== order.subtotalMinor) {
    throw new Error(`Totales inconsistentes en el pedido demo ${order.id}.`);
  }
  timestamp(order.createdAt, `${order.id}.createdAt`);
  timestamp(order.updatedAt, `${order.id}.updatedAt`);
  if (!order.statusTimestamps || !order.statusTimestamps[order.status]) {
    throw new Error(`Falta el timestamp del estado actual en ${order.id}.`);
  }
  for (const [status, value] of Object.entries(order.statusTimestamps)) {
    if (!ORDER_STATUSES.includes(status)) throw new Error(`Estado histórico inválido en ${order.id}.`);
    timestamp(value, `${order.id}.statusTimestamps.${status}`);
  }
}

export function validateDemoSeed(seed) {
  if (seed?.schemaVersion !== 1 || seed?.target?.environment !== "emulator" ||
      seed?.target?.projectId !== DEMO_PROJECT_ID || seed?.target?.databaseId !== "(default)" ||
      !ISO_TIMESTAMP_PATTERN.test(seed?.fixedTimestamp ?? "")) {
    throw new Error("El seed demo solo puede apuntar al emulador demo-mesaflow.");
  }
  if (!seed.establishment || !ID_PATTERN.test(seed.establishment.id ?? "") ||
      seed.establishment.currency !== "ARS" || seed.establishment.active !== true) {
    throw new Error("El establecimiento del seed demo es inválido.");
  }

  const ids = Object.fromEntries(SECTION_NAMES.map((section) => [section, requireIds(seed[section], section)]));
  if (seed.users.length !== 4 || seed.members.length !== 4 || seed.tables.length !== 10 ||
      seed.products.length !== 18 || seed.orders.length < 3 || seed.payments.length < 2) {
    throw new Error("El seed demo no conserva 4 usuarios/roles, 10 mesas, 18 productos y actividad operativa.");
  }

  const roles = seed.members.map(({ role }) => role).sort();
  if (!isDeepStrictEqual(roles, [...ROLES].sort())) {
    throw new Error("El seed demo debe representar owner, manager, staff y kitchen una vez.");
  }
  for (const member of seed.members) {
    if (!ids.users.has(member.uid) || member.id !== member.uid || member.active !== true ||
        !Array.isArray(member.permissions)) {
      throw new Error(`Membresía demo inválida: ${member.id}`);
    }
  }
  for (const user of seed.users) {
    if (!user.email?.endsWith(".example.invalid")) {
      throw new Error(`El usuario ${user.id} no usa un correo reservado para demo.`);
    }
  }

  const tableNumbers = seed.tables.map(({ number }) => number).sort((a, b) => a - b);
  if (!isDeepStrictEqual(tableNumbers, Array.from({ length: 10 }, (_, index) => index + 1))) {
    throw new Error("Las mesas demo deben estar numeradas de 1 a 10 sin repeticiones.");
  }
  for (const table of seed.tables) {
    if (!/^[a-f0-9]{64}$/u.test(table.qrTokenHash ?? "") || table.qrVersion !== 1 ||
        (table.currentSessionId !== null && !ids.sessions.has(table.currentSessionId))) {
      throw new Error(`Mesa demo inválida: ${table.id}`);
    }
  }

  for (const product of seed.products) {
    if (!ids.categories.has(product.categoryId) || !Number.isSafeInteger(product.priceMinor) ||
        product.priceMinor < 0 || product.currency !== undefined ||
        !Number.isSafeInteger(product.sortOrder) || typeof product.imagePath !== "string") {
      throw new Error(`Producto demo inválido: ${product.id}`);
    }
  }

  for (const session of seed.sessions) {
    if (!ids.tables.has(session.tableId) || !SESSION_STATUSES.includes(session.status) ||
        ![session.subtotalMinor, session.paidMinor, session.balanceMinor].every(Number.isSafeInteger) ||
        session.balanceMinor !== session.subtotalMinor - session.paidMinor) {
      throw new Error(`Sesión demo inválida: ${session.id}`);
    }
    timestamp(session.openedAt, `${session.id}.openedAt`);
    if (session.closedAt !== null) timestamp(session.closedAt, `${session.id}.closedAt`);
  }
  const sessionsById = new Map(seed.sessions.map((session) => [session.id, session]));
  for (const table of seed.tables) {
    if (table.currentSessionId !== null &&
        sessionsById.get(table.currentSessionId)?.tableId !== table.id) {
      throw new Error(`La sesión actual no corresponde a la mesa ${table.id}.`);
    }
  }
  for (const participant of seed.participants) {
    if (!ids.sessions.has(participant.sessionId) || participant.uid !== participant.id) {
      throw new Error(`Participante demo inválido: ${participant.id}`);
    }
    timestamp(participant.joinedAt, `${participant.id}.joinedAt`);
    if (participant.revokedAt !== null) timestamp(participant.revokedAt, `${participant.id}.revokedAt`);
  }
  const participantKeys = new Set(seed.participants.map(({ sessionId, uid }) => `${sessionId}/${uid}`));
  const orderTotalsBySession = new Map();
  const productQuantities = {};
  for (const order of seed.orders) {
    assertOrder(order, ids.products, ids.sessions, ids.tables);
    if (sessionsById.get(order.sessionId)?.tableId !== order.tableId ||
        !participantKeys.has(`${order.sessionId}/${order.customerUid}`)) {
      throw new Error(`El pedido ${order.id} no corresponde a su mesa o participante.`);
    }
    orderTotalsBySession.set(
      order.sessionId,
      (orderTotalsBySession.get(order.sessionId) ?? 0) + order.totalMinor
    );
    for (const item of order.items) {
      productQuantities[item.productId] = (productQuantities[item.productId] ?? 0) + item.quantity;
    }
  }
  for (const session of seed.sessions) {
    if ((orderTotalsBySession.get(session.id) ?? 0) !== session.subtotalMinor) {
      throw new Error(`El subtotal de la sesión ${session.id} no coincide con sus pedidos.`);
    }
  }
  const approvedPaymentsBySession = new Map();
  for (const payment of seed.payments) {
    if (!ids.sessions.has(payment.sessionId) || !PAYMENT_STATUSES.includes(payment.status) ||
        !Number.isSafeInteger(payment.amountMinor) || payment.amountMinor <= 0 ||
        payment.provider !== "mercado_pago") {
      throw new Error(`Pago demo inválido: ${payment.id}`);
    }
    timestamp(payment.createdAt, `${payment.id}.createdAt`);
    timestamp(payment.updatedAt, `${payment.id}.updatedAt`);
    if (payment.status === "approved") {
      approvedPaymentsBySession.set(
        payment.sessionId,
        (approvedPaymentsBySession.get(payment.sessionId) ?? 0) + payment.amountMinor
      );
    }
  }
  for (const session of seed.sessions) {
    if ((approvedPaymentsBySession.get(session.id) ?? 0) !== session.paidMinor) {
      throw new Error(`Los pagos aprobados de ${session.id} no coinciden con su saldo.`);
    }
  }
  for (const request of seed.assistanceRequests) {
    if (!ids.sessions.has(request.sessionId) || !ids.tables.has(request.tableId) ||
        sessionsById.get(request.sessionId)?.tableId !== request.tableId ||
        !participantKeys.has(`${request.sessionId}/${request.customerUid}`)) {
      throw new Error(`Solicitud demo inválida: ${request.id}`);
    }
  }
  const metric = seed.dailyMetrics[0];
  const expectedProductQuantities = Object.fromEntries(Object.entries(productQuantities).sort());
  const actualProductQuantities = Object.fromEntries(Object.entries(metric.productQuantities ?? {}).sort());
  if (seed.dailyMetrics.length !== 1 ||
      metric.salesMinor !== seed.payments.filter(({ status }) => status === "approved")
        .reduce((total, payment) => total + payment.amountMinor, 0) ||
      metric.approvedPayments !== seed.payments.filter(({ status }) => status === "approved").length ||
      metric.completedOrders !== seed.orders.filter(({ status }) => status === "completed").length ||
      metric.activeOrders !== seed.orders.filter(({ status }) => !["completed", "cancelled"].includes(status)).length ||
      !isDeepStrictEqual(actualProductQuantities, expectedProductQuantities)) {
    throw new Error("Las métricas demo no coinciden con pedidos y pagos.");
  }
  if (!ids.settings.has("public") || !ids.settings.has("private") || !ids.auditLogs.has("demo-seed-v1")) {
    throw new Error("El seed demo requiere configuración pública/privada y auditoría.");
  }
  return {
    documentCount: buildDemoDocuments(seed, { skipValidation: true }).length,
    counts: Object.fromEntries(SECTION_NAMES.map((section) => [section, seed[section].length]))
  };
}

function timestampMarker(value) {
  return value === null ? null : { $timestamp: value };
}

function withTenant(seed, value) {
  return { establishmentId: seed.establishment.id, ...value };
}

function withCreatedAndUpdated(seed, value) {
  const marker = timestampMarker(seed.fixedTimestamp);
  return { ...value, createdAt: marker, updatedAt: marker };
}

function tenantPath(seed, collection, id) {
  return `establishments/${seed.establishment.id}/${collection}/${id}`;
}

export function buildDemoDocuments(seed, options = {}) {
  if (!options.skipValidation) validateDemoSeed(seed);
  const documents = [];
  const add = (path, data) => documents.push({ path, data });
  const fixed = timestampMarker(seed.fixedTimestamp);

  for (const { id, ...user } of seed.users) add(`users/${id}`, withCreatedAndUpdated(seed, user));
  add(`establishmentSlugs/${seed.establishment.slug}`, {
    establishmentId: seed.establishment.id,
    active: true
  });
  const { id: establishmentId, ...establishment } = seed.establishment;
  add(`establishments/${establishmentId}`, withCreatedAndUpdated(seed, establishment));
  for (const { id, ...member } of seed.members) {
    add(tenantPath(seed, "members", id), withCreatedAndUpdated(seed, withTenant(seed, member)));
  }
  for (const { id, ...category } of seed.categories) {
    add(tenantPath(seed, "categories", id), withCreatedAndUpdated(seed, withTenant(seed, category)));
  }
  for (const { id, ...product } of seed.products) {
    add(tenantPath(seed, "products", id), withCreatedAndUpdated(seed, withTenant(seed, {
      ...product,
      currency: seed.establishment.currency
    })));
  }
  for (const { id, ...table } of seed.tables) {
    add(tenantPath(seed, "tables", id), withCreatedAndUpdated(seed, withTenant(seed, table)));
  }
  for (const { id, openedAt, closedAt, ...session } of seed.sessions) {
    add(tenantPath(seed, "tableSessions", id), withTenant(seed, {
      ...session,
      openedAt: timestampMarker(openedAt),
      closedAt: timestampMarker(closedAt),
      updatedAt: fixed
    }));
  }
  for (const { id, sessionId, joinedAt, revokedAt, ...participant } of seed.participants) {
    add(`${tenantPath(seed, "tableSessions", sessionId)}/participants/${id}`, withTenant(seed, {
      sessionId,
      ...participant,
      joinedAt: timestampMarker(joinedAt),
      revokedAt: timestampMarker(revokedAt)
    }));
  }
  for (const { id, statusTimestamps, createdAt, updatedAt, ...order } of seed.orders) {
    add(tenantPath(seed, "orders", id), withTenant(seed, {
      ...order,
      currency: seed.establishment.currency,
      statusTimestamps: Object.fromEntries(
        Object.entries(statusTimestamps).map(([status, value]) => [status, timestampMarker(value)])
      ),
      createdAt: timestampMarker(createdAt),
      updatedAt: timestampMarker(updatedAt)
    }));
  }
  for (const { id, createdAt, updatedAt, ...request } of seed.assistanceRequests) {
    add(tenantPath(seed, "assistanceRequests", id), withTenant(seed, {
      ...request,
      createdAt: timestampMarker(createdAt),
      updatedAt: timestampMarker(updatedAt)
    }));
  }
  for (const { id, createdAt, updatedAt, ...payment } of seed.payments) {
    add(tenantPath(seed, "payments", id), withTenant(seed, {
      ...payment,
      currency: seed.establishment.currency,
      createdAt: timestampMarker(createdAt),
      updatedAt: timestampMarker(updatedAt)
    }));
  }
  for (const { id, ...metric } of seed.dailyMetrics) {
    add(tenantPath(seed, "dailyMetrics", id), withTenant(seed, { ...metric, updatedAt: fixed }));
  }
  for (const { id, ...settings } of seed.settings) {
    add(tenantPath(seed, "settings", id), withTenant(seed, { ...settings, updatedAt: fixed }));
  }
  for (const { id, ...audit } of seed.auditLogs) {
    add(tenantPath(seed, "auditLogs", id), withTenant(seed, { ...audit, createdAt: fixed }));
  }

  const paths = documents.map(({ path }) => path);
  if (new Set(paths).size !== paths.length) throw new Error("El seed demo genera rutas duplicadas.");
  return documents;
}

export function materializeDemoValue(value, timestampFactory) {
  if (Array.isArray(value)) return value.map((item) => materializeDemoValue(item, timestampFactory));
  if (value && typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 1 && keys[0] === "$timestamp") {
      timestamp(value.$timestamp, "$timestamp");
      return timestampFactory(value.$timestamp);
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, materializeDemoValue(item, timestampFactory)])
    );
  }
  return value;
}

export function normalizeDemoValue(value) {
  if (Array.isArray(value)) return value.map(normalizeDemoValue);
  if (value && typeof value.toDate === "function") return value.toDate().toISOString();
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, normalizeDemoValue(item)])
    );
  }
  return value;
}

export function assertSafeDemoSeedEnvironment(env) {
  for (const name of ["FIREBASE_TOKEN", "GOOGLE_APPLICATION_CREDENTIALS", "FIRESTORE_URL"]) {
    if (env[name]) throw new Error(`No uses ${name} para cargar el seed demo local.`);
  }
  for (const name of ["GCLOUD_PROJECT", "GOOGLE_CLOUD_PROJECT"]) {
    if (env[name] && env[name] !== DEMO_PROJECT_ID) {
      throw new Error(`El seed demo rechaza ${name}=${env[name]}.`);
    }
  }
  const expectedHost = `${EMULATOR_HOST}:${EMULATOR_PORTS.firestore}`;
  if (env.FIRESTORE_EMULATOR_HOST && env.FIRESTORE_EMULATOR_HOST !== expectedHost) {
    throw new Error(`El seed demo solo admite Firestore Emulator en ${expectedHost}.`);
  }
  return { projectId: DEMO_PROJECT_ID, firestoreHost: expectedHost };
}
