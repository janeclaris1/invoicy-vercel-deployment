const DEFAULT_SORT_ORDER = 999999;

export function compareCatalogItems(a, b) {
  const orderA = Number(a?.sortOrder);
  const orderB = Number(b?.sortOrder);
  const hasA = Number.isFinite(orderA) && orderA < DEFAULT_SORT_ORDER;
  const hasB = Number.isFinite(orderB) && orderB < DEFAULT_SORT_ORDER;
  if (hasA && hasB && orderA !== orderB) return orderA - orderB;
  if (hasA && !hasB) return -1;
  if (!hasA && hasB) return 1;
  return String(a?.name || "").localeCompare(String(b?.name || ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}
