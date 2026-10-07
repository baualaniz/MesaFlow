export function catalogId(name: string): string {
  const value = name.normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "")
    .slice(0, 60);
  if (value.length < 2) throw new TypeError("El nombre no permite generar un identificador.");
  return value;
}

export function nextSortOrder(values: readonly { readonly sortOrder: number }[]): number {
  return values.length === 0 ? 1 : Math.max(...values.map(({ sortOrder }) => sortOrder)) + 1;
}

export function adjacentItem<T extends { readonly id: string; readonly sortOrder: number }>(
  values: readonly T[],
  id: string,
  direction: "up" | "down"
): T | null {
  const ordered = [...values].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
  const index = ordered.findIndex((value) => value.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  return index < 0 || target < 0 || target >= ordered.length ? null : ordered[target] ?? null;
}
