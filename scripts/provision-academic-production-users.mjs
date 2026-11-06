import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { encodeFirestoreFields } from "./lib/presentation-seed.mjs";

const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const require = createRequire(import.meta.url);
const projectId = "mesaflow-produccion";
const apiKey = "AIzaSyCzaBZamhGrf0Ni1Ws4AyFJl8aj7odrYV0";
const establishmentId = "mesa-flow-demo";
const adminUrl = "https://mesaflow-produccion-admin.web.app/login";
const outputDirectory = path.join(root, "dist", "academic-firebase-production");
const credentialsPath = path.join(outputDirectory, "usuarios-panel.txt");
const presentationCredentialsPath = path.join(outputDirectory, "acceso-panel.txt");
const password = process.env.MESAFLOW_ACADEMIC_PASSWORD?.trim() ?? "";

if (process.argv.slice(2).some((argument) => argument !== "--production")) {
  throw new Error("Este comando solo admite el selector explícito --production.");
}
if (!process.argv.includes("--production")) {
  throw new Error("Falta --production; no se crearán usuarios por omisión.");
}
if (password.length < 12 || password.length > 128) {
  throw new Error("MESAFLOW_ACADEMIC_PASSWORD debe tener entre 12 y 128 caracteres.");
}

const users = Object.freeze([
  Object.freeze({
    displayName: "Olivia Propietaria",
    email: "owner@mesaflow.app",
    permissions: Object.freeze([
      "establishment.manage", "menu.manage", "orders.manage", "metrics.read"
    ]),
    role: "owner"
  }),
  Object.freeze({
    displayName: "Marcos Encargado",
    email: "manager@mesaflow.app",
    permissions: Object.freeze(["menu.manage", "orders.manage", "metrics.read"]),
    role: "manager"
  }),
  Object.freeze({
    displayName: "Sofía Salón",
    email: "staff@mesaflow.app",
    permissions: Object.freeze(["orders.manage", "assistance.manage"]),
    role: "staff"
  }),
  Object.freeze({
    displayName: "Ciro Cocina",
    email: "kitchen@mesaflow.app",
    permissions: Object.freeze(["orders.prepare"]),
    role: "kitchen"
  })
]);

class IdentityError extends Error {
  constructor(code) {
    super(`Identity Toolkit rechazó la operación (${code}).`);
    this.code = code;
  }
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
  if (!response.ok) throw new IdentityError(data?.error?.message ?? String(response.status));
  return data;
}

async function ensureIdentity(user) {
  let identity;
  let created = false;
  try {
    identity = await identityRequest("signInWithPassword", {
      email: user.email,
      password,
      returnSecureToken: true
    });
  } catch (error) {
    if (!(error instanceof IdentityError) ||
        !["EMAIL_NOT_FOUND", "INVALID_LOGIN_CREDENTIALS"].includes(error.code)) {
      throw error;
    }
    try {
      identity = await identityRequest("signUp", {
        email: user.email,
        password,
        returnSecureToken: true
      });
      created = true;
    } catch (creationError) {
      if (creationError instanceof IdentityError && creationError.code === "EMAIL_EXISTS") {
        throw new Error(
          `${user.email} ya existe, pero no acepta la contraseña académica solicitada.`
        );
      }
      throw creationError;
    }
  }
  const updated = await identityRequest("update", {
    displayName: user.displayName,
    idToken: identity.idToken,
    returnSecureToken: true
  });
  return {
    ...user,
    created,
    idToken: updated.idToken ?? identity.idToken,
    uid: updated.localId ?? identity.localId
  };
}

async function verifyFirestoreAccess(identity) {
  const prefix = `https://firestore.googleapis.com/v1/projects/${projectId}` +
    "/databases/(default)/documents";
  const documentPaths = [
    `users/${identity.uid}`,
    `establishments/${establishmentId}/members/${identity.uid}`
  ];
  if (["owner", "manager"].includes(identity.role)) {
    documentPaths.push(
      `establishments/${establishmentId}/teamProfiles/${identity.uid}`
    );
  }
  for (const documentPath of documentPaths) {
    const response = await fetch(`${prefix}/${documentPath}`, {
      headers: { authorization: `Bearer ${identity.idToken}` }
    });
    if (!response.ok) {
      throw new Error(`${identity.email} no pudo leer ${documentPath} (${response.status}).`);
    }
  }
}

function timestamp() {
  return { $timestamp: "now" };
}

try {
  const roleIdentities = [];
  for (const user of users) roleIdentities.push(await ensureIdentity(user));
  const presentationCredentials = await readFile(presentationCredentialsPath, "utf8");
  const presentationEmail = presentationCredentials.match(/^Email: (.+)$/mu)?.[1]?.trim();
  const presentationPassword = presentationCredentials.match(/^Contraseña: (.+)$/mu)?.[1];
  if (!presentationEmail || !presentationPassword) {
    throw new Error("El acceso de presentación local está incompleto.");
  }
  const presentationLogin = await identityRequest("signInWithPassword", {
    email: presentationEmail,
    password: presentationPassword,
    returnSecureToken: true
  });
  const identities = [
    {
      created: false,
      displayName: "Administrador MesaFlow",
      email: presentationEmail,
      idToken: presentationLogin.idToken,
      permissions: [
        "establishment.manage", "menu.manage", "orders.manage", "metrics.read"
      ],
      role: "owner",
      uid: presentationLogin.localId
    },
    ...roleIdentities
  ];

  const { getProjectDefaultAccount } = require("firebase-tools/lib/auth");
  const { requireAuth } = require("firebase-tools/lib/requireAuth");
  const { Client } = require("firebase-tools/lib/apiv2");
  const account = getProjectDefaultAccount(root);
  if (!account) throw new Error("Primero iniciá sesión con Firebase CLI.");
  await requireAuth({
    project: projectId,
    projectRoot: root,
    nonInteractive: true,
    ...account
  }, true);

  const now = new Date().toISOString();
  const documents = identities.flatMap((identity) => [
    {
      path: `users/${identity.uid}`,
      data: {
        createdAt: timestamp(),
        displayName: identity.displayName,
        email: identity.email,
        establishmentIds: [establishmentId],
        updatedAt: timestamp()
      }
    },
    {
      path: `establishments/${establishmentId}/members/${identity.uid}`,
      data: {
        active: true,
        createdAt: timestamp(),
        establishmentId,
        permissions: [...identity.permissions],
        role: identity.role,
        uid: identity.uid,
        updatedAt: timestamp()
      }
    },
    {
      path: `establishments/${establishmentId}/teamProfiles/${identity.uid}`,
      data: {
        createdAt: timestamp(),
        displayName: identity.displayName,
        email: identity.email,
        establishmentId,
        uid: identity.uid,
        updatedAt: timestamp()
      }
    }
  ]);
  const prefix = `projects/${projectId}/databases/(default)/documents/`;
  const client = new Client({ urlPrefix: "https://firestore.googleapis.com", auth: true });
  await client.post(
    `/v1/projects/${projectId}/databases/(default)/documents:commit`,
    {
      writes: documents.map(({ path: documentPath, data }) => ({
        update: {
          name: `${prefix}${documentPath}`,
          fields: encodeFirestoreFields(data, now)
        }
      }))
    },
    {
      headers: { "x-goog-user-project": projectId },
      ignoreQuotaProject: true,
      timeout: 30_000,
      redirect: "error"
    }
  );

  for (const identity of identities) await verifyFirestoreAccess(identity);

  await mkdir(outputDirectory, { recursive: true });
  const credentialLines = [
    "MesaFlow · usuarios académicos de producción",
    adminUrl,
    "",
    ...roleIdentities.flatMap(({ displayName, email, role }) => [
      `${displayName} (${role})`,
      `Email: ${email}`,
      `Contraseña provisoria: ${password}`,
      ""
    ]),
    "Archivo local excluido de Git. Cambiar las contraseñas si se reutilizan las cuentas."
  ];
  await writeFile(credentialsPath, `${credentialLines.join("\n")}\n`, "utf8");

  for (const identity of roleIdentities) {
    console.log(
      `[OK] ${identity.email}: ${identity.role}, ` +
      `${identity.created ? "creado" : "reutilizado"} y acceso Firestore verificado.`
    );
  }
  console.log(`[OK] Credenciales locales guardadas en ${credentialsPath}.`);
  console.log(`[OK] Destino exclusivo confirmado: ${projectId}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Falló el alta de usuarios académicos.");
  process.exitCode = 1;
}
