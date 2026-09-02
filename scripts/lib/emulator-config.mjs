export const DEMO_PROJECT_ID = "demo-mesaflow";
export const EMULATOR_HOST = "127.0.0.1";
export const EMULATOR_PORTS = Object.freeze({
  auth: 9099,
  firestore: 8080,
  ui: 4000,
  hub: 4400,
  logging: 4500
});

export function validateEmulatorConfig(config) {
  if (config?.firestore?.rules !== "firestore.rules" ||
      config?.firestore?.indexes !== "firestore.indexes.json") {
    throw new Error("firebase.json debe referenciar las reglas e índices de la raíz.");
  }
  for (const [name, port] of Object.entries(EMULATOR_PORTS)) {
    const emulator = config?.emulators?.[name];
    if (emulator?.host !== EMULATOR_HOST || emulator?.port !== port) {
      throw new Error(`Emulador ${name}: se requiere ${EMULATOR_HOST}:${port}.`);
    }
  }
  if (config.emulators.ui.enabled !== true || config.emulators.singleProjectMode !== true) {
    throw new Error("La UI y singleProjectMode deben estar habilitados.");
  }
}

export function buildEmulatorArgs(mode, extraArgs = []) {
  if (!["start", "test"].includes(mode) || extraArgs.length !== 0) {
    throw new Error("Usá npm run emulators o npm run test:emulators, sin argumentos adicionales.");
  }
  const args = [
    mode === "start" ? "emulators:start" : "emulators:exec",
    "--project", DEMO_PROJECT_ID,
    "--config", "firebase.json",
    "--only", "auth,firestore",
    "--non-interactive"
  ];
  if (mode === "test") args.push("node ./scripts/emulator-smoke.mjs");
  return args;
}

export function assertLocalEmulatorEnvironment(env) {
  if (env.GCLOUD_PROJECT !== DEMO_PROJECT_ID ||
      (env.GOOGLE_CLOUD_PROJECT && env.GOOGLE_CLOUD_PROJECT !== DEMO_PROJECT_ID) ||
      env.FIRESTORE_EMULATOR_HOST !== `${EMULATOR_HOST}:${EMULATOR_PORTS.firestore}` ||
      env.FIREBASE_AUTH_EMULATOR_HOST !== `${EMULATOR_HOST}:${EMULATOR_PORTS.auth}`) {
    throw new Error("Smoke test cancelado: solo se permite demo-mesaflow en emuladores loopback.");
  }
}
