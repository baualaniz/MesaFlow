import {
  InvalidWebhookSignatureError,
  WebhookSignatureValidator
} from "mercadopago";
import { onRequest } from "firebase-functions/v2/https";

import { buildPaymentIntentId } from "./create-payment-preference.js";
import {
  mercadoPagoAccessToken,
  mercadoPagoWebhookSecret
} from "./config/runtime.js";
import { FirestorePaymentReconciliationRepository } from
  "./data/firestore-payment-reconciliation-repository.js";
import {
  EmulatorPaymentLookupProvider,
  MercadoPagoPaymentProvider,
  type PaymentLookupProvider
} from "./payments/mercado-pago-payment-provider.js";
import {
  reconcilePayment,
  type PaymentReconciliationRepository
} from "./reconcile-payment.js";

export const EMULATOR_WEBHOOK_SECRET = "mesaflow-emulator-webhook-secret-v1";

interface WebhookRequest {
  readonly body?: unknown;
  readonly method?: string;
  readonly query: Record<string, unknown>;
  get(name: string): string | undefined;
}

interface WebhookResponse {
  end(): void;
  json(body: Readonly<Record<string, unknown>>): void;
  setHeader(name: string, value: string): void;
  status(code: number): WebhookResponse;
}

interface WebhookDependencies {
  readonly secret: string;
  readonly provider: PaymentLookupProvider;
  readonly repository: PaymentReconciliationRepository;
  readonly now?: Date;
  readonly logError?: (message: string, details: Readonly<Record<string, unknown>>) => void;
}

function queryValue(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim().length > 0) {
    return value[0].trim();
  }
  return undefined;
}

function payload(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function respond(
  response: WebhookResponse,
  code: number,
  body?: Readonly<Record<string, unknown>>
): void {
  response.status(code);
  if (body === undefined) response.end();
  else response.json(body);
}

export async function handleMercadoPagoWebhook(
  request: WebhookRequest,
  response: WebhookResponse,
  dependencies: WebhookDependencies
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Allow", "POST");
  if (request.method !== "POST") {
    respond(response, 405);
    return;
  }
  const dataId = queryValue(request.query["data.id"] ?? request.query.data_id);
  const requestId = request.get("x-request-id")?.trim();
  if (dependencies.secret.length < 16 || requestId === undefined || requestId.length === 0) {
    respond(response, 401);
    return;
  }
  try {
    WebhookSignatureValidator.validate({
      xSignature: request.get("x-signature"),
      xRequestId: requestId,
      dataId,
      secret: dependencies.secret
    });
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) {
      respond(response, 401);
      return;
    }
    throw error;
  }
  const body = payload(request.body);
  const bodyData = payload(body?.data);
  const bodyDataId = bodyData === null ? undefined : String(bodyData.id ?? "");
  if (body === null || dataId === undefined || bodyDataId !== dataId ||
      typeof body.type !== "string" || typeof body.action !== "string") {
    respond(response, 400, { error: "invalid-notification" });
    return;
  }
  if (body.type !== "payment" || !body.action.startsWith("payment.")) {
    respond(response, 200, { received: true, outcome: "ignored" });
    return;
  }
  try {
    const result = await reconcilePayment(
      dataId,
      requestId,
      dependencies.provider,
      dependencies.repository,
      dependencies.now
    );
    respond(response, 200, {
      received: true,
      outcome: result.outcome,
      status: result.status
    });
  } catch (error) {
    const details = {
      requestId,
      paymentId: dataId,
      error: error instanceof Error ? error.name : "UnknownError"
    };
    if (dependencies.logError === undefined) {
      console.error("No se pudo conciliar la notificación de pago", details);
    } else {
      dependencies.logError("No se pudo conciliar la notificación de pago", details);
    }
    respond(response, 503, { error: "reconciliation-unavailable" });
  }
}

function emulatorProvider(): PaymentLookupProvider {
  const timestamp = new Date("2026-10-06T12:00:00.000Z");
  return new EmulatorPaymentLookupProvider(Object.freeze({
    id: "900001",
    externalReference: buildPaymentIntentId("mesa-flow-demo", "sesion-mesa-01"),
    status: "approved" as const,
    providerStatus: "approved",
    statusDetail: "accredited",
    amountMinor: 5_140_000,
    currency: "ARS",
    liveMode: false,
    createdAt: timestamp,
    updatedAt: timestamp
  }));
}

export const mercadoPagoWebhook = onRequest(
  {
    region: "southamerica-east1",
    memory: "256MiB",
    timeoutSeconds: 15,
    minInstances: 0,
    maxInstances: 3,
    concurrency: 20,
    cors: false,
    invoker: "public",
    secrets: [mercadoPagoAccessToken, mercadoPagoWebhookSecret]
  },
  async (request, response) => {
    const emulator = process.env.FUNCTIONS_EMULATOR === "true";
    await handleMercadoPagoWebhook(request, response, {
      secret: emulator ? EMULATOR_WEBHOOK_SECRET : mercadoPagoWebhookSecret.value(),
      provider: emulator
        ? emulatorProvider()
        : new MercadoPagoPaymentProvider(mercadoPagoAccessToken.value()),
      repository: new FirestorePaymentReconciliationRepository()
    });
  }
);
