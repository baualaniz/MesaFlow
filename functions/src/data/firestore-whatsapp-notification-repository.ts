import { createHash } from "node:crypto";

import {
  getFirestore,
  Timestamp,
  type DocumentData,
  type Firestore
} from "firebase-admin/firestore";

import {
  assistanceLabel,
  buildWhatsAppAssistanceEventId,
  WHATSAPP_ASSISTANCE_RATE_LIMIT_MS,
  type WhatsAppAssistanceEvent,
  type WhatsAppClaim,
  type WhatsAppNotificationRepository
} from "../whatsapp-assistance.js";

function recipientHash(recipient: string): string {
  return createHash("sha256").update(recipient, "ascii").digest("hex");
}

function pendingLog(
  event: WhatsAppAssistanceEvent,
  status: string,
  reason: string | null,
  attemptedAt: Date,
  recipient: string | null
): DocumentData {
  return {
    establishmentId: event.establishmentId,
    actor: { type: "system", id: "whatsapp-assistance" },
    action: `whatsapp.assistance.${status}`,
    entity: { type: "assistanceRequest", id: event.requestId },
    before: null,
    after: {
      assistanceType: event.type,
      channel: "whatsapp",
      providerMessageId: null,
      reason,
      recipientHash: recipient === null ? null : recipientHash(recipient),
      status,
      tableId: event.tableId
    },
    sourceUpdatedAt: Timestamp.fromDate(event.sourceUpdatedAt),
    createdAt: Timestamp.fromDate(attemptedAt),
    updatedAt: Timestamp.fromDate(attemptedAt)
  };
}

export class FirestoreWhatsAppNotificationRepository implements WhatsAppNotificationRepository {
  constructor(private readonly firestore: Firestore = getFirestore()) {}

  async claim(event: WhatsAppAssistanceEvent, attemptedAt: Date): Promise<WhatsAppClaim> {
    const eventId = buildWhatsAppAssistanceEventId(event);
    const establishment = this.firestore.doc(`establishments/${event.establishmentId}`);
    const logRef = establishment.collection("auditLogs").doc(`whatsapp-assistance-${eventId}`);
    const stateRef = establishment.collection("notificationStates").doc("whatsapp-assistance");
    const settingsRef = establishment.collection("settings").doc("private");
    const tableRef = establishment.collection("tables").doc(event.tableId);

    return this.firestore.runTransaction(async (transaction) => {
      const [existing, state, settingsSnapshot, tableSnapshot] = await Promise.all([
        transaction.get(logRef),
        transaction.get(stateRef),
        transaction.get(settingsRef),
        transaction.get(tableRef)
      ]);
      if (existing.exists) {
        return { kind: "skip", logId: logRef.id, status: "duplicate" } as const;
      }
      const settings = settingsSnapshot.data() ?? {};
      const table = tableSnapshot.data() ?? {};
      const baseValid = settings.establishmentId === event.establishmentId &&
        table.establishmentId === event.establishmentId && typeof table.name === "string" &&
        table.name.trim().length >= 1 && table.name.trim().length <= 120;
      if (!baseValid || settings.whatsappEnabled !== true) {
        transaction.create(logRef, pendingLog(
          event, "skipped_disabled", "integration-disabled", attemptedAt, null
        ));
        return { kind: "skip", logId: logRef.id, status: "skipped_disabled" } as const;
      }
      const recipient = settings.whatsappRecipient;
      if (settings.whatsappOptInConfirmed !== true || typeof recipient !== "string" ||
          !/^\d{8,15}$/u.test(recipient)) {
        transaction.create(logRef, pendingLog(
          event, "skipped_unconfigured", "missing-opt-in-or-recipient", attemptedAt, null
        ));
        return { kind: "skip", logId: logRef.id, status: "skipped_unconfigured" } as const;
      }
      const lastAttemptAt = state.data()?.lastAttemptAt;
      if (lastAttemptAt instanceof Timestamp &&
          attemptedAt.getTime() - lastAttemptAt.toMillis() < WHATSAPP_ASSISTANCE_RATE_LIMIT_MS) {
        transaction.create(logRef, pendingLog(
          event, "rate_limited", "establishment-cooldown", attemptedAt, recipient
        ));
        return { kind: "skip", logId: logRef.id, status: "rate_limited" } as const;
      }

      transaction.set(stateRef, {
        establishmentId: event.establishmentId,
        channel: "whatsapp",
        lastAttemptAt: Timestamp.fromDate(attemptedAt),
        lastEventId: eventId
      });
      transaction.create(logRef, pendingLog(event, "pending", null, attemptedAt, recipient));
      return {
        kind: "send",
        logId: logRef.id,
        message: {
          assistanceLabel: assistanceLabel(event.type),
          eventId,
          recipient,
          tableName: table.name.trim()
        }
      } as const;
    });
  }

  async complete(
    event: WhatsAppAssistanceEvent,
    logId: string,
    result: { readonly status: "failed" | "mocked" | "sent"; readonly messageId: string | null },
    completedAt: Date
  ): Promise<void> {
    const matches = logId.match(/^whatsapp-assistance-([a-f0-9]{64})$/u);
    if (matches === null || matches[1] !== buildWhatsAppAssistanceEventId(event)) {
      throw new TypeError("El log de WhatsApp no es válido.");
    }
    const reference = this.firestore.doc(
      `establishments/${event.establishmentId}/auditLogs/${logId}`
    );
    await reference.update({
      action: `whatsapp.assistance.${result.status}`,
      "after.providerMessageId": result.messageId,
      "after.reason": result.status === "failed" ? "provider-error" : null,
      "after.status": result.status,
      updatedAt: Timestamp.fromDate(completedAt)
    });
  }
}
