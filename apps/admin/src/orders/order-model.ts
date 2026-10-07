import {
  parseOrder,
  type OrderContract,
  type OrderStatus
} from "@mesaflow/contracts";
import { Timestamp } from "firebase/firestore";

export interface AdminOrder extends OrderContract {
  readonly id: string;
}

export const ORDER_STATUS_LABELS: Readonly<Record<OrderStatus, string>> = Object.freeze({
  cancelled: "Cancelado",
  completed: "Completado",
  confirmed: "Confirmado",
  created: "Nuevo",
  delivered: "Entregado",
  preparing: "En preparación",
  ready: "Listo"
});

export const ORDER_ACTION_LABELS: Readonly<Record<OrderStatus, string>> = Object.freeze({
  cancelled: "Cancelar pedido",
  completed: "Completar pedido",
  confirmed: "Confirmar pedido",
  created: "Volver a nuevo",
  delivered: "Marcar entregado",
  preparing: "Iniciar preparación",
  ready: "Marcar como listo"
});

function timestamp(value: unknown, label: string): string {
  if (!(value instanceof Timestamp)) throw new TypeError(`${label} debe ser Timestamp.`);
  return value.toDate().toISOString();
}

export function parseAdminOrder(
  id: string,
  value: Record<string, unknown>,
  establishmentId: string
): AdminOrder {
  if (id.length < 1 || value.establishmentId !== establishmentId) {
    throw new TypeError("El pedido no pertenece al establecimiento activo.");
  }
  if (value.statusTimestamps === null || typeof value.statusTimestamps !== "object" ||
      Array.isArray(value.statusTimestamps)) {
    throw new TypeError("statusTimestamps no es válido.");
  }
  const order = parseOrder({
    ...value,
    statusTimestamps: Object.fromEntries(Object.entries(value.statusTimestamps).map(
      ([status, value]) => [status, timestamp(value, `statusTimestamps.${status}`)]
    )),
    createdAt: timestamp(value.createdAt, "createdAt"),
    updatedAt: timestamp(value.updatedAt, "updatedAt")
  });
  return Object.freeze({ id, ...order });
}

export function formatOrderMoney(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(amountMinor / 100);
}

export function formatOrderTime(timestamp: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

export function tableLabel(tableId: string): string {
  const normalized = tableId.replace(/^mesa-/u, "").replaceAll("-", " ");
  return `Mesa ${normalized.toUpperCase()}`;
}
