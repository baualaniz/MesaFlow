import { parseProduct, type ProductContract } from "@mesaflow/contracts";
import { Timestamp } from "firebase/firestore";

export interface AdminCategory {
  readonly id: string;
  readonly establishmentId: string;
  readonly name: string;
  readonly description: string;
  readonly sortOrder: number;
  readonly active: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface AdminProduct extends Omit<ProductContract, "createdAt" | "updatedAt"> {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

const CATEGORY_FIELDS = [
  "active", "createdAt", "description", "establishmentId", "name", "sortOrder", "updatedAt"
].sort();

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} no es un objeto.`);
  }
  return value as Record<string, unknown>;
}

function exactFields(data: Record<string, unknown>, expected: readonly string[], label: string): void {
  const keys = Object.keys(data).sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new TypeError(`${label} contiene campos desconocidos.`);
  }
}

function timestamp(value: unknown, label: string): Date {
  if (!(value instanceof Timestamp)) throw new TypeError(`${label} no es un Timestamp nativo.`);
  return value.toDate();
}

function text(value: unknown, label: string, min: number, max: number): string {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max) {
    throw new TypeError(`${label} no es válido.`);
  }
  return value.trim();
}

export function parseAdminCategory(
  id: string,
  value: unknown,
  establishmentId: string
): AdminCategory {
  const data = record(value, "Category");
  exactFields(data, CATEGORY_FIELDS, "Category");
  if (data.establishmentId !== establishmentId || typeof data.active !== "boolean" ||
      !Number.isSafeInteger(data.sortOrder) || (data.sortOrder as number) < 0) {
    throw new TypeError("Category no cumple el contrato administrativo.");
  }
  return Object.freeze({
    id: text(id, "categoryId", 1, 128),
    establishmentId,
    name: text(data.name, "name", 2, 120),
    description: text(data.description, "description", 0, 500),
    sortOrder: data.sortOrder as number,
    active: data.active,
    createdAt: timestamp(data.createdAt, "createdAt"),
    updatedAt: timestamp(data.updatedAt, "updatedAt")
  });
}

export function parseAdminProduct(
  id: string,
  value: unknown,
  establishmentId: string
): AdminProduct {
  const data = record(value, "Product");
  const createdAt = timestamp(data.createdAt, "createdAt");
  const updatedAt = timestamp(data.updatedAt, "updatedAt");
  const product = parseProduct({
    ...data,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString()
  });
  if (product.establishmentId !== establishmentId) {
    throw new TypeError("Product pertenece a otro establecimiento.");
  }
  return Object.freeze({ ...product, id: text(id, "productId", 1, 128), createdAt, updatedAt });
}

export function formatCatalogMoney(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(amountMinor / 100);
}
