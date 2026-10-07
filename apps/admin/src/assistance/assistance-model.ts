import {
  parseAssistanceRequest,
  type AssistanceRequestContract,
  type AssistanceStatus,
  type AssistanceType
} from "@mesaflow/contracts";
import { Timestamp } from "firebase/firestore";

export interface AdminAssistanceRequest extends AssistanceRequestContract {
  readonly id: string;
}

export const ASSISTANCE_TYPE_LABELS: Readonly<Record<AssistanceType, string>> = Object.freeze({
  waiter: "Llamar al mozo",
  bill: "Pedir la cuenta",
  other: "Otra consulta"
});

export const ASSISTANCE_STATUS_LABELS: Readonly<Record<AssistanceStatus, string>> = Object.freeze({
  pending: "Pendiente",
  acknowledged: "En atención",
  resolved: "Resuelta",
  cancelled: "Cancelada"
});

function timestamp(value: unknown, label: string): string {
  if (!(value instanceof Timestamp)) throw new TypeError(`${label} debe ser Timestamp.`);
  return value.toDate().toISOString();
}

export function parseAdminAssistanceRequest(
  id: string,
  value: Record<string, unknown>,
  establishmentId: string
): AdminAssistanceRequest {
  if (id.length < 1 || value.establishmentId !== establishmentId) {
    throw new TypeError("La solicitud no pertenece al establecimiento activo.");
  }
  const request = parseAssistanceRequest({
    ...value,
    createdAt: timestamp(value.createdAt, "createdAt"),
    updatedAt: timestamp(value.updatedAt, "updatedAt")
  });
  return Object.freeze({ id, ...request });
}

export function assistanceTableLabel(tableId: string): string {
  const normalized = tableId.replace(/^mesa-/u, "").replaceAll("-", " ");
  return `Mesa ${normalized.toUpperCase()}`;
}

export function assistanceElapsed(createdAt: string, now = new Date()): string {
  const milliseconds = Math.max(0, now.getTime() - Date.parse(createdAt));
  const minutes = Math.floor(milliseconds / 60_000);
  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `Hace ${hours} h`;
}
