import { Button, Checkbox, FormGroup, InputGroup } from "@blueprintjs/core";
import { type ComponentType, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  MdBuild,
  MdDevices,
  MdDirectionsCar,
  MdEngineering,
  MdFlight,
  MdGroups,
  MdHome,
  MdInventory2,
  MdLocalShipping,
  MdMedicalServices,
  MdMilitaryTech,
  MdPerson,
  MdRadio,
  MdRestaurant,
  MdSailing,
  MdSecurity,
  MdShield,
  MdTerrain,
  MdVisibility,
  MdWater,
} from "react-icons/md";

import { createEmptyBattlelogEvent, submitBattlelogEvents } from "../../battlelog/event-data";
import { useDashboardStore } from "../../stores/dashboard-store";
import type { ConfigPanelProps, WidgetDescriptor, WidgetProps } from "../../types";
import { WidgetActionBar } from "../WidgetActionBar";
import {
  buildBatchLogHeader,
  categoryTotal,
  checkCorrelationWarnings,
  computeDeltas,
  type CorrelationLink,
  DEFAULT_CATEGORIES,
  generateId,
  getCategories,
  getLogChanges,
  type InventoryCategory,
} from "./inventory-model";

// ---------------------------------------------------------------------------
// Icon map — expanded set for custom categories
// ---------------------------------------------------------------------------

// Simple geometric shape components
function SvgShape({ d, className }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className ?? "text-base"}
      width="1em"
      height="1em"
    >
      <path d={d} />
    </svg>
  );
}
const ShapeCircle = ({ className }: { className?: string }) => (
  <SvgShape className={className} d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
);
const ShapeSquare = ({ className }: { className?: string }) => (
  <SvgShape className={className} d="M3 3h18v18H3z" />
);
const ShapeTriangle = ({ className }: { className?: string }) => (
  <SvgShape className={className} d="M12 2L2 22h20z" />
);
const ShapeDiamond = ({ className }: { className?: string }) => (
  <SvgShape className={className} d="M12 2l10 10-10 10L2 12z" />
);
const ShapeHexagon = ({ className }: { className?: string }) => (
  <SvgShape className={className} d="M12 2l9 5v10l-9 5-9-5V7z" />
);
const ShapeStar = ({ className }: { className?: string }) => (
  <SvgShape
    className={className}
    d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01z"
  />
);
const ShapePlus = ({ className }: { className?: string }) => (
  <SvgShape className={className} d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z" />
);
const ShapePentagon = ({ className }: { className?: string }) => (
  <SvgShape className={className} d="M12 2l10 7.5-3.8 11.5H5.8L2 9.5z" />
);

const ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  // Geometric shapes
  circle: ShapeCircle,
  square: ShapeSquare,
  triangle: ShapeTriangle,
  diamond: ShapeDiamond,
  hexagon: ShapeHexagon,
  star: ShapeStar,
  plus: ShapePlus,
  pentagon: ShapePentagon,
  // Material icons
  person: MdPerson,
  groups: MdGroups,
  shield: MdShield,
  security: MdSecurity,
  "military-tech": MdMilitaryTech,
  "directions-car": MdDirectionsCar,
  "local-shipping": MdLocalShipping,
  flight: MdFlight,
  sailing: MdSailing,
  inventory: MdInventory2,
  build: MdBuild,
  engineering: MdEngineering,
  "medical-services": MdMedicalServices,
  radio: MdRadio,
  devices: MdDevices,
  restaurant: MdRestaurant,
  home: MdHome,
  terrain: MdTerrain,
  water: MdWater,
  visibility: MdVisibility,
};

const ICON_KEYS = Object.keys(ICON_MAP);

function renderCategoryIcon(key: string) {
  const Icon = ICON_MAP[key];
  return Icon ? <Icon className="text-base" /> : <span className="text-base">{key}</span>;
}

// ---------------------------------------------------------------------------
// Icon picker — small grid popover
// ---------------------------------------------------------------------------

function IconPicker({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button minimal className="!min-h-0 !min-w-0 !p-1" title="Choose icon" onClick={() => setOpen(!open)}>
        {renderCategoryIcon(value)}
        <span className="ml-0.5 text-[9px] text-[var(--color-muted-foreground)]">
          {open ? "\u25B2" : "\u25BC"}
        </span>
      </Button>
      {open && (
        <div className="mt-1 grid grid-cols-5 gap-1 rounded border border-[var(--color-border)] bg-[var(--color-field)] p-1">
          {ICON_KEYS.map((key) => {
            const Icon = ICON_MAP[key];
            return (
              <Button
                key={key}
                minimal
                className={`!min-h-0 !min-w-0 !p-1 ${key === value ? "ring-1 ring-[var(--color-accent)]" : ""}`}
                onClick={() => {
                  onChange(key);
                  setOpen(false);
                }}
                title={key}
              >
                <Icon className="text-base" />
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Normal (read-only) view
// ---------------------------------------------------------------------------

function CategorySection({ category }: { category: InventoryCategory }) {
  const [open, setOpen] = useState(false);
  const total = categoryTotal(category);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-[var(--color-field)]"
      >
        {renderCategoryIcon(category.icon)}
        <span className="flex-1 text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
          {category.name}
        </span>
        <span className="font-mono text-xl font-bold text-[var(--color-foreground)]">{total}</span>
        <span className="text-xs text-[var(--color-muted-foreground)]">{open ? "\u25B2" : "\u25BC"}</span>
      </button>
      {open && (
        <div className="ml-7 flex flex-col gap-0.5 border-l border-[var(--color-border)] py-1 pl-2">
          {category.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-2 py-0.5">
              <span className="text-sm text-[var(--color-foreground)]">{item.name}</span>
              <span className="font-mono text-sm font-semibold text-[var(--color-foreground)]">
                {item.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Batch edit form — with correlation warnings
// ---------------------------------------------------------------------------

function EditForm({
  categories,
  logChanges,
  onSave,
  onCancel,
}: {
  categories: InventoryCategory[];
  logChanges: boolean;
  onSave: (draft: InventoryCategory[], note: string, log: boolean) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<InventoryCategory[]>(() =>
    categories.map((c) => ({ ...c, items: c.items.map((i) => ({ ...i })) })),
  );
  const [note, setNote] = useState("");

  const warnings = useMemo(() => checkCorrelationWarnings(categories, draft), [categories, draft]);

  const updateCount = (catId: string, itemId: string, value: number) => {
    setDraft((prev) =>
      prev.map((cat) =>
        cat.id === catId
          ? {
              ...cat,
              items: cat.items.map((item) =>
                item.id === itemId ? { ...item, count: Math.max(0, value) } : item,
              ),
            }
          : cat,
      ),
    );
  };

  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto p-2">
      {draft.map((cat) => (
        <div key={cat.id}>
          <div className="flex items-center gap-2 px-2 py-1">
            {renderCategoryIcon(cat.icon)}
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
              {cat.name}
            </span>
          </div>
          <div className="ml-7 flex flex-col gap-1 border-l border-[var(--color-border)] py-1 pl-2">
            {cat.items.map((item) => (
              <div key={item.id} className="flex items-center gap-2 px-2">
                <span className="flex-1 text-sm text-[var(--color-foreground)]">{item.name}</span>
                <InputGroup
                  className="w-20"
                  type="number"
                  value={String(item.count)}
                  onChange={(e) => updateCount(cat.id, item.id, Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {warnings.length > 0 && (
        <div className="rounded border border-[var(--color-warning)] bg-[var(--color-warning)]/10 p-2">
          <div className="mb-1 text-xs font-semibold text-[var(--color-warning)]">Check these changes</div>
          {warnings.map((w, i) => (
            <div key={i} className="text-xs text-[var(--color-foreground)]">
              {w.sourceItemName} {w.sourceDelta > 0 ? "+" : ""}
              {w.sourceDelta} — {w.targetName} ({w.targetType}) is unchanged
            </div>
          ))}
        </div>
      )}

      <div className="mt-auto border-t border-[var(--color-border)] pt-2">
        <InputGroup
          placeholder="Reason / note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mb-2"
        />
        <div className="flex gap-2">
          {logChanges && (
            <Button intent="primary" text="Save & Log" onClick={() => onSave(draft, note, true)} />
          )}
          <Button text="Save" onClick={() => onSave(draft, note, false)} />
          <Button minimal text="Cancel" onClick={onCancel} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main widget
// ---------------------------------------------------------------------------

function InventoryWidget({ instanceId, config, isEditMode }: WidgetProps) {
  const persistWidgetConfigNow = useDashboardStore((s) => s.persistWidgetConfigNow);
  const categories = getCategories(config);
  const logChanges = getLogChanges(config);
  const [editing, setEditing] = useState(false);

  const handleSave = async (draft: InventoryCategory[], note: string, log: boolean) => {
    await persistWidgetConfigNow(instanceId, { ...config, categories: draft });
    if (log) {
      const deltas = computeDeltas(categories, draft);
      if (deltas.length > 0) {
        try {
          const event = {
            ...createEmptyBattlelogEvent(),
            header: buildBatchLogHeader(deltas, note.trim() || undefined),
            source: "inventory-widget",
            keywords: ["inventory", ...new Set(deltas.map((d) => d.categoryName.toLowerCase()))],
            event_time: new Date().toISOString(),
            notes: note.trim() || undefined,
          };
          await submitBattlelogEvents([event]);
          toast.success("Inventory updated and logged");
        } catch (error) {
          console.error("Inventory log failed:", error);
          toast.error("Inventory saved but failed to log change");
        }
      } else {
        toast.success("No changes to log");
      }
    } else {
      toast.success("Inventory updated");
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <EditForm
        categories={categories}
        logChanges={logChanges}
        onSave={handleSave}
        onCancel={() => setEditing(false)}
      />
    );
  }

  if (categories.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-sm text-[var(--color-muted-foreground)]">No categories configured</span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-0.5">
          {categories.map((cat) => (
            <CategorySection key={cat.id} category={cat} />
          ))}
        </div>
      </div>
      <WidgetActionBar
        primary={
          <Button
            text="Edit quantities"
            icon="edit"
            small
            fill
            disabled={isEditMode}
            onClick={() => setEditing(true)}
          />
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Config panel — inline link editor + icon picker
// ---------------------------------------------------------------------------

function InlineLinkEditor({
  item,
  allCategories,
  onUpdate,
}: {
  item: { id: string; name: string; linkedTo?: CorrelationLink[] };
  allCategories: InventoryCategory[];
  onUpdate: (links: CorrelationLink[]) => void;
}) {
  const links = item.linkedTo ?? [];

  const isLinked = (type: "item" | "category", targetId: string) =>
    links.some((l) => l.type === type && l.targetId === targetId);

  const toggle = (type: "item" | "category", targetId: string) => {
    if (isLinked(type, targetId)) {
      onUpdate(links.filter((l) => !(l.type === type && l.targetId === targetId)));
    } else {
      onUpdate([...links, { type, targetId }]);
    }
  };

  // Filter out the category this item belongs to
  const otherCategories = allCategories.filter((cat) => !cat.items.some((i) => i.id === item.id));

  return (
    <div className="ml-2 mt-1 rounded border border-[var(--color-border)] bg-[var(--color-field)] p-2">
      <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
        Linked to
      </div>
      {otherCategories.map((cat) => (
        <div key={cat.id} className="mb-1">
          <Checkbox
            checked={isLinked("category", cat.id)}
            onChange={() => toggle("category", cat.id)}
            className="!mb-0 text-xs font-medium"
          >
            <span>{cat.name}</span>
            <span className="ml-1 text-[var(--color-muted-foreground)]">(all)</span>
          </Checkbox>
          <div className="ml-5 flex flex-col">
            {cat.items.map((i) => (
              <Checkbox
                key={i.id}
                checked={isLinked("item", i.id)}
                onChange={() => toggle("item", i.id)}
                label={i.name}
                className="!mb-0 text-xs"
              />
            ))}
          </div>
        </div>
      ))}
      {otherCategories.length === 0 && (
        <div className="text-xs text-[var(--color-muted-foreground)]">No other categories to link to</div>
      )}
    </div>
  );
}

function CategoryEditor({
  category,
  allCategories,
  onUpdate,
  onRemove,
}: {
  category: InventoryCategory;
  allCategories: InventoryCategory[];
  onUpdate: (updated: InventoryCategory) => void;
  onRemove: () => void;
}) {
  const [newItemName, setNewItemName] = useState("");
  const [expandedLinks, setExpandedLinks] = useState<string | null>(null);

  const addItem = () => {
    const name = newItemName.trim();
    if (!name) return;
    onUpdate({ ...category, items: [...category.items, { id: generateId(), name, count: 0 }] });
    setNewItemName("");
  };

  const updateItemLinks = (itemId: string, links: CorrelationLink[]) => {
    onUpdate({
      ...category,
      items: category.items.map((i) =>
        i.id === itemId ? { ...i, linkedTo: links.length > 0 ? links : undefined } : i,
      ),
    });
  };

  return (
    <div className="rounded border border-[var(--color-border)] p-2">
      <div className="mb-2 flex items-center gap-2">
        <IconPicker value={category.icon} onChange={(icon) => onUpdate({ ...category, icon })} />
        <InputGroup
          className="flex-1"
          value={category.name}
          onChange={(e) => onUpdate({ ...category, name: e.target.value })}
        />
        <Button
          icon="cross"
          minimal
          size="small"
          className="text-[var(--color-muted-foreground)] hover:text-[var(--color-danger)]"
          onClick={onRemove}
        />
      </div>
      <div className="flex flex-col gap-1">
        {category.items.map((item) => (
          <div key={item.id}>
            <div className="flex items-center gap-1">
              <InputGroup
                className="flex-1"
                value={item.name}
                onChange={(e) =>
                  onUpdate({
                    ...category,
                    items: category.items.map((i) => (i.id === item.id ? { ...i, name: e.target.value } : i)),
                  })
                }
              />
              <InputGroup
                className="w-14"
                type="number"
                value={String(item.count)}
                onChange={(e) =>
                  onUpdate({
                    ...category,
                    items: category.items.map((i) =>
                      i.id === item.id ? { ...i, count: Math.max(0, Number(e.target.value) || 0) } : i,
                    ),
                  })
                }
              />
              <Button
                minimal
                size="small"
                className="text-[10px] text-[var(--color-muted-foreground)]"
                onClick={() => setExpandedLinks(expandedLinks === item.id ? null : item.id)}
              >
                Links{item.linkedTo?.length ? ` (${item.linkedTo.length})` : ""}
                <span className="ml-0.5">{expandedLinks === item.id ? "\u25B2" : "\u25BC"}</span>
              </Button>
              <Button
                icon="cross"
                minimal
                size="small"
                className="text-[var(--color-muted-foreground)] hover:text-[var(--color-danger)]"
                onClick={() =>
                  onUpdate({ ...category, items: category.items.filter((i) => i.id !== item.id) })
                }
              />
            </div>
            {expandedLinks === item.id && (
              <InlineLinkEditor
                item={item}
                allCategories={allCategories}
                onUpdate={(links) => updateItemLinks(item.id, links)}
              />
            )}
          </div>
        ))}
        <div className="mt-1 flex gap-2">
          <InputGroup
            className="flex-1"
            placeholder="New item..."
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addItem();
            }}
          />
          <Button icon="plus" onClick={addItem} aria-label="Add item" />
        </div>
      </div>
    </div>
  );
}

function InventoryConfigPanel({ config, onChange }: ConfigPanelProps) {
  const categories = getCategories(config);
  const logChanges = getLogChanges(config);

  const updateCategories = (cats: InventoryCategory[]) => {
    onChange({ ...config, categories: cats });
  };

  return (
    <div className="flex flex-col gap-3">
      <FormGroup label="Logging">
        <Checkbox
          checked={logChanges}
          onChange={() => onChange({ ...config, logChanges: !logChanges })}
          label="Enable inventory change logging"
        />
      </FormGroup>
      <div className="flex flex-col gap-2">
        {categories.map((cat) => (
          <CategoryEditor
            key={cat.id}
            category={cat}
            allCategories={categories}
            onUpdate={(updated) => updateCategories(categories.map((c) => (c.id === cat.id ? updated : c)))}
            onRemove={() => updateCategories(categories.filter((c) => c.id !== cat.id))}
          />
        ))}
      </div>
      <Button
        icon="plus"
        text="Add category"
        onClick={() =>
          updateCategories([
            ...categories,
            { id: generateId(), name: "New Category", icon: "inventory", items: [] },
          ])
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Descriptor
// ---------------------------------------------------------------------------

export const inventoryDescriptor: WidgetDescriptor = {
  type: "inventory",
  name: "Inventory",
  description: "Track items by category with optional batch change logging",
  icon: <MdInventory2 className="text-lg" />,
  defaultSize: { w: 5, h: 5, minW: 3, minH: 3 },
  defaultConfig: { categories: DEFAULT_CATEGORIES, logChanges: false },
  component: InventoryWidget,
  configPanel: InventoryConfigPanel,
  needsScroll: true,
};
