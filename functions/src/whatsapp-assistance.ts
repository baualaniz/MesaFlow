import { createHash } from "node:crypto";

export const WHATSAPP_ASSISTANCE_RATE_LIMIT_MS = 60_000;

export type WhatsAppAssistanceType = "waiter" | "bill" | "other";
export type WhatsAppNotificationStatus =
  | "duplicate"
  | "failed"
  | "mocked"
  | "rate_limited"
  | "sent"
  | "skipped_disabled"
  | "skipped_unconfigured";

export interface WhatsAppAssistanceEvent {
  readonly establishmentId: string;
  readonly requestId: string;
  readonly tableId: string;
  readonly type: WhatsAppAssistanceType;
  readonly sourceUpdatedAt: Date;
}

export interface WhatsAppAssistanceMessage {
  readonly eventId: string;
  readonly recipient: string;
  readonly tableName: string;
  readonly assistanceLabel: string;
}

export interface WhatsAppSendResult {
  readonly messageId: string;
  readonly mode: "live" | "mock";
}

export interface WhatsAppProvider {
  send(message: WhatsAppAssistanceMessage): Promise<WhatsAppSendResult>;
}

export type WhatsAppClaim = {
  readonly kind: "skip";
  readonly logId: string;
  readonly status: Exclude<WhatsAppNotificationStatus, "failed" | "mocked" | "sent">;
} | {
  readonly kind: "send";
  readonly logId: string;
  readonly message: WhatsAppAssistanceMessage;
};

export interface WhatsAppNotificationRepository {
  claim(event: WhatsAppAssistanceEvent, attemptedAt: Date): Promise<WhatsAppClaim>;
  complete(
    event: WhatsAppAssistanceEvent,
    logId: string,
    result: { readonly status: "failed" | "mocked" | "sent"; readonly messageId: string | null },
    completedAt: Date
  ): Promise<void>;
}

export interface WhatsAppNotificationResult {
  readonly logId: string;
  readonly status: WhatsAppNotificationStatus;
}

export function buildWhatsAppAssistanceEventId(event: WhatsAppAssistanceEvent): string {
  return createHash("sha256")
    .update(event.establishmentId, "utf8")
    .update("\0", "utf8")
    .update(event.requestId, "utf8")
    .update("\0", "utf8")
    .update(event.sourceUpdatedAt.toISOString(), "ascii")
    .digest("hex");
}

export function assistanceLabel(type: WhatsAppAssistanceType): string {
  return {
    bill: "Solicitud de cuenta",
    other: "Otra solicitud",
    waiter: "Llamado al personal"
  }[type];
}

export async function notifyWhatsAppAssistance(
  event: WhatsAppAssistanceEvent,
  repository: WhatsAppNotificationRepository,
  provider: WhatsAppProvider,
  now = new Date()
): Promise<WhatsAppNotificationResult> {
  const claim = await repository.claim(event, now);
  if (claim.kind === "skip") {
    return Object.freeze({ logId: claim.logId, status: claim.status });
  }
  try {
    const sent = await provider.send(claim.message);
    const status = sent.mode === "mock" ? "mocked" : "sent";
    await repository.complete(event, claim.logId, { messageId: sent.messageId, status }, now);
    return Object.freeze({ logId: claim.logId, status });
  } catch {
    await repository.complete(event, claim.logId, { messageId: null, status: "failed" }, now);
    return Object.freeze({ logId: claim.logId, status: "failed" });
  }
}
