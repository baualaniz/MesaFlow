import { getApp, getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  setPersistence
} from "firebase/auth";

import {
  adminEnvironment,
  adminFirebaseOptions
} from "../config/environment";

const appName = "mesaflow-admin";
const app = getApps().some(({ name }) => name === appName)
  ? getApp(appName)
  : initializeApp(adminFirebaseOptions, appName);

export const adminAuth = getAuth(app);

if (adminEnvironment === "emulator") {
  connectAuthEmulator(adminAuth, "http://127.0.0.1:9099", {
    disableWarnings: true
  });
}

export const adminAuthReady = setPersistence(adminAuth, browserLocalPersistence);
