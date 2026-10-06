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
  {
    default: "UNCONFIGURED",
    description: "Identificador backend del número de WhatsApp Cloud API"
  }
);

export const customerPublicBaseUrl = defineString(
  "CUSTOMER_PUBLIC_BASE_URL",
  {
    default: "https://mesaflow-desarrollo.web.app",
    description: "Origen HTTPS público de la app cliente para retornos de pago"
  }
);
