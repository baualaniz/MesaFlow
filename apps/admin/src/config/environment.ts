import type { FirebaseOptions } from "firebase/app";

export type AdminEnvironment = "emulator" | "development" | "production";

const cloudOptions = Object.freeze({
  development: Object.freeze({
    apiKey: "AIzaSyAFqyTsyBx5H5nebCVXhJ_vDh0khaqxNbs",
    appId: "1:685584709099:web:2d9cac26a22fbdcae815ae",
    authDomain: "mesaflow-desarrollo.firebaseapp.com",
    messagingSenderId: "685584709099",
    projectId: "mesaflow-desarrollo",
    storageBucket: "mesaflow-desarrollo.firebasestorage.app"
  }),
  production: Object.freeze({
    apiKey: "AIzaSyCzaBZamhGrf0Ni1Ws4AyFJl8aj7odrYV0",
    appId: "1:619377674437:web:3643ee20e7c37954a288ac",
    authDomain: "mesaflow-produccion.firebaseapp.com",
    messagingSenderId: "619377674437",
    projectId: "mesaflow-produccion",
    storageBucket: "mesaflow-produccion.firebasestorage.app"
  })
} satisfies Readonly<Record<Exclude<AdminEnvironment, "emulator">, FirebaseOptions>>);

const emulatorOptions = Object.freeze({
  apiKey: "demo-key",
  appId: "1:1234567890:web:mesaflow-admin-local",
  authDomain: "demo-mesaflow.firebaseapp.com",
  messagingSenderId: "1234567890",
  projectId: "demo-mesaflow",
  storageBucket: "demo-mesaflow.appspot.com"
}) satisfies FirebaseOptions;

export function parseAdminEnvironment(mode: string): AdminEnvironment {
  if (mode === "production") return "production";
  if (mode === "development") return "development";
  if (mode === "emulator" || mode === "test") return "emulator";
  throw new TypeError(`Ambiente administrativo desconocido: ${mode}`);
}

export function firebaseOptionsFor(environment: AdminEnvironment): FirebaseOptions {
  return environment === "emulator" ? emulatorOptions : cloudOptions[environment];
}

export const adminEnvironment = parseAdminEnvironment(import.meta.env.MODE);
export const adminFirebaseOptions = firebaseOptionsFor(adminEnvironment);
