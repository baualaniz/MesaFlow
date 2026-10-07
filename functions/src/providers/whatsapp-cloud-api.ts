import { createHash } from "node:crypto";

import type {
  WhatsAppAssistanceMessage,
  WhatsAppProvider,
  WhatsAppSendResult
} from "../whatsapp-assistance.js";

interface CloudApiConfiguration {
  readonly accessToken: string;
  readonly graphApiVersion: string;
  readonly phoneNumberId: string;
  readonly templateLanguage: string;
  readonly templateName: string;
}

type FetchImplementation = (
  input: string | URL | globalThis.Request,
  init?: RequestInit
) => Promise<Response>;

function configuration(value: CloudApiConfiguration): CloudApiConfiguration {
  if (!/^v\d{2}\.\d+$/u.test(value.graphApiVersion) ||
      !/^\d{5,30}$/u.test(value.phoneNumberId) ||
      !/^[a-z0-9_]{3,512}$/u.test(value.templateName) ||
      !/^[a-z]{2}(?:_[A-Z]{2})?$/u.test(value.templateLanguage) ||
      value.accessToken.trim().length < 20) {
    throw new Error("WhatsApp Cloud API no está configurada.");
  }
  return value;
}

function providerMessageId(value: unknown): string {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("WhatsApp devolvió una respuesta inválida.");
  }
  const messages = (value as Record<string, unknown>).messages;
  if (!Array.isArray(messages) || messages.length < 1 || messages[0] === null ||
      typeof messages[0] !== "object" || Array.isArray(messages[0])) {
    throw new Error("WhatsApp no confirmó el mensaje.");
  }
  const id = (messages[0] as Record<string, unknown>).id;
  if (typeof id !== "string" || id.length < 3 || id.length > 256) {
    throw new Error("WhatsApp no confirmó el mensaje.");
  }
  return id;
}

export class WhatsAppCloudApiProvider implements WhatsAppProvider {
  private readonly config: CloudApiConfiguration;

  constructor(
    value: CloudApiConfiguration,
    private readonly request: FetchImplementation = fetch
  ) {
    this.config = configuration(value);
  }

  async send(message: WhatsAppAssistanceMessage): Promise<WhatsAppSendResult> {
    if (!/^\d{8,15}$/u.test(message.recipient)) {
      throw new Error("El destinatario de WhatsApp no es válido.");
    }
    const response = await this.request(
      `https://graph.facebook.com/${this.config.graphApiVersion}/` +
        `${this.config.phoneNumberId}/messages`,
      {
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: message.recipient,
          type: "template",
          template: {
            name: this.config.templateName,
            language: { code: this.config.templateLanguage },
            components: [{
              type: "body",
              parameters: [
                { type: "text", text: message.tableName },
                { type: "text", text: message.assistanceLabel }
              ]
            }]
          }
        }),
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
          "Content-Type": "application/json"
        },
        method: "POST",
        signal: AbortSignal.timeout(8_000)
      }
    );
    if (!response.ok) throw new Error(`WhatsApp rechazó la solicitud (${response.status}).`);
    return Object.freeze({ messageId: providerMessageId(await response.json()), mode: "live" });
  }
}

export class MockWhatsAppProvider implements WhatsAppProvider {
  async send(message: WhatsAppAssistanceMessage): Promise<WhatsAppSendResult> {
    return Object.freeze({
      messageId: `mock-${createHash("sha256").update(message.eventId).digest("hex").slice(0, 20)}`,
      mode: "mock"
    });
  }
}
