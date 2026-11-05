import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const require = createRequire(import.meta.url);
const projectId = "mesaflow-desarrollo";

try {
  const { getProjectDefaultAccount } = require("firebase-tools/lib/auth");
  const { requireAuth } = require("firebase-tools/lib/requireAuth");
  const { Client } = require("firebase-tools/lib/apiv2");
  const account = getProjectDefaultAccount(root);
  if (!account) throw new Error("Primero iniciá sesión con Firebase CLI.");
  await requireAuth({ project: projectId, projectRoot: root, nonInteractive: true, ...account }, true);
  const client = new Client({ urlPrefix: "https://firestore.googleapis.com", auth: true });
  const prefix = `/v1/projects/${projectId}/databases/(default)/documents`;
  const options = {
    headers: { "x-goog-user-project": projectId },
    ignoreQuotaProject: true,
    timeout: 20000,
    redirect: "error"
  };
  const optionalGet = async (url) => {
    try {
      return await client.get(url, options);
    } catch (error) {
      const status = error?.status ?? error?.context?.response?.statusCode;
      if (status === 404) return null;
      throw error;
    }
  };
  const [users, members, tables, deployment] = await Promise.all([
    optionalGet(`${prefix}/users?pageSize=20`),
    optionalGet(`${prefix}/establishments/mesa-flow-demo/members?pageSize=20`),
    optionalGet(`${prefix}/establishments/mesa-flow-demo/tables?pageSize=20`),
    optionalGet(`${prefix}/academicDeployments/mesa-flow-demo`)
  ]);
  const ids = (response) => (response?.body?.documents ?? [])
    .map(({ name }) => name.split("/").at(-1));
  console.log(`Usuarios Firestore: ${ids(users).join(", ") || "ninguno"}`);
  console.log(`Miembros MesaFlow: ${ids(members).join(", ") || "ninguno"}`);
  console.log(`Mesas: ${ids(tables).join(", ") || "ninguna"}`);
  console.log(`Modo académico persistente: ${deployment ? "configurado" : "pendiente"}`);
  console.log("Comprobación de solo lectura; producción no fue contactada.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "No se pudo inspeccionar Firebase.");
  process.exitCode = 1;
}
