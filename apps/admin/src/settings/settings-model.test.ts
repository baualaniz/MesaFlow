import { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";

import {
  BUSINESS_DAYS,
  DEFAULT_BUSINESS_HOURS,
  parsePrivateSettings,
  parsePublicSettings,
  settingsDraft,
  validateSettingsDraft
} from "./settings-model";

const timestamp = Timestamp.fromDate(new Date("2026-10-07T12:00:00.000Z"));
const establishmentId = "mesa-flow-demo";

function publicSettings(overrides: Record<string, unknown> = {}) {
  return {
    addressLine: "Av. Corrientes 1234, CABA",
    assistanceEnabled: true,
    brandName: "Bistró MesaFlow",
    businessHours: DEFAULT_BUSINESS_HOURS,
    contactEmail: "hola@mesaflow.test",
    contactPhone: "+54 11 5555-0101",
    establishmentId,
    orderingEnabled: true,
    updatedAt: timestamp,
    ...overrides
  };
}

describe("configuración del establecimiento", () => {
  it("interpreta la configuración pública y privada con contrato exacto", () => {
    const publicValue = parsePublicSettings(publicSettings(), establishmentId);
    const privateValue = parsePrivateSettings({
      establishmentId,
      mercadoPagoEnabled: false,
      updatedAt: timestamp,
      whatsappEnabled: false,
      whatsappOptInConfirmed: false,
      whatsappRecipient: ""
    }, establishmentId);
    expect(publicValue.brandName).toBe("Bistró MesaFlow");
    expect(publicValue.businessHours.sunday.closed).toBe(true);
    expect(privateValue.mercadoPagoEnabled).toBe(false);
  });

  it("migra el documento público anterior con contacto y horarios seguros", () => {
    const parsed = parsePublicSettings({
      assistanceEnabled: true,
      brandName: "Bistró MesaFlow",
      contactEmail: "contacto@mesaflow.test",
      establishmentId,
      orderingEnabled: true,
      updatedAt: timestamp
    }, establishmentId);
    expect(parsed.addressLine).toBe("");
    expect(parsed.contactPhone).toBe("");
    expect(parsed.businessHours.monday.open).toBe("09:00");
  });

  it("rechaza tenant, campos desconocidos, correo y horarios inválidos", () => {
    expect(() => parsePublicSettings(publicSettings({ establishmentId: "otro" }), establishmentId)).toThrow();
    expect(() => parsePublicSettings(publicSettings({ unexpected: true }), establishmentId)).toThrow();
    expect(() => parsePublicSettings(publicSettings({ contactEmail: "correo-invalido" }), establishmentId)).toThrow();
    expect(() => parsePublicSettings(publicSettings({
      businessHours: {
        ...DEFAULT_BUSINESS_HOURS,
        monday: { closed: false, open: "25:00", close: "23:00" }
      }
    }), establishmentId)).toThrow();
  });

  it("normaliza el borrador y conserva los siete días", () => {
    const settings = {
      public: parsePublicSettings(publicSettings(), establishmentId),
      private: parsePrivateSettings({
        establishmentId,
        mercadoPagoEnabled: true,
        updatedAt: timestamp,
        whatsappEnabled: false,
        whatsappOptInConfirmed: false,
        whatsappRecipient: ""
      }, establishmentId)
    };
    const validated = validateSettingsDraft({
      ...settingsDraft(settings),
      brandName: "  MesaFlow Centro  ",
      contactEmail: "  CONTACTO@MESAFLOW.TEST "
    });
    expect(validated.brandName).toBe("MesaFlow Centro");
    expect(validated.contactEmail).toBe("contacto@mesaflow.test");
    expect(Object.keys(validated.businessHours)).toHaveLength(BUSINESS_DAYS.length);
  });

  it("exige número privado y consentimiento para activar WhatsApp", () => {
    const settings = {
      public: parsePublicSettings(publicSettings(), establishmentId),
      private: parsePrivateSettings({
        establishmentId,
        mercadoPagoEnabled: false,
        updatedAt: timestamp,
        whatsappEnabled: false,
        whatsappOptInConfirmed: false,
        whatsappRecipient: ""
      }, establishmentId)
    };
    const draft = settingsDraft(settings);
    expect(() => validateSettingsDraft({ ...draft, whatsappEnabled: true })).toThrow(/consentimiento/u);
    expect(validateSettingsDraft({
      ...draft,
      whatsappEnabled: true,
      whatsappOptInConfirmed: true,
      whatsappRecipient: "5491155550101"
    }).whatsappEnabled).toBe(true);
  });
});
