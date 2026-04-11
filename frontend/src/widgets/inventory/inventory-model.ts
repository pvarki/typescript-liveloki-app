export interface CorrelationLink {
  type: "item" | "category";
  targetId: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  count: number;
  linkedTo?: CorrelationLink[];
}

export interface InventoryCategory {
  id: string;
  name: string;
  icon: string;
  items: InventoryItem[];
}

export interface PendingChange {
  categoryId: string;
  categoryName: string;
  itemId: string;
  itemName: string;
  delta: number;
}

export interface CorrelationWarning {
  sourceItemName: string;
  sourceDelta: number;
  targetName: string;
  targetType: "item" | "category";
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export const DEFAULT_CATEGORIES: InventoryCategory[] = [
  {
    id: "personnel",
    name: "Personnel",
    icon: "person",
    items: [
      {
        id: "soldiers", name: "Soldiers", count: 0,
        linkedTo: [
          { type: "category", targetId: "weapons" },
          { type: "category", targetId: "vehicles" },
        ],
      },
      {
        id: "officers", name: "Officers", count: 0,
        linkedTo: [{ type: "item", targetId: "pistols" }],
      },
      { id: "medics", name: "Medics", count: 0 },
    ],
  },
  {
    id: "weapons",
    name: "Weapons",
    icon: "shield",
    items: [
      { id: "rifles", name: "Rifles", count: 0 },
      { id: "pistols", name: "Pistols", count: 0 },
      { id: "mg", name: "Machine guns", count: 0 },
    ],
  },
  {
    id: "vehicles",
    name: "Vehicles",
    icon: "directions-car",
    items: [
      { id: "trucks", name: "Trucks", count: 0 },
      { id: "apcs", name: "APCs", count: 0 },
      { id: "uavs", name: "UAVs", count: 0 },
    ],
  },
];

export function getCategories(config: Record<string, unknown>): InventoryCategory[] {
  return Array.isArray(config.categories)
    ? (config.categories as InventoryCategory[])
    : DEFAULT_CATEGORIES;
}

export function getLogChanges(config: Record<string, unknown>): boolean {
  return typeof config.logChanges === "boolean" ? config.logChanges : false;
}

export function categoryTotal(category: InventoryCategory): number {
  return category.items.reduce((sum, item) => sum + item.count, 0);
}

export function computeDeltas(
  original: InventoryCategory[],
  draft: InventoryCategory[],
): PendingChange[] {
  const changes: PendingChange[] = [];
  for (const draftCat of draft) {
    const origCat = original.find((c) => c.id === draftCat.id);
    if (!origCat) continue;
    for (const draftItem of draftCat.items) {
      const origItem = origCat.items.find((i) => i.id === draftItem.id);
      const origCount = origItem?.count ?? 0;
      const delta = draftItem.count - origCount;
      if (delta !== 0) {
        changes.push({
          categoryId: draftCat.id,
          categoryName: draftCat.name,
          itemId: draftItem.id,
          itemName: draftItem.name,
          delta,
        });
      }
    }
  }
  return changes;
}

export function checkCorrelationWarnings(
  original: InventoryCategory[],
  draft: InventoryCategory[],
): CorrelationWarning[] {
  const deltas = computeDeltas(original, draft);
  if (deltas.length === 0) return [];

  const changedItemIds = new Set(deltas.map((d) => d.itemId));
  const warnings: CorrelationWarning[] = [];

  // Look up original items to find linkedTo (draft may have same links)
  for (const delta of deltas) {
    const origCat = original.find((c) => c.id === delta.categoryId);
    const origItem = origCat?.items.find((i) => i.id === delta.itemId);
    const links = origItem?.linkedTo;
    if (!links || links.length === 0) continue;

    for (const link of links) {
      if (link.type === "item") {
        if (!changedItemIds.has(link.targetId)) {
          // Find the target item's name
          const targetName = original
            .flatMap((c) => c.items)
            .find((i) => i.id === link.targetId)?.name ?? link.targetId;
          warnings.push({
            sourceItemName: delta.itemName,
            sourceDelta: delta.delta,
            targetName,
            targetType: "item",
          });
        }
      } else if (link.type === "category") {
        // Check if ANY item in that category changed
        const catDeltas = deltas.filter((d) => d.categoryId === link.targetId);
        if (catDeltas.length === 0) {
          const targetName = original.find((c) => c.id === link.targetId)?.name ?? link.targetId;
          warnings.push({
            sourceItemName: delta.itemName,
            sourceDelta: delta.delta,
            targetName,
            targetType: "category",
          });
        }
      }
    }
  }

  return warnings;
}

export function buildBatchLogHeader(
  changes: PendingChange[],
  note?: string,
): string {
  const parts = changes.map((c) => {
    const sign = c.delta > 0 ? "+" : "";
    return `${c.itemName} ${sign}${c.delta}`;
  });
  const summary = `Inventory update: ${parts.join(", ")}`;
  return note ? `${summary} — ${note}` : summary;
}
