export function validateStoragePolicy(policy) {
  const expected = {
    schemaVersion: 1,
    rootPrefix: "establishments",
    bucketSuffix: ".firebasestorage.app",
    locationId: "SOUTHAMERICA-EAST1",
    maxImageBytes: 5 * 1024 * 1024
  };
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new Error("La política Storage no es válida.");
  }
  for (const [key, value] of Object.entries(expected)) {
    if (policy[key] !== value) throw new Error(`La política Storage debe conservar ${key}=${value}.`);
  }
  const exactLists = {
    allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
    allowedExtensions: ["jpg", "jpeg", "png", "webp"],
    writeRoles: ["owner", "manager"],
    publicReadScopes: ["products", "branding"],
    requiredMetadata: ["establishmentId", "uploadedByUid"]
  };
  for (const [key, value] of Object.entries(exactLists)) {
    if (!Array.isArray(policy[key]) || policy[key].join(",") !== value.join(",")) {
      throw new Error(`La política Storage contiene una lista ${key} inesperada.`);
    }
  }
  return policy;
}

export function selectStorageEnvironments(args) {
  if (args.length !== 1 || !["dev", "prod", "all"].includes(args[0])) {
    throw new Error("Usá npm.cmd run storage:check -- dev, prod o all.");
  }
  return args[0] === "all" ? ["dev", "prod"] : [args[0]];
}

export function assessStorageBuckets(response, projectId, policy) {
  validateStoragePolicy(policy);
  const expectedName = `${projectId}${policy.bucketSuffix}`;
  const buckets = Array.isArray(response?.items) ? response.items : [];
  const bucket = buckets.find((candidate) => candidate?.name === expectedName);
  const checks = [
    { name: `Bucket predeterminado ${expectedName}`, ok: Boolean(bucket) },
    { name: `Región ${policy.locationId}`, ok: bucket?.location === policy.locationId },
    { name: "Clase de almacenamiento STANDARD", ok: bucket?.storageClass === "STANDARD" }
  ];
  return { ok: checks.every((check) => check.ok), checks, bucket };
}

export async function readRemoteStorageBuckets(client, projectId) {
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId)) throw new Error("ID de proyecto inválido.");
  const response = await client.get("/b", {
    queryParams: { project: projectId },
    headers: { "x-goog-user-project": projectId },
    ignoreQuotaProject: true,
    timeout: 15000,
    redirect: "error"
  });
  return response.body;
}
