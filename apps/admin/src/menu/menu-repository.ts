import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe
} from "firebase/firestore";

import { adminFirestore } from "../firebase/firebase";
import {
  parseAdminCategory,
  parseAdminProduct,
  type AdminCategory,
  type AdminProduct
} from "./menu-model";

export interface CatalogFeed {
  readonly categories: readonly AdminCategory[];
  readonly products: readonly AdminProduct[];
}

export function subscribeCatalog(
  establishmentId: string,
  onData: (feed: CatalogFeed) => void,
  onError: (error: Error) => void
): Unsubscribe {
  let categories: readonly AdminCategory[] | null = null;
  let products: readonly AdminProduct[] | null = null;
  const emit = () => {
    if (categories !== null && products !== null) onData(Object.freeze({ categories, products }));
  };
  const unsubscribeCategories = onSnapshot(query(
    collection(adminFirestore, "establishments", establishmentId, "categories"),
    orderBy("sortOrder", "asc"),
    limit(100)
  ), (snapshot) => {
    try {
      categories = Object.freeze(snapshot.docs.map((document) =>
        parseAdminCategory(document.id, document.data(), establishmentId)));
      emit();
    } catch (error) {
      onError(error instanceof Error ? error : new Error("Categoría inválida."));
    }
  }, onError);
  const unsubscribeProducts = onSnapshot(query(
    collection(adminFirestore, "establishments", establishmentId, "products"),
    orderBy("sortOrder", "asc"),
    limit(500)
  ), (snapshot) => {
    try {
      products = Object.freeze(snapshot.docs.map((document) =>
        parseAdminProduct(document.id, document.data(), establishmentId)));
      emit();
    } catch (error) {
      onError(error instanceof Error ? error : new Error("Producto inválido."));
    }
  }, onError);
  return () => {
    unsubscribeCategories();
    unsubscribeProducts();
  };
}
