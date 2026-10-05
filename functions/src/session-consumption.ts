import {
  CONTRACT_LIMITS,
  parseId,
  type OrderContract,
  type PaymentContract,
  type TableSessionStatus
} from "@mesaflow/contracts";

export type ConsumptionErrorCode =
  | "failed-precondition"
  | "invalid-argument"
  | "permission-denied"
  | "unauthenticated";

export type ConsumptionFailureReason =
  | "consumption-inconsistent"
  | "session-unavailable";

export class ConsumptionError extends Error {
  constructor(
    readonly code: ConsumptionErrorCode,
    readonly reason: ConsumptionFailureReason,
    message: string
  ) {
    super(message);
    this.name = "ConsumptionError";
  }
}

export interface ConsumptionCommand {
  readonly uid: string;
  readonly establishmentId: string;
  readonly sessionId: string;
  readonly tableId: string;
  readonly calculatedAt: Date;
}

export interface ConsumptionResult {
  readonly sessionId: string;
  readonly tableId: string;
  readonly sessionStatus: TableSessionStatus;
  readonly currency: string;
  readonly orderCount: number;
  readonly itemCount: number;
  readonly subtotalMinor: number;
  readonly paidMinor: number;
  readonly balanceMinor: number;
  readonly calculatedAt: string;
}

export interface ConsumptionTotals {
  readonly orderCount: number;
  readonly itemCount: number;
  readonly subtotalMinor: number;
  readonly paidMinor: number;
  readonly balanceMinor: number;
}

export interface ConsumptionRepository {
  get(command: ConsumptionCommand): Promise<ConsumptionResult>;
}

function inconsistent(message: string): never {
  throw new ConsumptionError(
    "failed-precondition",
    "consumption-inconsistent",
    message
  );
}

function safeSum(total: number, amount: number): number {
  const next = total + amount;
  if (!Number.isSafeInteger(next) || next > CONTRACT_LIMITS.maxMinorAmount) {
    inconsistent("El consumo supera el límite permitido.");
  }
  return next;
}

export function calculateConsumption(
  orders: readonly OrderContract[],
  payments: readonly PaymentContract[],
  currency: string
): ConsumptionTotals {
  const validOrders = orders.filter((order) => order.status !== "cancelled");
  const subtotalMinor = validOrders.reduce(
    (total, order) => order.currency === currency
      ? safeSum(total, order.totalMinor)
      : inconsistent("Un pedido tiene una moneda distinta a la sesión."),
    0
  );
  const itemCount = validOrders.reduce((total, order) => {
    const next = total + order.items.reduce((sum, item) => sum + item.quantity, 0);
    return Number.isSafeInteger(next)
      ? next
      : inconsistent("La cantidad de productos del consumo no es válida.");
  }, 0);
  const paidMinor = payments
    .filter((payment) => payment.status === "approved")
    .reduce(
      (total, payment) => payment.currency === currency
        ? safeSum(total, payment.amountMinor)
        : inconsistent("Un pago aprobado tiene una moneda distinta a la sesión."),
      0
    );
  const balanceMinor = subtotalMinor - paidMinor;
  if (!Number.isSafeInteger(balanceMinor) || balanceMinor < 0) {
    inconsistent("Los pagos aprobados superan el consumo válido.");
  }
  return Object.freeze({
    orderCount: validOrders.length,
    itemCount,
    subtotalMinor,
    paidMinor,
    balanceMinor
  });
}

function invalid(message: string): never {
  throw new ConsumptionError("invalid-argument", "session-unavailable", message);
}

function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    invalid("La consulta de consumo debe ser un objeto.");
  }
  return value as Record<string, unknown>;
}

function id(value: unknown, label: string): string {
  try {
    return parseId(value, label);
  } catch {
    return invalid(`${label} no es válido.`);
  }
}

export async function getSessionConsumption(
  data: unknown,
  uid: string | undefined,
  repository: ConsumptionRepository,
  now = new Date()
): Promise<ConsumptionResult> {
  if (!uid) {
    throw new ConsumptionError(
      "unauthenticated",
      "session-unavailable",
      "Iniciá una sesión de mesa para consultar el consumo."
    );
  }
  const input = record(data);
  const fields = ["establishmentId", "sessionId", "tableId"];
  const actual = Object.keys(input).sort();
  if (actual.length !== fields.length ||
      actual.some((key, index) => key !== [...fields].sort()[index])) {
    invalid("La consulta de consumo contiene campos inválidos.");
  }
  if (Number.isNaN(now.getTime())) invalid("No se pudo establecer el momento del cálculo.");
  return repository.get(Object.freeze({
    uid: id(uid, "uid"),
    establishmentId: id(input.establishmentId, "establishmentId"),
    sessionId: id(input.sessionId, "sessionId"),
    tableId: id(input.tableId, "tableId"),
    calculatedAt: new Date(now)
  }));
}
