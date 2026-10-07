import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/v2/firestore";

import {
  whatsappAccessToken,
  whatsappGraphApiVersion,
  whatsappPhoneNumberId,
  whatsappTemplateLanguage,
  whatsappTemplateName
} from "./config/runtime.js";
import { FirestoreWhatsAppNotificationRepository } from
  "./data/firestore-whatsapp-notification-repository.js";
import {
  MockWhatsAppProvider,
  WhatsAppCloudApiProvider
} from "./providers/whatsapp-cloud-api.js";
import {
  notifyWhatsAppAssistance,
  type WhatsAppAssistanceEvent,
  type WhatsAppAssistanceType
} from "./whatsapp-assistance.js";

const TYPES = new Set<WhatsAppAssistanceType>(["waiter", "bill", "other"]);

function pendingVersion(data: DocumentData | undefined): number | null {
  return data?.status === "pending" && data.updatedAt instanceof Timestamp
    ? data.updatedAt.toMillis()
    : null;
}

function notificationEvent(
  establishmentId: string,
  requestId: string,
  data: DocumentData
): WhatsAppAssistanceEvent {
  if (data.establishmentId !== establishmentId || typeof data.tableId !== "string" ||
      typeof data.type !== "string" || !TYPES.has(data.type as WhatsAppAssistanceType) ||
      !(data.updatedAt instanceof Timestamp)) {
    throw new TypeError("La solicitud de asistencia no cumple el contrato de WhatsApp.");
  }
  return Object.freeze({
    establishmentId,
    requestId,
    sourceUpdatedAt: data.updatedAt.toDate(),
    tableId: data.tableId,
    type: data.type as WhatsAppAssistanceType
  });
}

export const sendWhatsAppAssistance = onDocumentWritten(
  {
    document: "establishments/{establishmentId}/assistanceRequests/{requestId}",
    region: "southamerica-east1",
    memory: "256MiB",
    timeoutSeconds: 15,
    minInstances: 0,
    maxInstances: 2,
    concurrency: 10,
    secrets: [whatsappAccessToken]
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const nextVersion = pendingVersion(after);
    if (after === undefined || nextVersion === null || nextVersion === pendingVersion(before)) return;
    const establishmentId = event.params.establishmentId;
    const requestId = event.params.requestId;
    try {
      const provider = process.env.FUNCTIONS_EMULATOR === "true"
        ? new MockWhatsAppProvider()
        : new WhatsAppCloudApiProvider({
          accessToken: whatsappAccessToken.value(),
          graphApiVersion: whatsappGraphApiVersion.value(),
          phoneNumberId: whatsappPhoneNumberId.value(),
          templateLanguage: whatsappTemplateLanguage.value(),
          templateName: whatsappTemplateName.value()
        });
      const result = await notifyWhatsAppAssistance(
        notificationEvent(establishmentId, requestId, after),
        new FirestoreWhatsAppNotificationRepository(),
        provider
      );
      console.info("Alerta de asistencia procesada", {
        establishmentId,
        requestId,
        status: result.status
      });
    } catch (error) {
      console.error("No se pudo procesar la alerta de asistencia", {
        establishmentId,
        requestId,
        errorName: error instanceof Error ? error.name : "UnknownError"
      });
    }
  }
);
