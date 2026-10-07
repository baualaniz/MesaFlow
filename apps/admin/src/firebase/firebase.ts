import { getApp, getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  setPersistence
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore
} from "firebase/firestore";
import {
  connectFunctionsEmulator,
  getFunctions
} from "firebase/functions";

import {
  adminEnvironment,
  adminFirebaseOptions
} from "../config/environment";

const appName = "mesaflow-admin";
const app = getApps().some(({ name }) => name === appName)
  ? getApp(appName)
  : initializeApp(adminFirebaseOptions, appName);

export const adminAuth = getAuth(app);
export const adminFirestore = getFirestore(app);
export const adminFunctions = getFunctions(app, "southamerica-east1");

if (adminEnvironment === "emulator") {
  connectAuthEmulator(adminAuth, "http://127.0.0.1:9099", {
    disableWarnings: true
  });
  connectFirestoreEmulator(adminFirestore, "127.0.0.1", 8080);
  connectFunctionsEmulator(adminFunctions, "127.0.0.1", 5001);
}

export const adminAuthReady = setPersistence(adminAuth, browserLocalPersistence);
