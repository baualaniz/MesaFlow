import { initializeApp } from "firebase-admin/app";
import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";

import { handleHealthRequest } from "./health.js";

initializeApp();

setGlobalOptions({
  region: "southamerica-east1",
  memory: "256MiB",
  timeoutSeconds: 10,
  minInstances: 0,
  maxInstances: 3,
  concurrency: 20
});

export const health = onRequest(
  {
    cors: false,
    invoker: "public"
  },
  (request, response) => handleHealthRequest(request, response)
);
