import { defineSecret, defineString } from "firebase-functions/params";

export const mercadoPagoAccessToken = defineSecret(
  "MERCADO_PAGO_ACCESS_TOKEN"
);
export const mercadoPagoWebhookSecret = defineSecret(
  "MERCADO_PAGO_WEBHOOK_SECRET"
);
export const whatsappAccessToken = defineSecret("WHATSAPP_ACCESS_TOKEN");
export const whatsappVerifyToken = defineSecret("WHATSAPP_VERIFY_TOKEN");

export const whatsappPhoneNumberId = defineString(
  "WHATSAPP_PHONE_NUMBER_ID",
  { description: "Identificador backend del número de WhatsApp Cloud API" }
);
