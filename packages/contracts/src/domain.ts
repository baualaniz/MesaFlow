export const ROLES = ["owner", "manager", "staff", "kitchen"] as const;
export const ORDER_STATUSES = [
  "created", "confirmed", "preparing", "ready", "delivered", "completed", "cancelled"
] as const;
export const TABLE_SESSION_STATUSES = [
  "open", "payment_pending", "paid", "closed", "cancelled"
] as const;
export const PAYMENT_STATUSES = [
  "pending", "approved", "rejected", "cancelled", "refunded", "charged_back"
] as const;
export const ASSISTANCE_TYPES = ["waiter", "bill", "other"] as const;
export const ASSISTANCE_STATUSES = [
  "pending", "acknowledged", "resolved", "cancelled"
] as const;

export type Role = typeof ROLES[number];
export type OrderStatus = typeof ORDER_STATUSES[number];
export type TableSessionStatus = typeof TABLE_SESSION_STATUSES[number];
export type PaymentStatus = typeof PAYMENT_STATUSES[number];
export type AssistanceType = typeof ASSISTANCE_TYPES[number];
export type AssistanceStatus = typeof ASSISTANCE_STATUSES[number];
export type IsoTimestamp = string & { readonly __isoTimestamp: unique symbol };
export type CurrencyCode = string & { readonly __currencyCode: unique symbol };

export const CONTRACT_LIMITS = Object.freeze({
  maxMinorAmount: 9_000_000_000_000,
  maxOrderItems: 50,
  maxItemQuantity: 99,
  currencyFractionDigits: 2
});

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/u;
const CURRENCY_PATTERN = /^[A-Z]{3}$/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!isRecord(value)) throw new TypeError(`${label} debe ser un objeto.`);
}

function assertExactKeys(value: Record<string, unknown>, expected: readonly string[], label: string) {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  if (actual.length !== sortedExpected.length ||
      actual.some((key, index) => key !== sortedExpected[index])) {
    throw new TypeError(`${label} contiene campos ausentes o desconocidos.`);
  }
}

function parseString(value: unknown, label: string, min = 1, max = 500): string {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max) {
    throw new TypeError(`${label} debe ser texto de ${min} a ${max} caracteres.`);
  }
  return value.trim();
}

export function parseId(value: unknown, label = "id"): string {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) {
    throw new TypeError(`${label} no es un identificador válido.`);
  }
  return value;
}

export function parseEnum<const T extends readonly string[]>(
  value: unknown, allowed: T, label: string
): T[number] {
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    throw new TypeError(`${label} no pertenece al enum permitido.`);
  }
  return value as T[number];
}

export function parseCurrency(value: unknown): CurrencyCode {
  if (typeof value !== "string" || !CURRENCY_PATTERN.test(value)) {
    throw new TypeError("currency debe ser un código ISO 4217 en mayúsculas.");
  }
  return value as CurrencyCode;
}

export function parseMinorAmount(value: unknown, label = "amountMinor"): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 ||
      (value as number) > CONTRACT_LIMITS.maxMinorAmount) {
    throw new TypeError(`${label} debe ser un entero no negativo dentro del límite.`);
  }
  return value as number;
}

export interface Money {
  readonly amountMinor: number;
  readonly currency: CurrencyCode;
}

export function parseMoney(value: unknown): Money {
  assertRecord(value, "Money");
  assertExactKeys(value, ["amountMinor", "currency"], "Money");
  return Object.freeze({
    amountMinor: parseMinorAmount(value.amountMinor),
    currency: parseCurrency(value.currency)
  });
}

export function minorToDecimalString(amountMinor: unknown): string {
  const amount = parseMinorAmount(amountMinor);
  const divisor = 10 ** CONTRACT_LIMITS.currencyFractionDigits;
  const whole = Math.floor(amount / divisor);
  const fraction = String(amount % divisor).padStart(CONTRACT_LIMITS.currencyFractionDigits, "0");
  return `${whole}.${fraction}`;
}

export function parseIsoTimestamp(value: unknown): IsoTimestamp {
  if (typeof value !== "string" || !ISO_TIMESTAMP.test(value) ||
      Number.isNaN(Date.parse(value)) || new Date(value).toISOString() !== value) {
    throw new TypeError("timestamp debe usar UTC RFC3339 con milisegundos.");
  }
  return value as IsoTimestamp;
}

const PRODUCT_FIELDS = [
  "establishmentId", "categoryId", "name", "description", "priceMinor", "currency",
  "imagePath", "available", "active", "sortOrder", "createdAt", "updatedAt"
] as const;

export interface ProductContract {
  readonly establishmentId: string;
  readonly categoryId: string;
  readonly name: string;
  readonly description: string;
  readonly priceMinor: number;
  readonly currency: CurrencyCode;
  readonly imagePath: string | null;
  readonly available: boolean;
  readonly active: boolean;
  readonly sortOrder: number;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

export function parseProduct(value: unknown): ProductContract {
  assertRecord(value, "Product");
  assertExactKeys(value, PRODUCT_FIELDS, "Product");
  if (typeof value.available !== "boolean" || typeof value.active !== "boolean") {
    throw new TypeError("available y active deben ser booleanos.");
  }
  if (!Number.isSafeInteger(value.sortOrder) || (value.sortOrder as number) < 0) {
    throw new TypeError("sortOrder debe ser un entero no negativo.");
  }
  const imagePath = value.imagePath === null ? null : parseString(value.imagePath, "imagePath", 1, 200);
  return Object.freeze({
    establishmentId: parseId(value.establishmentId, "establishmentId"),
    categoryId: parseId(value.categoryId, "categoryId"),
    name: parseString(value.name, "name", 2, 120),
    description: parseString(value.description, "description", 0, 500),
    priceMinor: parseMinorAmount(value.priceMinor, "priceMinor"),
    currency: parseCurrency(value.currency),
    imagePath,
    available: value.available,
    active: value.active,
    sortOrder: value.sortOrder as number,
    createdAt: parseIsoTimestamp(value.createdAt),
    updatedAt: parseIsoTimestamp(value.updatedAt)
  });
}

const ORDER_ITEM_FIELDS = [
  "productId", "name", "unitPriceMinor", "quantity", "lineTotalMinor", "notes"
] as const;

export interface OrderItemContract {
  readonly productId: string;
  readonly name: string;
  readonly unitPriceMinor: number;
  readonly quantity: number;
  readonly lineTotalMinor: number;
  readonly notes: string | null;
}

export function parseOrderItem(value: unknown): OrderItemContract {
  assertRecord(value, "OrderItem");
  assertExactKeys(value, ORDER_ITEM_FIELDS, "OrderItem");
  const unitPriceMinor = parseMinorAmount(value.unitPriceMinor, "unitPriceMinor");
  if (!Number.isSafeInteger(value.quantity) || (value.quantity as number) < 1 ||
      (value.quantity as number) > CONTRACT_LIMITS.maxItemQuantity) {
    throw new TypeError("quantity está fuera del límite permitido.");
  }
  const quantity = value.quantity as number;
  const lineTotalMinor = parseMinorAmount(value.lineTotalMinor, "lineTotalMinor");
  if (!Number.isSafeInteger(unitPriceMinor * quantity) || lineTotalMinor !== unitPriceMinor * quantity) {
    throw new TypeError("lineTotalMinor no coincide con precio por cantidad.");
  }
  return Object.freeze({
    productId: parseId(value.productId, "productId"),
    name: parseString(value.name, "name", 2, 120),
    unitPriceMinor,
    quantity,
    lineTotalMinor,
    notes: value.notes === null ? null : parseString(value.notes, "notes", 1, 300)
  });
}

const ORDER_FIELDS = [
  "establishmentId", "sessionId", "tableId", "customerUid", "status", "items",
  "subtotalMinor", "totalMinor", "currency", "notes", "statusTimestamps", "createdAt", "updatedAt"
] as const;

export interface OrderContract {
  readonly establishmentId: string;
  readonly sessionId: string;
  readonly tableId: string;
  readonly customerUid: string;
  readonly status: OrderStatus;
  readonly items: readonly OrderItemContract[];
  readonly subtotalMinor: number;
  readonly totalMinor: number;
  readonly currency: CurrencyCode;
  readonly notes: string | null;
  readonly statusTimestamps: Readonly<Record<string, IsoTimestamp>>;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

export function parseOrder(value: unknown): OrderContract {
  assertRecord(value, "Order");
  assertExactKeys(value, ORDER_FIELDS, "Order");
  if (!Array.isArray(value.items) || value.items.length < 1 ||
      value.items.length > CONTRACT_LIMITS.maxOrderItems) {
    throw new TypeError("items debe contener entre 1 y 50 líneas.");
  }
  const items = value.items.map(parseOrderItem);
  const subtotalMinor = parseMinorAmount(value.subtotalMinor, "subtotalMinor");
  const totalMinor = parseMinorAmount(value.totalMinor, "totalMinor");
  const calculated = items.reduce((sum, item) => sum + item.lineTotalMinor, 0);
  if (!Number.isSafeInteger(calculated) || calculated !== subtotalMinor || totalMinor !== subtotalMinor) {
    throw new TypeError("Los totales del pedido no coinciden con sus líneas.");
  }
  assertRecord(value.statusTimestamps, "statusTimestamps");
  const statusTimestamps = Object.freeze(Object.fromEntries(
    Object.entries(value.statusTimestamps).map(([key, timestamp]) => [
      parseEnum(key, ORDER_STATUSES, "statusTimestamps key"), parseIsoTimestamp(timestamp)
    ])
  ));
  const status = parseEnum(value.status, ORDER_STATUSES, "status");
  if (!statusTimestamps[status]) throw new TypeError("Falta el timestamp del estado actual.");
  return Object.freeze({
    establishmentId: parseId(value.establishmentId, "establishmentId"),
    sessionId: parseId(value.sessionId, "sessionId"),
    tableId: parseId(value.tableId, "tableId"),
    customerUid: parseId(value.customerUid, "customerUid"),
    status,
    items: Object.freeze(items),
    subtotalMinor,
    totalMinor,
    currency: parseCurrency(value.currency),
    notes: value.notes === null ? null : parseString(value.notes, "notes", 1, 500),
    statusTimestamps,
    createdAt: parseIsoTimestamp(value.createdAt),
    updatedAt: parseIsoTimestamp(value.updatedAt)
  });
}
