import { HttpsError, onCall, type CallableRequest } from "firebase-functions/v2/https";

import {
  PaymentPreferenceError,
  createPaymentPreference as createPreferenceService,
  type PaymentPreferenceResult
} from "./create-payment-preference.js";
import {
  customerPublicBaseUrl,
  mercadoPagoAccessToken,
  mercadoPagoEnvironment
} from "./config/runtime.js";
import { FirestorePaymentPreferenceRepository } from "./data/firestore-payment-preference-repository.js";
import {
  EmulatorPaymentProvider,
  mercadoPagoLiveMode,
  MercadoPagoProvider,
  parseMercadoPagoEnvironment
} from "./payments/mercado-pago-provider.js";
import { CALLABLE_SECURITY_OPTIONS, logInternalError } from "./security.js";

function callableError(error: unknown): HttpsError {
  if (error instanceof PaymentPreferenceError) {
    return new HttpsError(error.code, error.message, { reason: error.reason });
  }
  logInternalError("Fallo interno al crear la preferencia de pago", error);
  return new HttpsError("internal", "No pudimos preparar el pago en este momento.");
}

async function handleCreatePaymentPreference(
  request: CallableRequest<unknown>
): Promise<PaymentPreferenceResult> {
  try {
    const emulator = process.env.FUNCTIONS_EMULATOR === "true";
    const environment = emulator
      ? "sandbox"
      : parseMercadoPagoEnvironment(mercadoPagoEnvironment.value());
    const provider = emulator
      ? new EmulatorPaymentProvider()
      : new MercadoPagoProvider(mercadoPagoAccessToken.value(), environment);
    return await createPreferenceService(
      request.data,
      request.auth?.uid,
      new FirestorePaymentPreferenceRepository(
        provider,
        customerPublicBaseUrl.value(),
        mercadoPagoLiveMode(environment)
      )
    );
  } catch (error) {
    throw callableError(error);
  }
}

export const createPaymentPreference = onCall(
  {
    region: "southamerica-east1",
    memory: "256MiB",
    timeoutSeconds: 15,
    minInstances: 0,
    maxInstances: 3,
    concurrency: 20,
    ...CALLABLE_SECURITY_OPTIONS,
    secrets: [mercadoPagoAccessToken]
  },
  handleCreatePaymentPreference
);
