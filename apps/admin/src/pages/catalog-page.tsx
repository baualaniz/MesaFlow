import { useEffect, useMemo, useState, type FormEvent } from "react";

import { adjacentItem, nextSortOrder } from "../menu/catalog-utils";
import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  setProductAvailability,
  swapCategoryOrder,
  swapProductOrder,
  updateCategory,
  updateProduct
} from "../menu/menu-gateway";
import { MENU_IMAGE_OPTIONS, menuImageStyle, type MenuImagePath } from "../menu/image-options";
import { formatCatalogMoney, type AdminCategory, type AdminProduct } from "../menu/menu-model";
import { canEditCatalog, canToggleProductAvailability } from "../menu/menu-permissions";
import { subscribeCatalog, type CatalogFeed } from "../menu/menu-repository";
import { useActiveTenant } from "../tenant/tenant-context";

interface ScopedFeed extends CatalogFeed {
  readonly establishmentId: string;
  readonly error: string | null;
}

interface CategoryEditor {
  readonly category: AdminCategory | null;
  readonly name: string;
  readonly description: string;
  readonly active: boolean;
}

interface ProductEditor {
  readonly product: AdminProduct | null;
  readonly categoryId: string;
  readonly name: string;
  readonly description: string;
  readonly price: string;
  readonly imagePath: MenuImagePath;
  readonly available: boolean;
  readonly active: boolean;
}

export function CatalogPage() {
  const active = useActiveTenant();
  const establishmentId = active.establishment.id;
  const mayEdit = canEditCatalog(active.membership);
  const mayToggle = canToggleProductAvailability(active.membership);
  const [feed, setFeed] = useState<ScopedFeed | null>(null);
  const [revision, setRevision] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categoryEditor, setCategoryEditor] = useState<CategoryEditor | null>(null);
  const [productEditor, setProductEditor] = useState<ProductEditor | null>(null);

  useEffect(() => subscribeCatalog(
    establishmentId,
    (next) => setFeed({ ...next, establishmentId, error: null }),
    () => setFeed({
      establishmentId,
      categories: Object.freeze([]),
      products: Object.freeze([]),
      error: "No pudimos mantener el catálogo conectado."
    })
  ), [establishmentId, revision]);

  const currentFeed = feed?.establishmentId === establishmentId ? feed : null;
  const categories = currentFeed?.categories ?? Object.freeze([]) as readonly AdminCategory[];
  const products = currentFeed?.products ?? Object.freeze([]) as readonly AdminProduct[];
  const categoryNames = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);
  const visibleProducts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es-AR");
    return products.filter((product) =>
      (selectedCategory === "all" || product.categoryId === selectedCategory) &&
      (term.length === 0 || `${product.name} ${product.description}`.toLocaleLowerCase("es-AR").includes(term))
    );
  }, [products, search, selectedCategory]);

  async function operation(key: string, action: () => Promise<void>) {
    if (busy !== null) return;
    setBusy(key);
    setError(null);
    try {
      await action();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No pudimos completar la operación.");
    } finally {
      setBusy(null);
    }
  }

  async function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (categoryEditor === null) return;
    const name = categoryEditor.name.trim();
    const description = categoryEditor.description.trim();
    if (name.length < 2 || name.length > 120 || description.length > 500) {
      setError("Revisá el nombre y la descripción de la categoría.");
      return;
    }
    await operation("category-editor", async () => {
      const draft = {
        name,
        description,
        active: categoryEditor.active,
        sortOrder: categoryEditor.category?.sortOrder ?? nextSortOrder(categories)
      };
      if (categoryEditor.category === null) await createCategory(establishmentId, draft);
      else await updateCategory(establishmentId, categoryEditor.category, draft);
      setCategoryEditor(null);
    });
  }

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (productEditor === null) return;
    const name = productEditor.name.trim();
    const description = productEditor.description.trim();
    const price = Number(productEditor.price.replace(",", "."));
    if (!productEditor.categoryId || name.length < 2 || name.length > 120 ||
        description.length > 500 || !Number.isFinite(price) || price <= 0) {
      setError("Completá categoría, nombre, descripción y un precio válido mayor a cero.");
      return;
    }
    await operation("product-editor", async () => {
      const siblings = products.filter(({ categoryId }) => categoryId === productEditor.categoryId);
      const draft = {
        categoryId: productEditor.categoryId,
        name,
        description,
        priceMinor: Math.round(price * 100),
        currency: active.establishment.currency,
        imagePath: productEditor.imagePath,
        available: productEditor.available,
        active: productEditor.active,
        sortOrder: productEditor.product !== null &&
          productEditor.product.categoryId === productEditor.categoryId
          ? productEditor.product.sortOrder
          : nextSortOrder(siblings)
      };
      if (productEditor.product === null) await createProduct(establishmentId, draft);
      else await updateProduct(establishmentId, productEditor.product, draft);
      setProductEditor(null);
    });
  }

  function editProduct(product: AdminProduct) {
    const imagePath = MENU_IMAGE_OPTIONS.some(({ value }) => value === product.imagePath)
      ? product.imagePath as MenuImagePath
      : MENU_IMAGE_OPTIONS[0].value;
    setProductEditor({
      product,
      categoryId: product.categoryId,
      name: product.name,
      description: product.description,
      price: String(product.priceMinor / 100),
      imagePath,
      available: product.available,
      active: product.active
    });
  }

  async function moveCategory(category: AdminCategory, direction: "up" | "down") {
    const neighbor = adjacentItem(categories, category.id, direction);
    if (neighbor !== null) await operation(`category-${category.id}`, () =>
      swapCategoryOrder(establishmentId, category, neighbor));
  }

  async function moveProduct(product: AdminProduct, direction: "up" | "down") {
    const siblings = products.filter(({ categoryId }) => categoryId === product.categoryId);
    const neighbor = adjacentItem(siblings, product.id, direction);
    if (neighbor !== null) await operation(`product-${product.id}`, () =>
      swapProductOrder(establishmentId, product, neighbor));
  }

  return (
    <div className="catalog-page">
      <div className="page-heading catalog-heading">
        <div>
          <p className="eyebrow">MENÚ DIGITAL</p>
          <h1>Productos</h1>
          <p>Organizá la carta de {active.establishment.name}. Los cambios publicados aparecen en el menú del cliente.</p>
        </div>
        {mayEdit && <div className="catalog-heading-actions">
          <button className="secondary-button" disabled={busy !== null} onClick={() => setCategoryEditor({ category: null, name: "", description: "", active: true })} type="button">Nueva categoría</button>
          <button className="primary-button" disabled={busy !== null || categories.length === 0} onClick={() => setProductEditor({
            product: null,
            categoryId: selectedCategory === "all" ? categories[0]?.id ?? "" : selectedCategory,
            name: "",
            description: "",
            price: "",
            imagePath: MENU_IMAGE_OPTIONS[0].value,
            available: true,
            active: true
          })} type="button">Nuevo producto</button>
        </div>}
      </div>

      {error !== null && <div className="table-alert" role="alert"><span>{error}</span><button aria-label="Cerrar error" onClick={() => setError(null)} type="button">×</button></div>}

      {currentFeed === null ? (
        <section className="orders-feedback"><span className="loading-line" /><strong>Cargando catálogo…</strong></section>
      ) : currentFeed.error !== null ? (
        <section className="orders-feedback error"><strong>{currentFeed.error}</strong><button className="secondary-button" onClick={() => { setFeed(null); setRevision((value) => value + 1); }} type="button">Reintentar</button></section>
      ) : (
        <div className="catalog-layout">
          <aside className="category-panel">
            <header><div><strong>Categorías</strong><span>{categories.length} en total</span></div></header>
            <button className={`category-filter ${selectedCategory === "all" ? "selected" : ""}`} onClick={() => setSelectedCategory("all")} type="button"><span>Toda la carta</span><small>{products.length}</small></button>
            {categories.map((category) => {
              const count = products.filter(({ categoryId }) => categoryId === category.id).length;
              return <div className={`category-row ${selectedCategory === category.id ? "selected" : ""} ${category.active ? "" : "inactive"}`} key={category.id}>
                <button className="category-filter" onClick={() => setSelectedCategory(category.id)} type="button"><span>{category.name}</span><small>{count}</small></button>
                {mayEdit && <div className="catalog-mini-actions">
                  <button aria-label={`Subir ${category.name}`} disabled={busy !== null || adjacentItem(categories, category.id, "up") === null} onClick={() => void moveCategory(category, "up")} type="button">↑</button>
                  <button aria-label={`Bajar ${category.name}`} disabled={busy !== null || adjacentItem(categories, category.id, "down") === null} onClick={() => void moveCategory(category, "down")} type="button">↓</button>
                  <button aria-label={`Editar ${category.name}`} disabled={busy !== null} onClick={() => setCategoryEditor({ category, name: category.name, description: category.description, active: category.active })} type="button">Editar</button>
                </div>}
              </div>;
            })}
          </aside>

          <main className="catalog-products">
            <div className="product-toolbar">
              <div><strong>{selectedCategory === "all" ? "Toda la carta" : categoryNames.get(selectedCategory) ?? "Categoría"}</strong><span>{visibleProducts.length} producto{visibleProducts.length === 1 ? "" : "s"}</span></div>
              <label><span className="sr-only">Buscar productos</span><input onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre…" type="search" value={search} /></label>
            </div>
            {visibleProducts.length === 0 ? <section className="catalog-empty"><strong>No hay productos para mostrar</strong><p>{categories.length === 0 ? "Creá una categoría para comenzar la carta." : "Probá otra categoría o búsqueda."}</p></section> :
              <section className="catalog-product-grid" aria-label="Productos del catálogo">{visibleProducts.map((product) => {
                const siblings = products.filter(({ categoryId }) => categoryId === product.categoryId);
                return <article className={`catalog-product-card ${product.active ? "" : "inactive"}`} key={product.id}>
                  <div className="catalog-product-image" role="img" aria-label={product.name} style={menuImageStyle(product.imagePath)}><span>{categoryNames.get(product.categoryId) ?? "Sin categoría"}</span></div>
                  <div className="catalog-product-body"><header><div><h2>{product.name}</h2><small>{categoryNames.get(product.categoryId) ?? product.categoryId}</small></div><strong>{formatCatalogMoney(product.priceMinor, product.currency)}</strong></header><p>{product.description}</p>
                    <label className="availability-switch"><input checked={product.available} disabled={!mayToggle || busy !== null} onChange={(event) => void operation(`availability-${product.id}`, () => setProductAvailability(establishmentId, product, event.target.checked))} type="checkbox" /><span>{product.available ? "Disponible" : "Agotado"}</span></label>
                  </div>
                  {mayEdit && <footer>
                    <button disabled={busy !== null || adjacentItem(siblings, product.id, "up") === null} onClick={() => void moveProduct(product, "up")} type="button">↑ Subir</button>
                    <button disabled={busy !== null || adjacentItem(siblings, product.id, "down") === null} onClick={() => void moveProduct(product, "down")} type="button">↓ Bajar</button>
                    <button disabled={busy !== null} onClick={() => editProduct(product)} type="button">Editar</button>
                    <button className="danger-text" disabled={busy !== null} onClick={() => { if (window.confirm(`¿Eliminar ${product.name}?`)) void operation(`delete-${product.id}`, () => deleteProduct(establishmentId, product)); }} type="button">Eliminar</button>
                  </footer>}
                </article>;
              })}</section>}
          </main>
        </div>
      )}

      {categoryEditor !== null && <div className="table-dialog-backdrop" role="presentation"><form className="table-editor catalog-editor" onSubmit={(event) => void submitCategory(event)}>
        <header><div><p className="eyebrow">CATEGORÍA</p><h2>{categoryEditor.category === null ? "Nueva categoría" : "Editar categoría"}</h2></div><button aria-label="Cerrar" className="icon-button" onClick={() => setCategoryEditor(null)} type="button">×</button></header>
        <label htmlFor="category-name">Nombre</label><input autoFocus id="category-name" maxLength={120} onChange={(event) => setCategoryEditor({ ...categoryEditor, name: event.target.value })} required value={categoryEditor.name} />
        <label htmlFor="category-description">Descripción</label><textarea id="category-description" maxLength={500} onChange={(event) => setCategoryEditor({ ...categoryEditor, description: event.target.value })} value={categoryEditor.description} />
        <label className="catalog-check"><input checked={categoryEditor.active} onChange={(event) => setCategoryEditor({ ...categoryEditor, active: event.target.checked })} type="checkbox" />Publicada en el menú</label>
        {categoryEditor.category !== null && <button className="catalog-delete-link" disabled={busy !== null} onClick={() => { if (window.confirm(`¿Eliminar ${categoryEditor.category?.name}?`)) void operation("delete-category", async () => { await deleteCategory(establishmentId, categoryEditor.category as AdminCategory); setCategoryEditor(null); }); }} type="button">Eliminar categoría</button>}
        <footer><button className="secondary-button" onClick={() => setCategoryEditor(null)} type="button">Cancelar</button><button className="primary-button" disabled={busy !== null} type="submit">Guardar</button></footer>
      </form></div>}

      {productEditor !== null && <div className="table-dialog-backdrop" role="presentation"><form className="table-editor catalog-editor product-editor" onSubmit={(event) => void submitProduct(event)}>
        <header><div><p className="eyebrow">PRODUCTO</p><h2>{productEditor.product === null ? "Nuevo producto" : "Editar producto"}</h2></div><button aria-label="Cerrar" className="icon-button" onClick={() => setProductEditor(null)} type="button">×</button></header>
        <div className="catalog-form-grid"><div><label htmlFor="product-name">Nombre</label><input autoFocus id="product-name" maxLength={120} onChange={(event) => setProductEditor({ ...productEditor, name: event.target.value })} required value={productEditor.name} /></div><div><label htmlFor="product-category">Categoría</label><select id="product-category" onChange={(event) => setProductEditor({ ...productEditor, categoryId: event.target.value })} required value={productEditor.categoryId}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div></div>
        <label htmlFor="product-description">Descripción</label><textarea id="product-description" maxLength={500} onChange={(event) => setProductEditor({ ...productEditor, description: event.target.value })} value={productEditor.description} />
        <label htmlFor="product-price">Precio ({active.establishment.currency})</label><input id="product-price" min="0.01" onChange={(event) => setProductEditor({ ...productEditor, price: event.target.value })} required step="0.01" type="number" value={productEditor.price} />
        <fieldset className="image-picker"><legend>Imagen incluida</legend><div>{MENU_IMAGE_OPTIONS.map((option) => <label className={productEditor.imagePath === option.value ? "selected" : ""} key={option.value}><input checked={productEditor.imagePath === option.value} name="imagePath" onChange={() => setProductEditor({ ...productEditor, imagePath: option.value })} type="radio" /><span style={menuImageStyle(option.value)} /><strong>{option.label}</strong></label>)}</div></fieldset>
        <div className="catalog-check-row"><label className="catalog-check"><input checked={productEditor.available} onChange={(event) => setProductEditor({ ...productEditor, available: event.target.checked })} type="checkbox" />Disponible</label><label className="catalog-check"><input checked={productEditor.active} onChange={(event) => setProductEditor({ ...productEditor, active: event.target.checked })} type="checkbox" />Publicado</label></div>
        <footer><button className="secondary-button" onClick={() => setProductEditor(null)} type="button">Cancelar</button><button className="primary-button" disabled={busy !== null} type="submit">Guardar producto</button></footer>
      </form></div>}
    </div>
  );
}
