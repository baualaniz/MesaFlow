import {
  getFirestore,
  Timestamp,
  type DocumentData,
  type DocumentSnapshot,
  type Firestore
} from "firebase-admin/firestore";

import {
  CONTRACT_LIMITS,
  parseCurrency,
  parseMinorAmount,
  parseOrder,
  type OrderContract,
  type ProductContract
} from "@mesaflow/contracts";

import {
  CreateOrderError,
  type CreateOrderCommand,
  type CreatedOrderResult,
  type CreateOrderRepository
} from "../create-order.js";
import { orderConverter, productConverter } from "./firestore-converters.js";

function rawData(snapshot: DocumentSnapshot, message: string): DocumentData {
  if (!snapshot.exists) {
    throw new CreateOrderError("permission-denied", "session-unavailable", message);
  }
  return snapshot.data() ?? {};
}

function resultFromOrder(orderId: string, order: OrderContract): CreatedOrderResult {
  return Object.freeze({
    orderId,
    status: "created" as const,
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    totalMinor: order.totalMinor,
    currency: order.currency,
    createdAt: order.createdAt
  });
}

function requireSessionAccess(
  command: CreateOrderCommand,
  establishment: DocumentData,
  table: DocumentData,
  session: DocumentData,
  participant: DocumentData
): { currency: string; subtotalMinor: number; paidMinor: number } {
  if (establishment.active !== true) {
    throw new CreateOrderError(
      "permission-denied",
      "session-unavailable",
      "El establecimiento no está disponible."
    );
  }
  let currency: string;
  let subtotalMinor: number;
  let paidMinor: number;
  try {
    currency = parseCurrency(establishment.currency);
    subtotalMinor = parseMinorAmount(session.subtotalMinor, "subtotalMinor");
    paidMinor = parseMinorAmount(session.paidMinor, "paidMinor");
  } catch (error) {
    throw new TypeError("La sesión contiene importes o moneda inválidos.", { cause: error });
  }
  if (
    table.establishmentId !== command.establishmentId ||
    table.active !== true ||
    table.currentSessionId !== command.sessionId ||
    session.establishmentId !== command.establishmentId ||
    session.tableId !== command.tableId ||
    session.status !== "open" ||
    participant.establishmentId !== command.establishmentId ||
    participant.sessionId !== command.sessionId ||
    participant.uid !== command.uid ||
    participant.active !== true
  ) {
    throw new CreateOrderError(
      "permission-denied",
      "session-unavailable",
      "La sesión de mesa ya no admite pedidos."
    );
  }
  return { currency, subtotalMinor, paidMinor };
}

function requireProduct(
  product: ProductContract | undefined,
  establishmentId: string,
  currency: string
): ProductContract {
  if (
    product === undefined ||
    product.establishmentId !== establishmentId ||
    product.active !== true ||
    product.available !== true ||
    product.currency !== currency
  ) {
    throw new CreateOrderError(
      "failed-precondition",
      "product-unavailable",
      "Uno de los productos ya no está disponible."
    );
  }
  return product;
}

export class FirestoreOrderRepository implements CreateOrderRepository {
  constructor(private readonly firestore: Firestore = getFirestore()) {}

  async create(command: CreateOrderCommand): Promise<CreatedOrderResult> {
    const establishmentRef = this.firestore.doc(
      `establishments/${command.establishmentId}`
    );
    const tableRef = establishmentRef.collection("tables").doc(command.tableId);
    const sessionRef = establishmentRef.collection("tableSessions").doc(command.sessionId);
    const participantRef = sessionRef.collection("participants").doc(command.uid);
    const orderRef = establishmentRef
      .collection("orders")
      .doc(command.orderId)
      .withConverter(orderConverter);

    return this.firestore.runTransaction(async (transaction) => {
      const existing = await transaction.get(orderRef);
      if (existing.exists) {
        const order = existing.data();
        if (order === undefined || order.establishmentId !== command.establishmentId ||
            order.sessionId !== command.sessionId || order.tableId !== command.tableId ||
            order.customerUid !== command.uid || order.status !== "created") {
          throw new CreateOrderError(
            "permission-denied",
            "session-unavailable",
            "El identificador del pedido no corresponde a esta sesión."
          );
        }
        return resultFromOrder(existing.id, order);
      }

      const productRefs = command.items.map((item) => establishmentRef
        .collection("products")
        .doc(item.productId)
        .withConverter(productConverter));
      const [establishmentSnapshot, tableSnapshot, sessionSnapshot, participantSnapshot,
        ...productSnapshots] = await Promise.all([
        transaction.get(establishmentRef),
        transaction.get(tableRef),
        transaction.get(sessionRef),
        transaction.get(participantRef),
        ...productRefs.map((reference) => transaction.get(reference))
      ]);
      const access = requireSessionAccess(
        command,
        rawData(establishmentSnapshot, "El establecimiento no existe."),
        rawData(tableSnapshot, "La mesa no existe."),
        rawData(sessionSnapshot, "La sesión no existe."),
        rawData(participantSnapshot, "La participación no existe.")
      );

      const products = productSnapshots.map((snapshot) =>
        requireProduct(snapshot.data(), command.establishmentId, access.currency));
      const categoryIds = [...new Set(products.map((product) => product.categoryId))];
      const categorySnapshots = await Promise.all(categoryIds.map((categoryId) =>
        transaction.get(establishmentRef.collection("categories").doc(categoryId))));
      if (categorySnapshots.some((snapshot) => !snapshot.exists ||
          snapshot.data()?.establishmentId !== command.establishmentId ||
          snapshot.data()?.active !== true)) {
        throw new CreateOrderError(
          "failed-precondition",
          "product-unavailable",
          "Una categoría del pedido ya no está disponible."
        );
      }

      const items = command.items.map((draft, index) => {
        const product = products[index];
        if (product === undefined) {
          throw new TypeError("No se pudo asociar el producto con su línea.");
        }
        const lineTotalMinor = product.priceMinor * draft.quantity;
        if (!Number.isSafeInteger(lineTotalMinor) ||
            lineTotalMinor > CONTRACT_LIMITS.maxMinorAmount) {
          throw new CreateOrderError(
            "failed-precondition",
            "product-unavailable",
            "El importe de un producto supera el límite permitido."
          );
        }
        return {
          productId: draft.productId,
          name: product.name,
          unitPriceMinor: product.priceMinor,
          quantity: draft.quantity,
          lineTotalMinor,
          notes: draft.notes
        };
      });
      const totalMinor = items.reduce((sum, item) => sum + item.lineTotalMinor, 0);
      const nextSubtotalMinor = access.subtotalMinor + totalMinor;
      const nextBalanceMinor = nextSubtotalMinor - access.paidMinor;
      if (!Number.isSafeInteger(totalMinor) || totalMinor > CONTRACT_LIMITS.maxMinorAmount ||
          !Number.isSafeInteger(nextSubtotalMinor) ||
          nextSubtotalMinor > CONTRACT_LIMITS.maxMinorAmount || nextBalanceMinor < 0) {
        throw new CreateOrderError(
          "failed-precondition",
          "invalid-cart",
          "El total del pedido supera el límite permitido."
        );
      }

      const timestamp = command.createdAt.toISOString();
      const order = parseOrder({
        establishmentId: command.establishmentId,
        sessionId: command.sessionId,
        tableId: command.tableId,
        customerUid: command.uid,
        status: "created",
        items,
        subtotalMinor: totalMinor,
        totalMinor,
        currency: access.currency,
        notes: null,
        statusTimestamps: { created: timestamp },
        createdAt: timestamp,
        updatedAt: timestamp
      });
      transaction.create(orderRef, order);
      transaction.update(sessionRef, {
        subtotalMinor: nextSubtotalMinor,
        balanceMinor: nextBalanceMinor,
        updatedAt: Timestamp.fromDate(command.createdAt)
      });
      return resultFromOrder(command.orderId, order);
    });
  }
}
