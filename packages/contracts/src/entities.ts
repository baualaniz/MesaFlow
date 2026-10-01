import type {
  AssistanceStatus, AssistanceType, CurrencyCode, IsoTimestamp, PaymentStatus,
  Role, TableSessionStatus
} from "./domain.js";

export interface Establishment {
  readonly name: string;
  readonly slug: string;
  readonly timezone: string;
  readonly currency: CurrencyCode;
  readonly active: boolean;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

export interface Member {
  readonly establishmentId: string;
  readonly uid: string;
  readonly role: Role;
  readonly permissions: readonly string[];
  readonly active: boolean;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

export interface Table {
  readonly establishmentId: string;
  readonly number: number;
  readonly name: string;
  readonly qrTokenHash: string;
  readonly qrVersion: number;
  readonly active: boolean;
  readonly currentSessionId: string | null;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

export interface TableSession {
  readonly establishmentId: string;
  readonly tableId: string;
  readonly status: TableSessionStatus;
  readonly subtotalMinor: number;
  readonly paidMinor: number;
  readonly balanceMinor: number;
  readonly openedAt: IsoTimestamp;
  readonly closedAt: IsoTimestamp | null;
  readonly updatedAt: IsoTimestamp;
}

export interface AssistanceRequest {
  readonly establishmentId: string;
  readonly sessionId: string;
  readonly tableId: string;
  readonly customerUid: string;
  readonly type: AssistanceType;
  readonly status: AssistanceStatus;
  readonly acknowledgedBy: string | null;
  readonly resolvedBy: string | null;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

export interface Payment {
  readonly establishmentId: string;
  readonly sessionId: string;
  readonly provider: "mercado_pago";
  readonly externalId: string | null;
  readonly idempotencyKey: string;
  readonly status: PaymentStatus;
  readonly amountMinor: number;
  readonly currency: CurrencyCode;
  readonly providerStatus: string | null;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}
