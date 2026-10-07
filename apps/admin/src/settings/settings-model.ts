import { Timestamp } from "firebase/firestore";

export const BUSINESS_DAYS = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miércoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" }
] as const;

export type BusinessDay = typeof BUSINESS_DAYS[number]["key"];

export interface BusinessDayHours {
  readonly closed: boolean;
  readonly open: string;
  readonly close: string;
}

export type BusinessHours = Readonly<Record<BusinessDay, BusinessDayHours>>;

export interface PublicEstablishmentSettings {
  readonly establishmentId: string;
  readonly brandName: string;
  readonly contactEmail: string;
  readonly contactPhone: string;
  readonly addressLine: string;
  readonly businessHours: BusinessHours;
  readonly orderingEnabled: boolean;
  readonly assistanceEnabled: boolean;
  readonly updatedAt: Date;
}

export interface PrivateEstablishmentSettings {
  readonly establishmentId: string;
  readonly mercadoPagoEnabled: boolean;
  readonly whatsappEnabled: boolean;
  readonly updatedAt: Date;
}

export interface EstablishmentSettings {
  readonly public: PublicEstablishmentSettings;
  readonly private: PrivateEstablishmentSettings;
}

export interface EstablishmentSettingsDraft {
  readonly brandName: string;
  readonly contactEmail: string;
  readonly contactPhone: string;
  readonly addressLine: string;
  readonly businessHours: BusinessHours;
  readonly orderingEnabled: boolean;
  readonly assistanceEnabled: boolean;
  readonly mercadoPagoEnabled: boolean;
  readonly whatsappEnabled: boolean;
}

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const CURRENT_PUBLIC_FIELDS = Object.freeze([
  "addressLine", "assistanceEnabled", "brandName", "businessHours", "contactEmail",
  "contactPhone", "establishmentId", "orderingEnabled", "updatedAt"
]);
const LEGACY_PUBLIC_FIELDS = Object.freeze([
  "assistanceEnabled", "brandName", "contactEmail", "establishmentId", "orderingEnabled", "updatedAt"
]);
const PRIVATE_FIELDS = Object.freeze([
  "establishmentId", "mercadoPagoEnabled", "updatedAt", "whatsappEnabled"
]);

export const DEFAULT_BUSINESS_HOURS: BusinessHours = Object.freeze(Object.fromEntries(
  BUSINESS_DAYS.map(({ key }) => [key, Object.freeze({
    closed: key === "sunday",
    open: "09:00",
    close: "23:00"
  })])
) as Record<BusinessDay, BusinessDayHours>);

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} debe ser un objeto.`);
  }
  return value as Record<string, unknown>;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[], label: string): void {
  if (!hasExactKeys(value, expected)) {
    throw new TypeError(`${label} contiene campos ausentes o desconocidos.`);
  }
}

function text(value: unknown, label: string, minimum: number, maximum: number): string {
  if (typeof value !== "string") throw new TypeError(`${label} debe ser texto.`);
  const normalized = value.trim();
  if (normalized.length < minimum || normalized.length > maximum) {
    throw new TypeError(`${label} debe tener entre ${minimum} y ${maximum} caracteres.`);
  }
  return normalized;
}

function timestamp(value: unknown, label: string): Date {
  if (!(value instanceof Timestamp)) throw new TypeError(`${label} requiere un timestamp nativo.`);
  return value.toDate();
}

function boolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") throw new TypeError(`${label} debe ser booleano.`);
  return value;
}

function parseBusinessHours(value: unknown): BusinessHours {
  const data = record(value, "Horarios");
  exactKeys(data, BUSINESS_DAYS.map(({ key }) => key).sort(), "Horarios");
  return Object.freeze(Object.fromEntries(BUSINESS_DAYS.map(({ key }) => {
    const day = record(data[key], `Horario de ${key}`);
    exactKeys(day, ["close", "closed", "open"], `Horario de ${key}`);
    const open = text(day.open, "Hora de apertura", 5, 5);
    const close = text(day.close, "Hora de cierre", 5, 5);
    if (!TIME_PATTERN.test(open) || !TIME_PATTERN.test(close) || (!day.closed && open === close)) {
      throw new TypeError("Los horarios deben usar HH:mm y tener apertura y cierre diferentes.");
    }
    return [key, Object.freeze({ closed: boolean(day.closed, "closed"), open, close })];
  })) as Record<BusinessDay, BusinessDayHours>);
}

export function parsePublicSettings(
  value: unknown,
  establishmentId: string
): PublicEstablishmentSettings {
  const data = record(value, "Configuración pública");
  const legacy = hasExactKeys(data, LEGACY_PUBLIC_FIELDS);
  if (!legacy) exactKeys(data, CURRENT_PUBLIC_FIELDS, "Configuración pública");
  if (data.establishmentId !== establishmentId) {
    throw new TypeError("La configuración pública no pertenece al establecimiento.");
  }
  const contactEmail = text(data.contactEmail, "Correo", 3, 254).toLowerCase();
  if (!EMAIL_PATTERN.test(contactEmail)) throw new TypeError("El correo de contacto no es válido.");
  return Object.freeze({
    addressLine: legacy ? "" : text(data.addressLine, "Dirección", 0, 200),
    assistanceEnabled: boolean(data.assistanceEnabled, "assistanceEnabled"),
    brandName: text(data.brandName, "Nombre de marca", 2, 120),
    businessHours: legacy ? DEFAULT_BUSINESS_HOURS : parseBusinessHours(data.businessHours),
    contactEmail,
    contactPhone: legacy ? "" : text(data.contactPhone, "Teléfono", 0, 30),
    establishmentId,
    orderingEnabled: boolean(data.orderingEnabled, "orderingEnabled"),
    updatedAt: timestamp(data.updatedAt, "Configuración pública")
  });
}

export function parsePrivateSettings(
  value: unknown,
  establishmentId: string
): PrivateEstablishmentSettings {
  const data = record(value, "Configuración privada");
  exactKeys(data, PRIVATE_FIELDS, "Configuración privada");
  if (data.establishmentId !== establishmentId) {
    throw new TypeError("La configuración privada no pertenece al establecimiento.");
  }
  return Object.freeze({
    establishmentId,
    mercadoPagoEnabled: boolean(data.mercadoPagoEnabled, "mercadoPagoEnabled"),
    updatedAt: timestamp(data.updatedAt, "Configuración privada"),
    whatsappEnabled: boolean(data.whatsappEnabled, "whatsappEnabled")
  });
}

export function settingsDraft(settings: EstablishmentSettings): EstablishmentSettingsDraft {
  return Object.freeze({
    addressLine: settings.public.addressLine,
    assistanceEnabled: settings.public.assistanceEnabled,
    brandName: settings.public.brandName,
    businessHours: settings.public.businessHours,
    contactEmail: settings.public.contactEmail,
    contactPhone: settings.public.contactPhone,
    mercadoPagoEnabled: settings.private.mercadoPagoEnabled,
    orderingEnabled: settings.public.orderingEnabled,
    whatsappEnabled: settings.private.whatsappEnabled
  });
}

export function validateSettingsDraft(
  value: EstablishmentSettingsDraft
): EstablishmentSettingsDraft {
  const contactEmail = text(value.contactEmail, "Correo", 3, 254).toLowerCase();
  if (!EMAIL_PATTERN.test(contactEmail)) throw new TypeError("Ingresá un correo de contacto válido.");
  return Object.freeze({
    addressLine: text(value.addressLine, "Dirección", 0, 200),
    assistanceEnabled: boolean(value.assistanceEnabled, "assistanceEnabled"),
    brandName: text(value.brandName, "Nombre de marca", 2, 120),
    businessHours: parseBusinessHours(value.businessHours),
    contactEmail,
    contactPhone: text(value.contactPhone, "Teléfono", 0, 30),
    mercadoPagoEnabled: boolean(value.mercadoPagoEnabled, "mercadoPagoEnabled"),
    orderingEnabled: boolean(value.orderingEnabled, "orderingEnabled"),
    whatsappEnabled: boolean(value.whatsappEnabled, "whatsappEnabled")
  });
}
