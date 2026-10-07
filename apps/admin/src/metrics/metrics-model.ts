import { Timestamp } from "firebase/firestore";

export interface AdminDailyMetric {
  readonly id: string;
  readonly establishmentId: string;
  readonly date: string;
  readonly salesMinor: number;
  readonly approvedPayments: number;
  readonly completedOrders: number;
  readonly activeOrders: number;
  readonly productQuantities: Readonly<Record<string, number>>;
  readonly updatedAt: string;
}

export interface MetricsSummary {
  readonly salesMinor: number;
  readonly approvedPayments: number;
  readonly completedOrders: number;
  readonly activeOrders: number;
  readonly topProducts: readonly { readonly productId: string; readonly quantity: number }[];
}

const FIELDS = Object.freeze([
  "activeOrders", "approvedPayments", "completedOrders", "date", "establishmentId",
  "productQuantities", "salesMinor", "updatedAt"
]);

function integer(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new TypeError(`${label} debe ser un entero no negativo.`);
  }
  return value as number;
}

export function parseAdminDailyMetric(
  id: string,
  value: Record<string, unknown>,
  establishmentId: string
): AdminDailyMetric {
  const actual = Object.keys(value).sort();
  if (actual.length !== FIELDS.length || actual.some((key, index) => key !== FIELDS[index]) ||
      id !== value.date || value.establishmentId !== establishmentId ||
      typeof value.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value.date) ||
      !(value.updatedAt instanceof Timestamp) || value.productQuantities === null ||
      typeof value.productQuantities !== "object" || Array.isArray(value.productQuantities)) {
    throw new TypeError("La métrica diaria no cumple el contrato.");
  }
  const productQuantities = Object.freeze(Object.fromEntries(
    Object.entries(value.productQuantities).map(([productId, quantity]) => {
      if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/u.test(productId)) {
        throw new TypeError("La métrica contiene un producto inválido.");
      }
      return [productId, integer(quantity, `productQuantities.${productId}`)];
    })
  ));
  return Object.freeze({
    id,
    establishmentId,
    date: value.date,
    salesMinor: integer(value.salesMinor, "salesMinor"),
    approvedPayments: integer(value.approvedPayments, "approvedPayments"),
    completedOrders: integer(value.completedOrders, "completedOrders"),
    activeOrders: integer(value.activeOrders, "activeOrders"),
    productQuantities,
    updatedAt: value.updatedAt.toDate().toISOString()
  });
}

export function summarizeMetrics(metrics: readonly AdminDailyMetric[]): MetricsSummary {
  const products: Record<string, number> = {};
  let salesMinor = 0;
  let approvedPayments = 0;
  let completedOrders = 0;
  let activeOrders = 0;
  for (const metric of metrics) {
    salesMinor += metric.salesMinor;
    approvedPayments += metric.approvedPayments;
    completedOrders += metric.completedOrders;
    activeOrders += metric.activeOrders;
    for (const [productId, quantity] of Object.entries(metric.productQuantities)) {
      products[productId] = (products[productId] ?? 0) + quantity;
    }
  }
  if (![salesMinor, approvedPayments, completedOrders, activeOrders].every(Number.isSafeInteger)) {
    throw new TypeError("El resumen de métricas supera el rango permitido.");
  }
  return Object.freeze({
    salesMinor,
    approvedPayments,
    completedOrders,
    activeOrders,
    topProducts: Object.freeze(Object.entries(products)
      .map(([productId, quantity]) => Object.freeze({ productId, quantity }))
      .sort((left, right) => right.quantity - left.quantity ||
        left.productId.localeCompare(right.productId))
      .slice(0, 5))
  });
}

export function formatMetricMoney(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(amountMinor / 100);
}

export function formatMetricDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" })
    .format(new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1, 12)));
}

export function productMetricLabel(productId: string): string {
  return productId.split("-").map((part) =>
    `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`
  ).join(" ");
}
