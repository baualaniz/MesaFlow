import { FirebaseError } from "firebase/app";
import {
  Timestamp,
  collection,
  doc,
  getDocs,
  limit,
  query,
  runTransaction,
  where,
  type DocumentData,
  type DocumentReference
} from "firebase/firestore";

import { adminFirestore } from "../firebase/firebase";
import { catalogId } from "./catalog-utils";
import { MENU_IMAGE_OPTIONS, type MenuImagePath } from "./image-options";
import type { AdminCategory, AdminProduct } from "./menu-model";

export interface CategoryDraft {
  readonly name: string;
  readonly description: string;
  readonly sortOrder: number;
  readonly active: boolean;
}

export interface ProductDraft {
  readonly categoryId: string;
  readonly name: string;
  readonly description: string;
  readonly priceMinor: number;
  readonly currency: string;
  readonly imagePath: MenuImagePath;
  readonly available: boolean;
  readonly active: boolean;
  readonly sortOrder: number;
}

function updatedAt(data: DocumentData | undefined): Date {
  if (!(data?.updatedAt instanceof Timestamp)) throw new Error("El registro cambió o ya no existe.");
  return data.updatedAt.toDate();
}

function ensureCurrent(data: DocumentData | undefined, expected: Date): void {
  if (updatedAt(data).toISOString() !== expected.toISOString()) {
    throw new Error("El registro cambió en otro dispositivo. Revisá la información actualizada.");
  }
}

function randomSuffix(): string {
  return [...crypto.getRandomValues(new Uint8Array(3))]
    .map((value) => value.toString(16).padStart(2, "0")).join("");
}

function gatewayError(error: unknown): Error {
  if (error instanceof Error && !(error instanceof FirebaseError)) return error;
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return new Error("Tu rol ya no permite modificar el catálogo.", { cause: error });
  }
  return new Error("No pudimos guardar el catálogo. Intentá nuevamente.", { cause: error });
}

async function safely(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    throw gatewayError(error);
  }
}

function categoryRef(establishmentId: string, categoryId: string) {
  return doc(adminFirestore, "establishments", establishmentId, "categories", categoryId);
}

function productRef(establishmentId: string, productId: string) {
  return doc(adminFirestore, "establishments", establishmentId, "products", productId);
}

export async function createCategory(
  establishmentId: string,
  draft: CategoryDraft
): Promise<void> {
  await safely(() => runTransaction(adminFirestore, async (transaction) => {
    const reference = categoryRef(establishmentId, catalogId(draft.name));
    if ((await transaction.get(reference)).exists()) throw new Error("Ya existe una categoría con ese nombre.");
    const now = Timestamp.now();
    transaction.set(reference, { establishmentId, ...draft, createdAt: now, updatedAt: now });
  }));
}

export async function updateCategory(
  establishmentId: string,
  category: AdminCategory,
  draft: CategoryDraft
): Promise<void> {
  await safely(() => runTransaction(adminFirestore, async (transaction) => {
    const reference = categoryRef(establishmentId, category.id);
    const snapshot = await transaction.get(reference);
    ensureCurrent(snapshot.data(), category.updatedAt);
    transaction.update(reference, { ...draft, updatedAt: Timestamp.now() });
  }));
}

export async function deleteCategory(
  establishmentId: string,
  category: AdminCategory
): Promise<void> {
  await safely(async () => {
    const productSnapshot = await getDocs(query(
      collection(adminFirestore, "establishments", establishmentId, "products"),
      where("categoryId", "==", category.id),
      limit(1)
    ));
    if (!productSnapshot.empty) throw new Error("Mové o eliminá sus productos antes de borrar la categoría.");
    await runTransaction(adminFirestore, async (transaction) => {
      const reference = categoryRef(establishmentId, category.id);
      const snapshot = await transaction.get(reference);
      ensureCurrent(snapshot.data(), category.updatedAt);
      transaction.delete(reference);
    });
  });
}

async function swapOrder(
  firstRef: DocumentReference,
  firstUpdatedAt: Date,
  firstOrder: number,
  secondRef: DocumentReference,
  secondUpdatedAt: Date,
  secondOrder: number
): Promise<void> {
  await safely(() => runTransaction(adminFirestore, async (transaction) => {
    const [first, second] = await Promise.all([
      transaction.get(firstRef), transaction.get(secondRef)
    ]);
    ensureCurrent(first.data(), firstUpdatedAt);
    ensureCurrent(second.data(), secondUpdatedAt);
    const now = Timestamp.now();
    transaction.update(firstRef, { sortOrder: secondOrder, updatedAt: now });
    transaction.update(secondRef, { sortOrder: firstOrder, updatedAt: now });
  }));
}

export function swapCategoryOrder(
  establishmentId: string,
  first: AdminCategory,
  second: AdminCategory
): Promise<void> {
  return swapOrder(
    categoryRef(establishmentId, first.id), first.updatedAt, first.sortOrder,
    categoryRef(establishmentId, second.id), second.updatedAt, second.sortOrder
  );
}

export async function createProduct(
  establishmentId: string,
  draft: ProductDraft
): Promise<void> {
  if (!MENU_IMAGE_OPTIONS.some(({ value }) => value === draft.imagePath)) {
    throw new Error("Seleccioná una imagen incluida en MesaFlow.");
  }
  await safely(() => runTransaction(adminFirestore, async (transaction) => {
    const category = await transaction.get(categoryRef(establishmentId, draft.categoryId));
    if (!category.exists()) throw new Error("La categoría seleccionada ya no existe.");
    const reference = productRef(establishmentId, `${catalogId(draft.name)}-${randomSuffix()}`);
    const now = Timestamp.now();
    transaction.set(reference, { establishmentId, ...draft, createdAt: now, updatedAt: now });
  }));
}

export async function updateProduct(
  establishmentId: string,
  product: AdminProduct,
  draft: ProductDraft
): Promise<void> {
  if (!MENU_IMAGE_OPTIONS.some(({ value }) => value === draft.imagePath)) {
    throw new Error("Seleccioná una imagen incluida en MesaFlow.");
  }
  await safely(() => runTransaction(adminFirestore, async (transaction) => {
    const reference = productRef(establishmentId, product.id);
    const [snapshot, category] = await Promise.all([
      transaction.get(reference), transaction.get(categoryRef(establishmentId, draft.categoryId))
    ]);
    ensureCurrent(snapshot.data(), product.updatedAt);
    if (!category.exists()) throw new Error("La categoría seleccionada ya no existe.");
    transaction.update(reference, { ...draft, updatedAt: Timestamp.now() });
  }));
}

export async function setProductAvailability(
  establishmentId: string,
  product: AdminProduct,
  available: boolean
): Promise<void> {
  await safely(() => runTransaction(adminFirestore, async (transaction) => {
    const reference = productRef(establishmentId, product.id);
    const snapshot = await transaction.get(reference);
    ensureCurrent(snapshot.data(), product.updatedAt);
    transaction.update(reference, { available, updatedAt: Timestamp.now() });
  }));
}

export async function deleteProduct(
  establishmentId: string,
  product: AdminProduct
): Promise<void> {
  await safely(() => runTransaction(adminFirestore, async (transaction) => {
    const reference = productRef(establishmentId, product.id);
    const snapshot = await transaction.get(reference);
    ensureCurrent(snapshot.data(), product.updatedAt);
    transaction.delete(reference);
  }));
}

export function swapProductOrder(
  establishmentId: string,
  first: AdminProduct,
  second: AdminProduct
): Promise<void> {
  return swapOrder(
    productRef(establishmentId, first.id), first.updatedAt, first.sortOrder,
    productRef(establishmentId, second.id), second.updatedAt, second.sortOrder
  );
}
