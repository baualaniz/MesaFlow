import { Timestamp, type DocumentData } from "firebase-admin/firestore";

import type { OrderContract, PaymentStatus } from "@mesaflow/contracts";

export interface DailyMetric {
  readonly establishmentId: string;
  readonly date: string;
  readonly salesMinor: number;
  readonly approvedPayments: number;
  readonly completedOrders: number;
  readonly activeOrders: number;
  readonly productQuantities: Readonly<Record<string, number>>;
  readonly updatedAt: Timestamp;
}

function nonNegativeInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new TypeError(`${label} debe ser un entero no negativo.`);
  }
  return value as number;
}

function addSafe(left: number, right: number, label: string): number {
  const result = left + right;
  if (!Number.isSafeInteger(result) || result < 0) {
    throw new TypeError(`${label} quedó fuera del rango permitido.`);
  }
  return result;
}

export function localMetricDate(value: Date, timeZone: string): string {
  if (Number.isNaN(value.getTime()) || typeof timeZone !== "string" || timeZone.length < 1) {
    throw new TypeError("No se pudo determinar la fecha local de la métrica.");
  }
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(value);
  } catch (error) {
    throw new TypeError("La zona horaria del establecimiento no es válida.", { cause: error });
  }
  const field = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";
  const date = `${field("year")}-${field("month")}-${field("day")}`;
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)) {
    throw new TypeError("No se pudo construir la fecha local de la métrica.");
  }
  return date;
}

export function parseDailyMetric(
  data: DocumentData | undefined,
  establishmentId: string,
  date: string,
  updatedAt: Date
): DailyMetric {
  if (data === undefined) {
    return Object.freeze({
      establishmentId,
      date,
      salesMinor: 0,
      approvedPayments: 0,
      completedOrders: 0,
      activeOrders: 0,
      productQuantities: Object.freeze({}),
      updatedAt: Timestamp.fromDate(updatedAt)
    });
  }
  if (data.establishmentId !== establishmentId || data.date !== date ||
      !(data.updatedAt instanceof Timestamp) || data.productQuantities === null ||
      typeof data.productQuantities !== "object" || Array.isArray(data.productQuantities)) {
    throw new TypeError("La métrica diaria almacenada no cumple el contrato.");
  }
  const quantities = Object.fromEntries(Object.entries(data.productQuantities).map(
    ([productId, quantity]) => [productId, nonNegativeInteger(quantity, productId)]
  ));
  return Object.freeze({
    establishmentId,
    date,
    salesMinor: nonNegativeInteger(data.salesMinor, "salesMinor"),
    approvedPayments: nonNegativeInteger(data.approvedPayments, "approvedPayments"),
    completedOrders: nonNegativeInteger(data.completedOrders, "completedOrders"),
    activeOrders: nonNegativeInteger(data.activeOrders, "activeOrders"),
    productQuantities: Object.freeze(quantities),
    updatedAt: data.updatedAt
  });
}

function withUpdate(metric: DailyMetric, changes: Partial<DailyMetric>, now: Date): DailyMetric {
  return Object.freeze({ ...metric, ...changes, updatedAt: Timestamp.fromDate(now) });
}

export function recordCreatedOrder(
  metric: DailyMetric,
  order: Pick<OrderContract, "items">,
  now: Date
): DailyMetric {
  const quantities = { ...metric.productQuantities };
  for (const item of order.items) {
    quantities[item.productId] = addSafe(
      quantities[item.productId] ?? 0,
      item.quantity,
      `productQuantities.${item.productId}`
    );
  }
  return withUpdate(metric, {
    activeOrders: addSafe(metric.activeOrders, 1, "activeOrders"),
    productQuantities: Object.freeze(quantities)
  }, now);
}

export function recordOrderTransition(
  metric: DailyMetric,
  order: Pick<OrderContract, "items">,
  nextStatus: "completed" | "cancelled",
  now: Date
): DailyMetric {
  const quantities = { ...metric.productQuantities };
  if (nextStatus === "cancelled") {
    for (const item of order.items) {
      quantities[item.productId] = Math.max(0, (quantities[item.productId] ?? 0) - item.quantity);
    }
  }
  return withUpdate(metric, {
    activeOrders: Math.max(0, metric.activeOrders - 1),
    completedOrders: nextStatus === "completed"
      ? addSafe(metric.completedOrders, 1, "completedOrders")
      : metric.completedOrders,
    productQuantities: Object.freeze(quantities)
  }, now);
}

export function recordPaymentTransition(
  metric: DailyMetric,
  previousStatus: PaymentStatus | undefined,
  nextStatus: PaymentStatus,
  amountMinor: number,
  now: Date
): DailyMetric {
  const previousContribution = previousStatus === "approved" ? amountMinor : 0;
  const nextContribution = nextStatus === "approved" ? amountMinor : 0;
  const countDelta = Number(nextStatus === "approved") - Number(previousStatus === "approved");
  return withUpdate(metric, {
    salesMinor: addSafe(
      metric.salesMinor,
      nextContribution - previousContribution,
      "salesMinor"
    ),
    approvedPayments: addSafe(metric.approvedPayments, countDelta, "approvedPayments")
  }, now);
}

export function serializeDailyMetric(metric: DailyMetric): DocumentData {
  return {
    establishmentId: metric.establishmentId,
    date: metric.date,
    salesMinor: metric.salesMinor,
    approvedPayments: metric.approvedPayments,
    completedOrders: metric.completedOrders,
    activeOrders: metric.activeOrders,
    productQuantities: { ...metric.productQuantities },
    updatedAt: metric.updatedAt
  };
}
