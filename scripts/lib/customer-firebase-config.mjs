const WEB_APP_ID_PATTERN = /^1:\d{6,}:web:[a-f0-9]{16,}$/u;
const ANDROID_APP_ID_PATTERN = /^1:\d{6,}:android:[a-f0-9]{16,}$/u;

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
    const platformKeys = Object.keys(entry?.configurations ?? {}).sort();
    const expectedPlatforms = ["android", "web"];
    const webAppId = entry?.configurations?.web;
    const androidAppId = entry?.configurations?.android;
    if (entry?.projectId !== projectId ||
        platformKeys.join(",") !== expectedPlatforms.join(",") ||
        !WEB_APP_ID_PATTERN.test(webAppId ?? "") ||
        (expectedPlatforms.includes("android") &&
          !ANDROID_APP_ID_PATTERN.test(androidAppId ?? ""))) {
      throw new Error(`Configuración FlutterFire inválida o cruzada en ${path}.`);
    }
    appIds.add(webAppId);
    if (androidAppId) appIds.add(androidAppId);
  }
  if (appIds.size !== 4) {
    throw new Error("Desarrollo y producción deben usar apps Web/Android Firebase distintas.");
  }
  const android = config?.flutter?.platforms?.android?.default;
  const productionAndroidAppId = dartConfigurations[
    "lib/src/firebase/firebase_options_prod.dart"
  ].configurations.android;
  if (android?.projectId !== projects.prod || android?.appId !== productionAndroidAppId ||
      android?.fileOutput !== "android/app/google-services.json") {
    throw new Error("La aplicación Android final no corresponde al proyecto de producción.");
  }
  return {
    devProjectId: dartConfigurations["lib/src/firebase/firebase_options_dev.dart"].projectId,
    prodProjectId: dartConfigurations["lib/src/firebase/firebase_options_prod.dart"].projectId,
    appIds: [...appIds]
  };
}
