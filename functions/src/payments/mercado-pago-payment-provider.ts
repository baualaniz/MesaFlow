import {
  parseCurrency,
  parseMinorAmount,
  type PaymentStatus
} from "@mesaflow/contracts";

const MERCADO_PAGO_PAYMENT_URL = "https://api.mercadopago.com/v1/payments";

export class PaymentLookupError extends Error {
  constructor(message = "No se pudo consultar el pago en Mercado Pago.") {
    super(message);
    this.name = "PaymentLookupError";
  }
}

export interface ProviderPayment {
  readonly id: string;
  readonly externalReference: string;
  readonly status: PaymentStatus;
  readonly providerStatus: string;
  readonly statusDetail: string | null;
  readonly amountMinor: number;
  readonly currency: string;
  readonly liveMode: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface PaymentLookupProvider {
  getPayment(paymentId: string): Promise<ProviderPayment>;
}

function lookupFailure(cause?: unknown): PaymentLookupError {
  return new PaymentLookupError(
    cause instanceof Error && cause.message.length > 0
      ? "Mercado Pago devolvió un pago inválido."
      : undefined
  );
}

function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw lookupFailure();
  }
  return value as Record<string, unknown>;
}

function requiredString(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw lookupFailure();
  }
  return value.trim();
}

function paymentDate(value: unknown): Date {
  const date = new Date(requiredString(value));
  if (Number.isNaN(date.getTime())) throw lookupFailure();
  return date;
}

function paymentStatus(value: unknown): PaymentStatus {
  switch (value) {
    case "approved":
    case "rejected":
    case "cancelled":
    case "refunded":
    case "charged_back":
      return value;
    case "authorized":
    case "in_mediation":
    case "in_process":
    case "pending":
      return "pending";
    default:
      throw lookupFailure();
  }
}

function amountToMinor(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw lookupFailure();
  }
  const scaled = value * 100;
  const rounded = Math.round(scaled);
  if (Math.abs(scaled - rounded) > 1e-6) throw lookupFailure();
  try {
    return parseMinorAmount(rounded, "transaction_amount");
  } catch (error) {
    throw lookupFailure(error);
  }
}

export function parseProviderPayment(value: unknown): ProviderPayment {
  const raw = record(value);
  const rawId = raw.id;
  const id = typeof rawId === "number" && Number.isSafeInteger(rawId) && rawId >= 0
    ? String(rawId)
    : requiredString(rawId);
  const providerStatus = requiredString(raw.status);
  const statusDetail = raw.status_detail === null || raw.status_detail === undefined
    ? null
    : requiredString(raw.status_detail);
  if (typeof raw.live_mode !== "boolean") throw lookupFailure();
  try {
    return Object.freeze({
      id,
      externalReference: requiredString(raw.external_reference),
      status: paymentStatus(providerStatus),
      providerStatus,
      statusDetail,
      amountMinor: amountToMinor(raw.transaction_amount),
      currency: parseCurrency(raw.currency_id),
      liveMode: raw.live_mode,
      createdAt: paymentDate(raw.date_created),
      updatedAt: paymentDate(raw.date_last_updated ?? raw.date_created)
    });
  } catch (error) {
    if (error instanceof PaymentLookupError) throw error;
    throw lookupFailure(error);
  }
}

export class MercadoPagoPaymentProvider implements PaymentLookupProvider {
  constructor(
    private readonly accessToken: string,
    private readonly fetcher: typeof fetch = fetch
  ) {}

  async getPayment(paymentId: string): Promise<ProviderPayment> {
    if (this.accessToken.trim().length < 16 || !/^\d+$/u.test(paymentId)) {
      throw lookupFailure();
    }
    const response = await this.fetcher(
      `${MERCADO_PAGO_PAYMENT_URL}/${encodeURIComponent(paymentId)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${this.accessToken}` },
        redirect: "error",
        signal: AbortSignal.timeout(7_000)
      }
    ).catch(() => {
      throw lookupFailure();
    });
    if (!response.ok) throw lookupFailure();
    return parseProviderPayment(await response.json().catch(() => {
      throw lookupFailure();
    }));
  }
}

export class EmulatorPaymentLookupProvider implements PaymentLookupProvider {
  constructor(private readonly payment: ProviderPayment) {}

  async getPayment(paymentId: string): Promise<ProviderPayment> {
    if (paymentId !== this.payment.id) throw lookupFailure();
    return this.payment;
  }
}
