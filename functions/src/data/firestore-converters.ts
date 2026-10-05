import {
  Timestamp,
  type DocumentData,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type WithFieldValue
} from "firebase-admin/firestore";

import {
  parseIsoTimestamp,
  parseAssistanceRequest,
  parseOrder,
  parsePayment,
  parseProduct,
  type IsoTimestamp,
  type AssistanceRequestContract,
  type OrderContract,
  type PaymentContract,
  type ProductContract
} from "@mesaflow/contracts";

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} debe ser un objeto.`);
  }
  return value as Record<string, unknown>;
}

function timestampToIso(value: unknown, label: string): IsoTimestamp {
  if (!(value instanceof Timestamp)) {
    throw new TypeError(`${label} debe ser Timestamp de Firestore.`);
  }
  return parseIsoTimestamp(value.toDate().toISOString());
}

function isoToTimestamp(value: unknown): Timestamp {
  return Timestamp.fromDate(new Date(parseIsoTimestamp(value)));
}

function createConverter<T>(
  parse: (value: unknown) => T,
  serialize: (value: T) => DocumentData,
  deserialize: (value: DocumentData) => unknown
): FirestoreDataConverter<T> {
  return {
    toFirestore(modelObject: WithFieldValue<T>): DocumentData {
      return serialize(parse(modelObject));
    },
    fromFirestore(snapshot: QueryDocumentSnapshot<DocumentData>): T {
      return parse(deserialize(snapshot.data()));
    }
  };
}

export const productConverter = createConverter<ProductContract>(
  parseProduct,
  (product) => ({
    ...product,
    createdAt: isoToTimestamp(product.createdAt),
    updatedAt: isoToTimestamp(product.updatedAt)
  }),
  (raw) => {
    const product = record(raw, "Product Firestore");
    return {
      ...product,
      createdAt: timestampToIso(product.createdAt, "createdAt"),
      updatedAt: timestampToIso(product.updatedAt, "updatedAt")
    };
  }
);

export const orderConverter = createConverter<OrderContract>(
  parseOrder,
  (order) => ({
    ...order,
    statusTimestamps: Object.fromEntries(
      Object.entries(order.statusTimestamps).map(([status, timestamp]) => [
        status,
        isoToTimestamp(timestamp)
      ])
    ),
    createdAt: isoToTimestamp(order.createdAt),
    updatedAt: isoToTimestamp(order.updatedAt)
  }),
  (raw) => {
    const order = record(raw, "Order Firestore");
    const rawStatusTimestamps = record(order.statusTimestamps, "statusTimestamps");
    return {
      ...order,
      statusTimestamps: Object.fromEntries(
        Object.entries(rawStatusTimestamps).map(([status, timestamp]) => [
          status,
          timestampToIso(timestamp, `statusTimestamps.${status}`)
        ])
      ),
      createdAt: timestampToIso(order.createdAt, "createdAt"),
      updatedAt: timestampToIso(order.updatedAt, "updatedAt")
    };
  }
);

export const assistanceRequestConverter = createConverter<AssistanceRequestContract>(
  parseAssistanceRequest,
  (request) => ({
    ...request,
    createdAt: isoToTimestamp(request.createdAt),
    updatedAt: isoToTimestamp(request.updatedAt)
  }),
  (raw) => {
    const request = record(raw, "AssistanceRequest Firestore");
    return {
      ...request,
      createdAt: timestampToIso(request.createdAt, "createdAt"),
      updatedAt: timestampToIso(request.updatedAt, "updatedAt")
    };
  }
);

export const paymentConverter = createConverter<PaymentContract>(
  parsePayment,
  (payment) => ({
    ...payment,
    createdAt: isoToTimestamp(payment.createdAt),
    updatedAt: isoToTimestamp(payment.updatedAt)
  }),
  (raw) => {
    const payment = record(raw, "Payment Firestore");
    return {
      ...payment,
      createdAt: timestampToIso(payment.createdAt, "createdAt"),
      updatedAt: timestampToIso(payment.updatedAt, "updatedAt")
    };
  }
);
