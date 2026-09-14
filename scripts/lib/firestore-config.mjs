const expectedPolicy = Object.freeze({
  databaseId: "(default)",
  edition: "STANDARD",
  type: "FIRESTORE_NATIVE",
  locationId: "southamerica-east1",
  initialRulesMode: "deny-all"
});

export function validateFirestorePolicy(policy) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy) || policy.schemaVersion !== 1) {
    throw new Error("La política Firestore no es válida.");
  }
  for (const [key, value] of Object.entries(expectedPolicy)) {
    if (policy[key] !== value) throw new Error(`La política Firestore debe conservar ${key}=${value}.`);
  }
  if (!Array.isArray(policy.environments) || policy.environments.join(",") !== "dev,prod") {
    throw new Error("La política Firestore debe cubrir dev y prod, en ese orden.");
  }
  return policy;
}

export function selectFirestoreEnvironments(args) {
  if (args.length !== 1 || !["dev", "prod", "all"].includes(args[0])) {
    throw new Error("Usá npm.cmd run firestore:check -- dev, prod o all.");
  }
  return args[0] === "all" ? ["dev", "prod"] : [args[0]];
}

export function assessFirestoreDatabases(response, policy) {
  validateFirestorePolicy(policy);
  const databases = Array.isArray(response?.databases) ? response.databases : [];
  const suffix = `/databases/${policy.databaseId}`;
  const database = databases.find((candidate) => candidate?.name?.endsWith(suffix));
  const checks = [
    { name: "Base (default) creada", ok: Boolean(database) },
    { name: `Región ${policy.locationId}`, ok: database?.locationId === policy.locationId },
    { name: "Modo nativo de Firestore", ok: database?.type === policy.type },
    { name: "Edición Standard", ok: database?.edition === policy.edition || database?.edition === undefined && Boolean(database) }
  ];
  return { ok: checks.every((check) => check.ok), checks, database };
}

export async function readRemoteFirestoreDatabases(client, projectId) {
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId)) throw new Error("ID de proyecto inválido.");
  const response = await client.get(`/v1/projects/${projectId}/databases`, {
    headers: { "x-goog-user-project": projectId },
    ignoreQuotaProject: true,
    timeout: 15000,
    redirect: "error"
  });
  return response.body;
}

export function validateFirestoreSchema(schema) {
  if (schema?.schemaVersion !== 1 || !Array.isArray(schema.rootCollections) || !Array.isArray(schema.tenantCollections)) {
    throw new Error("El manifiesto del esquema Firestore no es válido.");
  }
  const roots = new Set(schema.rootCollections.map(({ key }) => key));
  const tenants = new Set(schema.tenantCollections.map(({ key }) => key));
  const requiredRoots = ["users", "establishmentSlugs", "establishments", "webhookEvents"];
  const requiredTenants = ["members", "tables", "tableSessions", "tableSessionParticipants", "categories", "products", "orders", "assistanceRequests", "payments", "dailyMetrics", "settings", "qrExchanges", "auditLogs"];
  if (roots.size !== schema.rootCollections.length || tenants.size !== schema.tenantCollections.length ||
      requiredRoots.some((key) => !roots.has(key)) || requiredTenants.some((key) => !tenants.has(key))) {
    throw new Error("El manifiesto no contiene exactamente las colecciones canónicas requeridas.");
  }
  for (const entry of [...schema.rootCollections, ...schema.tenantCollections]) {
    if (typeof entry.path !== "string" || !entry.path || typeof entry.idStrategy !== "string" || !entry.idStrategy) {
      throw new Error("Cada colección debe declarar path e idStrategy.");
    }
    const segments = entry.path.split("/");
    if (segments.length % 2 !== 0 || segments.some((segment) => !segment)) {
      throw new Error(`La ruta ${entry.path} no apunta a documentos Firestore.`);
    }
  }
  return schema;
}
