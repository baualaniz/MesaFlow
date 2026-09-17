const PATH_PATTERN = /^(?:[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+)(?:\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+)*$/u;

export function validatePresentationSeed(seed, projects) {
  if (seed?.version !== 1 || seed?.environment !== "dev" ||
      seed?.projectId !== projects?.dev || seed.projectId === projects?.prod ||
      seed?.databaseId !== "(default)") {
    throw new Error("El seed solo puede apuntar al proyecto Firebase de desarrollo.");
  }
  if (!Array.isArray(seed.documents) || seed.documents.length < 10 ||
      !seed.documents.some(({ path }) => path === seed.auditPath)) {
    throw new Error("El seed de presentación está incompleto o no tiene auditoría.");
  }
  const paths = new Set();
  for (const document of seed.documents) {
    if (!PATH_PATTERN.test(document?.path ?? "") || !document?.data ||
        typeof document.data !== "object" || Array.isArray(document.data)) {
      throw new Error("El seed contiene una ruta o documento inválido.");
    }
    if (paths.has(document.path)) throw new Error(`Ruta duplicada en el seed: ${document.path}`);
    paths.add(document.path);
    if (document.path.includes("production") || document.path.includes("produccion")) {
      throw new Error("El seed no admite rutas con referencias a producción.");
    }
  }
  for (const required of [
    "users/presentation-owner",
    "establishmentSlugs/mesa-flow-demo",
    "establishments/mesa-flow-demo",
    "establishments/mesa-flow-demo/categories/principales",
    "establishments/mesa-flow-demo/products/burger-casa",
    "establishments/mesa-flow-demo/tables/mesa-01",
    "establishments/mesa-flow-demo/orders/pedido-presentacion"
  ]) {
    if (!paths.has(required)) throw new Error(`Falta el documento requerido: ${required}`);
  }
  return { paths: [...paths], documentCount: paths.size };
}

export function encodeFirestoreValue(value, now) {
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return { integerValue: String(value) };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map((item) => encodeFirestoreValue(item, now)) } };
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 1 && keys[0] === "$timestamp" && value.$timestamp === "now") {
      return { timestampValue: now };
    }
    return { mapValue: { fields: encodeFirestoreFields(value, now) } };
  }
  throw new TypeError("El seed solo admite valores Firestore deterministas.");
}

export function encodeFirestoreFields(data, now) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, encodeFirestoreValue(value, now)])
  );
}

export function buildPresentationWrites(seed, projects, now) {
  validatePresentationSeed(seed, projects);
  const prefix = `projects/${seed.projectId}/databases/${seed.databaseId}/documents/`;
  return seed.documents.map(({ path, data }) => ({
    update: { name: `${prefix}${path}`, fields: encodeFirestoreFields(data, now) }
  }));
}

export function assertSafeSeedEnvironment(env) {
  for (const name of [
    "FIREBASE_TOKEN", "GOOGLE_APPLICATION_CREDENTIALS", "GOOGLE_CLOUD_PROJECT",
    "GCLOUD_PROJECT", "FIREBASE_CONFIG", "FIRESTORE_EMULATOR_HOST", "FIRESTORE_URL"
  ]) {
    if (env[name]) throw new Error(`No uses ${name} para cargar el seed de presentación.`);
  }
}
