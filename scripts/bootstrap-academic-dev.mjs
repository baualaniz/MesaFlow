import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { encodeFirestoreFields } from "./lib/presentation-seed.mjs";

const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const require = createRequire(import.meta.url);
const production = process.argv.includes("--production");
if (process.argv.slice(2).some((argument) => argument !== "--production")) {
  throw new Error("Solo se admite el selector explícito --production.");
}
const projectId = production ? "mesaflow-produccion" : "mesaflow-desarrollo";
const apiKey = production
  ? "AIzaSyCzaBZamhGrf0Ni1Ws4AyFJl8aj7odrYV0"
  : "AIzaSyAFqyTsyBx5H5nebCVXhJ_vDh0khaqxNbs";
const customerHost = production
  ? "mesaflow-produccion.web.app"
  : "mesaflow-desarrollo.web.app";
const adminHost = production
  ? "mesaflow-produccion-admin.web.app"
  : "mesaflow-desarrollo-admin.web.app";
const establishmentId = "mesa-flow-demo";
const establishmentSlug = "mesa-flow-demo";
const email = "presentacion@mesaflow.app";
const outputDirectory = path.join(
  root,
  "dist",
  production ? "academic-firebase-production" : "academic-firebase"
);
const credentialsPath = path.join(outputDirectory, "acceso-panel.txt");

function token() {
  return randomBytes(32).toString("base64url");
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function identityRequest(action, body) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:${action}?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    }
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message ?? `Identity Toolkit respondió ${response.status}.`);
  }
  return data;
}

async function academicIdentity() {
  await mkdir(outputDirectory, { recursive: true });
  try {
    const saved = await readFile(credentialsPath, "utf8");
    const password = saved.match(/^Contraseña: (.+)$/mu)?.[1];
    if (!password) throw new Error("El archivo local de acceso está incompleto.");
    const login = await identityRequest("signInWithPassword", {
      email,
      password,
      returnSecureToken: true
    });
    return { uid: login.localId, password, created: false };
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    const password = `${randomBytes(14).toString("base64url")}Aa1!`;
    const created = await identityRequest("signUp", {
      email,
      password,
      returnSecureToken: true
    });
    return { uid: created.localId, password, created: true };
  }
}

function timestamp(value = "now") {
  return { $timestamp: value };
}

try {
  const { uid, password, created } = await academicIdentity();
  const now = new Date().toISOString();
  const qrTokens = new Map([
    ["mesa-01", token()],
    ["mesa-02", token()],
    ["mesa-03", token()]
  ]);
  const source = JSON.parse(await readFile(
    new URL("../firebase/seeds/presentation-dev.json", import.meta.url),
    "utf8"
  ));
  const reusable = source.documents.filter(({ path: documentPath }) =>
    documentPath.includes(`establishments/${establishmentId}/categories/`) ||
    documentPath.includes(`establishments/${establishmentId}/products/`) ||
    documentPath === `establishments/${establishmentId}/settings/public` ||
    documentPath === `establishments/${establishmentId}/settings/private`
  );
  const documents = [
    {
      path: `academicDeployments/${establishmentId}`,
      data: {
        active: true,
        establishmentId,
        schemaVersion: 1,
        updatedAt: timestamp()
      }
    },
    {
      path: `users/${uid}`,
      data: {
        createdAt: timestamp(),
        displayName: "Administrador MesaFlow",
        email,
        establishmentIds: [establishmentId],
        updatedAt: timestamp()
      }
    },
    {
      path: `establishmentSlugs/${establishmentSlug}`,
      data: { active: true, establishmentId }
    },
    {
      path: `establishments/${establishmentId}`,
      data: {
        active: true,
        createdAt: timestamp(),
        currency: "ARS",
        name: "Bistró MesaFlow",
        slug: establishmentSlug,
        timezone: "America/Argentina/Buenos_Aires",
        updatedAt: timestamp()
      }
    },
    {
      path: `establishments/${establishmentId}/members/${uid}`,
      data: {
        active: true,
        createdAt: timestamp(),
        establishmentId,
        permissions: [
          "establishment.manage", "menu.manage", "orders.manage", "metrics.read"
        ],
        role: "owner",
        uid,
        updatedAt: timestamp()
      }
    },
    {
      path: `establishments/${establishmentId}/teamProfiles/${uid}`,
      data: {
        createdAt: timestamp(),
        displayName: "Administrador MesaFlow",
        email,
        establishmentId,
        uid,
        updatedAt: timestamp()
      }
    },
    ...reusable,
  ];

  for (const [index, tableId] of ["mesa-01", "mesa-02", "mesa-03"].entries()) {
    const number = index + 1;
    const name = `Mesa ${number}`;
    const sessionId = `sesion-academica-${String(number).padStart(2, "0")}`;
    const qrToken = qrTokens.get(tableId);
    const qrHash = hash(qrToken);
    documents.push(
      {
        path: `establishments/${establishmentId}/tables/${tableId}`,
        data: {
          active: true,
          createdAt: timestamp(),
          currentSessionId: sessionId,
          establishmentId,
          name,
          number,
          qrTokenHash: qrHash,
          qrVersion: 1,
          updatedAt: timestamp()
        }
      },
      {
        path: `establishments/${establishmentId}/qrAccess/${qrHash}`,
        data: {
          active: true,
          createdAt: timestamp(),
          establishmentId,
          establishmentSlug,
          qrVersion: 1,
          sessionId,
          tableId,
          tableName: name,
          updatedAt: timestamp()
        }
      },
      {
        path: `establishments/${establishmentId}/tableSessions/${sessionId}`,
        data: {
          balanceMinor: 0,
          closedAt: null,
          establishmentId,
          openedAt: timestamp(),
          paidMinor: 0,
          status: "open",
          subtotalMinor: 0,
          tableId,
          updatedAt: timestamp()
        }
      }
    );
  }

  documents.push({
    path: `establishments/${establishmentId}/auditLogs/academic-bootstrap-v1`,
    data: {
      action: "academic.bootstrap.completed",
      actor: { id: uid, type: "member" },
      after: { persistentFirebase: true, qrCount: 3 },
      before: null,
      createdAt: timestamp(),
      entity: { id: "academic-v1", type: "deployment" },
      establishmentId
    }
  });

  const { getProjectDefaultAccount } = require("firebase-tools/lib/auth");
  const { requireAuth } = require("firebase-tools/lib/requireAuth");
  const { Client } = require("firebase-tools/lib/apiv2");
  const account = getProjectDefaultAccount(root);
  if (!account) throw new Error("Primero iniciá sesión con Firebase CLI.");
  await requireAuth({ project: projectId, projectRoot: root, nonInteractive: true, ...account }, true);
  const client = new Client({ urlPrefix: "https://firestore.googleapis.com", auth: true });
  const prefix = `projects/${projectId}/databases/(default)/documents/`;
  const writes = documents.map(({ path: documentPath, data }) => ({
    update: {
      name: `${prefix}${documentPath}`,
      fields: encodeFirestoreFields(data, now)
    }
  }));
  await client.post(
    `/v1/projects/${projectId}/databases/(default)/documents:commit`,
    { writes },
    {
      headers: { "x-goog-user-project": projectId },
      ignoreQuotaProject: true,
      timeout: 30000,
      redirect: "error"
    }
  );

  const credentials = [
    "MesaFlow · panel académico Firebase",
    `https://${adminHost}/login`,
    `Email: ${email}`,
    `Contraseña: ${password}`,
    "",
    "Este archivo es local y está excluido de Git."
  ].join("\n");
  await writeFile(credentialsPath, `${credentials}\n`, "utf8");

  const qrcode = require("qrcode");
  const links = [];
  for (const [tableId, qrToken] of qrTokens) {
    const url = `https://${customerHost}/e/${establishmentSlug}/table/${tableId}?token=${qrToken}`;
    links.push(`${tableId}: ${url}`);
    await qrcode.toFile(path.join(outputDirectory, `${tableId}.png`), url, {
      errorCorrectionLevel: "H",
      margin: 3,
      width: 1024
    });
  }
  await writeFile(
    path.join(outputDirectory, "enlaces-qr.txt"),
    `${links.join("\n")}\n`,
    "utf8"
  );

  console.log(`[OK] ${documents.length} documentos persistentes cargados en ${projectId}.`);
  console.log(`[OK] Usuario administrativo ${created ? "creado" : "reutilizado"}.`);
  console.log(`[OK] 3 QR generados en ${outputDirectory}.`);
  console.log(`[OK] Destino exclusivo confirmado: ${projectId}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Falló el alta académica.");
  process.exitCode = 1;
}
