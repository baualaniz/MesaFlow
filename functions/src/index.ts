import { initializeApp } from "firebase-admin/app";
import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";

import { handleHealthRequest } from "./health.js";

export { exchangeQrSession, restoreQrSession } from "./qr-session-callable.js";
export { createOrder } from "./create-order-callable.js";
export { getSessionConsumption } from "./session-consumption-callable.js";
export { createPaymentPreference } from "./create-payment-preference-callable.js";
export {
  cancelAssistanceRequest,
  createAssistanceRequest
} from "./assistance-request-callable.js";

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
