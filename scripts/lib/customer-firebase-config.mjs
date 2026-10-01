const APP_ID_PATTERN = /^1:\d{6,}:web:[a-f0-9]{16,}$/u;

export function validateCustomerFirebaseConfig(config, projects) {
  const expected = new Map([
    ["lib/src/firebase/firebase_options_dev.dart", projects?.dev],
    ["lib/src/firebase/firebase_options_prod.dart", projects?.prod]
  ]);
  const dartConfigurations = config?.flutter?.platforms?.dart;
  if (!dartConfigurations || typeof dartConfigurations !== "object" ||
      Array.isArray(dartConfigurations)) {
    throw new Error("Falta la configuración FlutterFire del cliente.");
  }
  const paths = Object.keys(dartConfigurations);
  if (paths.length !== expected.size || paths.some((path) => !expected.has(path))) {
    throw new Error("FlutterFire debe declarar solamente los archivos dev y prod previstos.");
  }
  const appIds = new Set();
  for (const [path, projectId] of expected) {
    const entry = dartConfigurations[path];
    const platformKeys = Object.keys(entry?.configurations ?? {});
    const appId = entry?.configurations?.web;
    if (entry?.projectId !== projectId || platformKeys.length !== 1 ||
        platformKeys[0] !== "web" || !APP_ID_PATTERN.test(appId ?? "")) {
      throw new Error(`Configuración FlutterFire inválida o cruzada en ${path}.`);
    }
    appIds.add(appId);
  }
  if (appIds.size !== expected.size) {
    throw new Error("Desarrollo y producción deben usar apps Web Firebase distintas.");
  }
  return {
    devProjectId: dartConfigurations["lib/src/firebase/firebase_options_dev.dart"].projectId,
    prodProjectId: dartConfigurations["lib/src/firebase/firebase_options_prod.dart"].projectId,
    appIds: [...appIds]
  };
}
