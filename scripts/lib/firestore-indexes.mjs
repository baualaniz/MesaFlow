const EXPECTED_PLAN_IDS = Object.freeze([
  "published-products-by-category",
  "published-categories",
  "operational-order-queue",
  "orders-by-session",
  "recent-orders-by-table",
  "pending-assistance",
  "payments-by-session",
  "active-members-by-role"
]);

const FIELD_SPEC = /^([A-Za-z][A-Za-z0-9.]*) (ASCENDING|DESCENDING)$/u;

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} debe ser un objeto.`);
  }
  return value;
}

function planIndex(plan, queryScope) {
  assertObject(plan, "Plan de consulta");
  if (typeof plan.id !== "string" || typeof plan.collectionGroup !== "string" ||
      typeof plan.purpose !== "string" || !Array.isArray(plan.filters) ||
      !Array.isArray(plan.orderBy) || !Array.isArray(plan.indexFields) ||
      plan.indexFields.length < 2) {
    throw new Error("Cada plan debe declarar identidad, propósito, filtros, orden e índice.");
  }
  return {
    collectionGroup: plan.collectionGroup,
    queryScope,
    fields: plan.indexFields.map((field) => {
      const match = typeof field === "string" ? field.match(FIELD_SPEC) : null;
      if (!match) throw new Error(`Campo de índice inválido en ${plan.id}.`);
      return { fieldPath: match[1], order: match[2] };
    })
  };
}

function indexKey(index) {
  return `${index.collectionGroup}|${index.queryScope}|${index.fields
    .map(({ fieldPath, order }) => `${fieldPath}:${order}`)
    .join(",")}`;
}

function normalizeConfiguredIndex(value) {
  const index = assertObject(value, "Índice");
  if (typeof index.collectionGroup !== "string" || index.queryScope !== "COLLECTION" ||
      !Array.isArray(index.fields) || index.fields.length < 2) {
    throw new Error("Cada índice debe ser COLLECTION y declarar al menos dos campos.");
  }
  const fields = index.fields.map((rawField) => {
    const field = assertObject(rawField, "Campo de índice");
    if (typeof field.fieldPath !== "string" ||
        !["ASCENDING", "DESCENDING"].includes(field.order) ||
        Object.keys(field).some((key) => !["fieldPath", "order"].includes(key))) {
      throw new Error("Los campos de índice deben declarar fieldPath y order válidos.");
    }
    if (field.fieldPath === "establishmentId") {
      throw new Error("Los índices no deben habilitar consultas globales por establishmentId.");
    }
    return { fieldPath: field.fieldPath, order: field.order };
  });
  return { collectionGroup: index.collectionGroup, queryScope: index.queryScope, fields };
}

export function validateQueryPlans(manifest) {
  assertObject(manifest, "Manifiesto de consultas");
  if (manifest.schemaVersion !== 1 || manifest.databaseId !== "(default)" ||
      manifest.queryScope !== "COLLECTION" || !Array.isArray(manifest.plans)) {
    throw new Error("El manifiesto de consultas debe usar schemaVersion 1 y scope COLLECTION.");
  }
  const ids = manifest.plans.map(({ id }) => id);
  if (ids.length !== EXPECTED_PLAN_IDS.length || new Set(ids).size !== ids.length ||
      EXPECTED_PLAN_IDS.some((id) => !ids.includes(id))) {
    throw new Error("El manifiesto no contiene exactamente los planes requeridos.");
  }
  const indexes = manifest.plans.map((plan) => planIndex(plan, manifest.queryScope));
  if (new Set(indexes.map(indexKey)).size !== indexes.length) {
    throw new Error("Dos planes requieren el mismo índice; deben consolidarse.");
  }
  return Object.freeze({ ...manifest, expectedIndexes: Object.freeze(indexes) });
}

export function validateFirestoreIndexes(config, manifest) {
  const validatedManifest = validateQueryPlans(manifest);
  assertObject(config, "Configuración de índices");
  if (!Array.isArray(config.indexes) || !Array.isArray(config.fieldOverrides) ||
      config.fieldOverrides.length !== 0) {
    throw new Error("firestore.indexes.json debe declarar indexes y fieldOverrides vacío.");
  }
  const actual = config.indexes.map(normalizeConfiguredIndex);
  const actualKeys = actual.map(indexKey);
  const expectedKeys = validatedManifest.expectedIndexes.map(indexKey);
  if (actualKeys.length !== expectedKeys.length || new Set(actualKeys).size !== actualKeys.length ||
      expectedKeys.some((key) => !actualKeys.includes(key))) {
    throw new Error("Los índices configurados no coinciden exactamente con los planes.");
  }
  return Object.freeze({ indexes: Object.freeze(actual), fieldOverrides: Object.freeze([]) });
}

function remoteIndexCollection(index) {
  if (typeof index.collectionGroup === "string") return index.collectionGroup;
  const match = typeof index.name === "string"
    ? index.name.match(/\/collectionGroups\/([^/]+)\/indexes\//u)
    : null;
  return match ? decodeURIComponent(match[1]) : null;
}

function normalizeRemoteIndex(index) {
  const fields = Array.isArray(index.fields)
    ? index.fields
        .filter(({ fieldPath }) => fieldPath !== "__name__")
        .map(({ fieldPath, order }) => ({ fieldPath, order }))
    : [];
  return {
    collectionGroup: remoteIndexCollection(index),
    queryScope: index.queryScope,
    fields,
    state: index.state
  };
}

export function assessRemoteIndexes(remoteIndexes, config, manifest) {
  validateFirestoreIndexes(config, manifest);
  if (!Array.isArray(remoteIndexes)) throw new Error("La respuesta remota de índices es inválida.");
  const remote = remoteIndexes.map(normalizeRemoteIndex);
  const checks = config.indexes.map((index) => {
    const key = indexKey(normalizeConfiguredIndex(index));
    const candidate = remote.find((remoteIndex) => indexKey(remoteIndex) === key);
    return Object.freeze({
      collectionGroup: index.collectionGroup,
      fields: index.fields.map(({ fieldPath }) => fieldPath).join(", "),
      deployed: Boolean(candidate),
      ready: candidate?.state === "READY"
    });
  });
  return Object.freeze({
    ok: checks.every(({ deployed, ready }) => deployed && ready),
    checks: Object.freeze(checks)
  });
}

export function selectIndexEnvironment(args) {
  if (args.length !== 1 || args[0] !== "dev") {
    throw new Error("La Etapa 13 solo permite comprobar índices con el destino dev explícito.");
  }
  return "dev";
}

function fieldFilter(fieldPath, op, value) {
  return { fieldFilter: { field: { fieldPath }, op, value } };
}

function stringValue(value) {
  return { stringValue: value };
}

function booleanValue(value) {
  return { booleanValue: value };
}

function query(planId, collectionId, filters, orderBy) {
  return Object.freeze({
    planId,
    structuredQuery: {
      from: [{ collectionId }],
      where: filters.length === 1
        ? filters[0]
        : { compositeFilter: { op: "AND", filters } },
      orderBy: orderBy.map(([fieldPath, direction]) => ({
        field: { fieldPath }, direction
      })),
      limit: 5
    }
  });
}

export function buildDevelopmentQuerySmoke() {
  return Object.freeze([
    query("published-products-by-category", "products", [
      fieldFilter("categoryId", "EQUAL", stringValue("principales")),
      fieldFilter("active", "EQUAL", booleanValue(true)),
      fieldFilter("available", "EQUAL", booleanValue(true))
    ], [["sortOrder", "ASCENDING"]]),
    query("published-categories", "categories", [
      fieldFilter("active", "EQUAL", booleanValue(true))
    ], [["sortOrder", "ASCENDING"]]),
    query("operational-order-queue", "orders", [
      fieldFilter("status", "IN", {
        arrayValue: { values: ["created", "confirmed", "preparing", "ready"].map(stringValue) }
      })
    ], [["createdAt", "ASCENDING"]]),
    query("orders-by-session", "orders", [
      fieldFilter("sessionId", "EQUAL", stringValue("sesion-presentacion"))
    ], [["createdAt", "ASCENDING"]]),
    query("recent-orders-by-table", "orders", [
      fieldFilter("tableId", "EQUAL", stringValue("mesa-01"))
    ], [["createdAt", "DESCENDING"]]),
    query("pending-assistance", "assistanceRequests", [
      fieldFilter("status", "EQUAL", stringValue("pending"))
    ], [["createdAt", "ASCENDING"]]),
    query("payments-by-session", "payments", [
      fieldFilter("sessionId", "EQUAL", stringValue("sesion-presentacion"))
    ], [["createdAt", "DESCENDING"]]),
    query("active-members-by-role", "members", [
      fieldFilter("active", "EQUAL", booleanValue(true)),
      fieldFilter("role", "EQUAL", stringValue("owner"))
    ], [["createdAt", "DESCENDING"]])
  ]);
}
