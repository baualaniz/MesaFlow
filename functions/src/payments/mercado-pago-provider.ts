import type { PaymentPreferenceError } from "../create-payment-preference.js";
import { PaymentPreferenceError as PreferenceError } from "../create-payment-preference.js";

export interface ProviderPreferenceInput {
  readonly intentId: string;
  readonly title: string;
  readonly amountMinor: number;
  readonly currency: string;
  readonly returnBaseUrl: string;
  readonly returnPath: string;
}

export interface ProviderPreferenceResult {
  readonly preferenceId: string;
  readonly checkoutUrl: string;
}

export interface PaymentProvider {
  createOrRecover(input: ProviderPreferenceInput): Promise<ProviderPreferenceResult>;
}

function returnUrl(input: ProviderPreferenceInput, result: string): string {
  const url = new URL(`/payment/${result}`, input.returnBaseUrl);
  if (url.protocol !== "https:" || url.hostname === "localhost" ||
      url.hostname === "127.0.0.1") {
    throw providerFailure();
  }
  url.searchParams.set("returnTo", input.returnPath);
  return url.toString();
}

function providerFailure(): PaymentPreferenceError {
  return new PreferenceError(
    "failed-precondition",
    "provider-unavailable",
    "Mercado Pago no está disponible en este momento."
  );
}

function providerResult(value: unknown): ProviderPreferenceResult {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw providerFailure();
  }
  const record = value as Record<string, unknown>;
  const preferenceId = record.id;
  const checkoutUrl = record.sandbox_init_point ?? record.init_point;
  if (typeof preferenceId !== "string" || preferenceId.length < 1 ||
      typeof checkoutUrl !== "string") {
    throw providerFailure();
  }
  let url: URL;
  try {
    url = new URL(checkoutUrl);
  } catch {
    throw providerFailure();
  }
  if (url.protocol !== "https:" ||
      !(url.hostname === "mercadopago.com" || url.hostname.endsWith(".mercadopago.com"))) {
    throw providerFailure();
  }
  return Object.freeze({ preferenceId, checkoutUrl: url.toString() });
}

export class MercadoPagoProvider implements PaymentProvider {
  constructor(
    private readonly accessToken: string,
    private readonly fetcher: typeof fetch = fetch
  ) {}

  async createOrRecover(input: ProviderPreferenceInput): Promise<ProviderPreferenceResult> {
    if (this.accessToken.trim().length < 16) throw providerFailure();
    const headers = {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json"
    };
    const searchUrl = new URL(
      "https://api.mercadopago.com/checkout/preferences/search"
    );
    searchUrl.searchParams.set("external_reference", input.intentId);
    searchUrl.searchParams.set("limit", "10");
    const searchResponse = await this.fetcher(searchUrl, {
      method: "GET",
      headers
    }).catch(() => {
      throw providerFailure();
    });
    if (!searchResponse.ok) throw providerFailure();
    const searchBody: unknown = await searchResponse.json().catch(() => {
      throw providerFailure();
    });
    if (searchBody !== null && typeof searchBody === "object" &&
        !Array.isArray(searchBody)) {
      const elements = (searchBody as Record<string, unknown>).elements;
      if (Array.isArray(elements)) {
        const recovered = elements.find((item) =>
          item !== null && typeof item === "object" && !Array.isArray(item) &&
          (item as Record<string, unknown>).external_reference === input.intentId);
        const preferenceId = recovered === undefined
          ? undefined
          : (recovered as Record<string, unknown>).id;
        if (typeof preferenceId === "string" && preferenceId.length > 0) {
          const getResponse = await this.fetcher(
            `https://api.mercadopago.com/checkout/preferences/${encodeURIComponent(preferenceId)}`,
            { method: "GET", headers }
          ).catch(() => {
            throw providerFailure();
          });
          if (!getResponse.ok) throw providerFailure();
          return providerResult(await getResponse.json().catch(() => {
            throw providerFailure();
          }));
        }
      }
    }
    const response = await this.fetcher(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          items: [{
            id: input.intentId,
            title: input.title,
            quantity: 1,
            currency_id: input.currency,
            unit_price: input.amountMinor / 100
          }],
          external_reference: input.intentId,
          back_urls: {
            success: returnUrl(input, "success"),
            pending: returnUrl(input, "pending"),
            failure: returnUrl(input, "failure")
          },
          auto_return: "approved"
        })
      }
    ).catch(() => {
      throw providerFailure();
    });
    if (!response.ok) throw providerFailure();
    return providerResult(await response.json().catch(() => {
      throw providerFailure();
    }));
  }
}

export class EmulatorPaymentProvider implements PaymentProvider {
  async createOrRecover(input: ProviderPreferenceInput): Promise<ProviderPreferenceResult> {
    return Object.freeze({
      preferenceId: `emulator-${input.intentId.slice(0, 24)}`,
      checkoutUrl: `https://sandbox.mercadopago.com/checkout/v1/redirect?pref_id=emulator-${input.intentId.slice(0, 24)}`
    });
  }
}
